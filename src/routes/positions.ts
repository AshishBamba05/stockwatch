import { Router } from 'express';
import { db } from '../db';
import { getLivePrice } from '../market';
import { getSessionId } from '../session';
import { asyncHandler } from '../asyncHandler';
import { creditBalance, deductBalance } from '../account';
import { getWsHub } from '../wsHub';

function notifyLeaderboardChanged(sessionId: string) {
  if (sessionId.startsWith('user:')) {
    getWsHub()?.broadcastAll({ type: 'leaderboard' });
  }
}

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const r = await db.query(
    'SELECT symbol, quantity::float8 AS quantity, avg_cost::float8 AS avg_cost FROM positions WHERE session_id=$1',
    [sessionId]
  );

  const out: any[] = [];
  for (const p of r.rows) {
    const price = await getLivePrice(p.symbol);
    const pnl = price != null ? (price - p.avg_cost) * p.quantity : null;
    const pnlPct = price != null ? ((price - p.avg_cost) / p.avg_cost) * 100 : null;
    out.push({ ...p, price, pnl, pnlPct });
  }

  res.json(out);
}));

router.post('/', asyncHandler(async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const { symbol, quantity, avg_cost } = req.body ?? {};
  if (!symbol || quantity == null || avg_cost == null) {
    return res.status(400).json({ error: 'symbol, quantity, avg_cost required' });
  }

  const symbolExists = await db.query('SELECT 1 FROM symbols WHERE symbol=$1', [String(symbol).toUpperCase()]);
  if (!symbolExists.rows.length) return res.status(400).json({ error: 'Unknown symbol' });

  const r = await db.query(
    `INSERT INTO positions(session_id, symbol, quantity, avg_cost)
     VALUES($1,$2,$3,$4)
     ON CONFLICT(session_id, symbol) DO UPDATE
       SET quantity=EXCLUDED.quantity, avg_cost=EXCLUDED.avg_cost
     RETURNING symbol, quantity::float8 AS quantity, avg_cost::float8 AS avg_cost`,
    [sessionId, String(symbol).toUpperCase(), quantity, avg_cost]
  );

  res.json(r.rows[0]);
}));

router.put('/:symbol', asyncHandler(async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const symbol = String(req.params.symbol || '').toUpperCase();
  const { quantity, avg_cost } = req.body ?? {};

  if (!symbol || quantity == null || avg_cost == null) {
    return res.status(400).json({ error: 'symbol, quantity, avg_cost required' });
  }

  const r = await db.query(
    `UPDATE positions
     SET quantity=$3, avg_cost=$4
     WHERE session_id=$1 AND symbol=$2
     RETURNING symbol, quantity::float8 AS quantity, avg_cost::float8 AS avg_cost`,
    [sessionId, symbol, quantity, avg_cost]
  );

  if (!r.rows.length) return res.status(404).json({ error: 'position not found' });
  res.json(r.rows[0]);
}));

router.delete('/:symbol', asyncHandler(async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const symbol = String(req.params.symbol || '').toUpperCase();
  const r = await db.query(
    'DELETE FROM positions WHERE session_id=$1 AND symbol=$2 RETURNING symbol',
    [sessionId, symbol]
  );

  if (!r.rows.length) return res.status(404).json({ error: 'position not found' });
  res.json({ ok: true, symbol });
}));

router.post('/execute', asyncHandler(async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const symbol = String(req.body?.symbol || '').toUpperCase();
  const side = String(req.body?.side || '').toLowerCase();
  const quantity = Number(req.body?.quantity);

  if (!symbol || !['buy', 'sell'].includes(side) || !Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'symbol, side (buy|sell), quantity required' });
  }

  const executionPrice = await getLivePrice(symbol);
  if (executionPrice == null) {
    return res.status(409).json({ error: 'No live price available for symbol' });
  }

  const current = await db.query(
    'SELECT quantity::float8 AS quantity, avg_cost::float8 AS avg_cost FROM positions WHERE session_id=$1 AND symbol=$2',
    [sessionId, symbol]
  );

  const existing = current.rows[0] ?? null;
  const currentQuantity = existing?.quantity ?? 0;
  const currentAvgCost = existing?.avg_cost ?? executionPrice;

  if (side === 'buy') {
    const cost = quantity * executionPrice;
    const cashBalance = await deductBalance(sessionId, cost);
    if (cashBalance == null) {
      return res.status(409).json({ error: 'Insufficient funds' });
    }

    const nextQuantity = currentQuantity + quantity;
    const nextAvgCost = ((currentQuantity * currentAvgCost) + (quantity * executionPrice)) / nextQuantity;

    const r = await db.query(
      `INSERT INTO positions(session_id, symbol, quantity, avg_cost)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(session_id, symbol) DO UPDATE
         SET quantity=EXCLUDED.quantity, avg_cost=EXCLUDED.avg_cost
       RETURNING symbol, quantity::float8 AS quantity, avg_cost::float8 AS avg_cost`,
      [sessionId, symbol, nextQuantity, nextAvgCost]
    );

    notifyLeaderboardChanged(sessionId);
    return res.json({
      type: 'trade_execution',
      side,
      symbol,
      executed_quantity: quantity,
      execution_price: executionPrice,
      cash_balance: cashBalance,
      position: r.rows[0]
    });
  }

  if (!existing || currentQuantity < quantity) {
    return res.status(409).json({ error: 'Insufficient quantity to sell' });
  }

  const nextQuantity = currentQuantity - quantity;
  const realizedPnl = (executionPrice - currentAvgCost) * quantity;
  const cashBalance = await creditBalance(sessionId, quantity * executionPrice);

  if (nextQuantity === 0) {
    await db.query('DELETE FROM positions WHERE session_id=$1 AND symbol=$2', [sessionId, symbol]);
    notifyLeaderboardChanged(sessionId);
    return res.json({
      type: 'trade_execution',
      side,
      symbol,
      executed_quantity: quantity,
      execution_price: executionPrice,
      realized_pnl: realizedPnl,
      cash_balance: cashBalance,
      position: null
    });
  }

  const r = await db.query(
    `UPDATE positions
     SET quantity=$3
     WHERE session_id=$1 AND symbol=$2
     RETURNING symbol, quantity::float8 AS quantity, avg_cost::float8 AS avg_cost`,
    [sessionId, symbol, nextQuantity]
  );

  notifyLeaderboardChanged(sessionId);
  res.json({
    type: 'trade_execution',
    side,
    symbol,
    executed_quantity: quantity,
    execution_price: executionPrice,
    realized_pnl: realizedPnl,
    cash_balance: cashBalance,
    position: r.rows[0]
  });
}));

export default router;
