import { Router } from 'express';
import { db } from '../db';
import { getLivePrice } from '../market';
import { STARTING_BALANCE } from '../account';
import { asyncHandler } from '../asyncHandler';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const usersResult = await db.query('SELECT id, email FROM users ORDER BY id');
  if (!usersResult.rows.length) return res.json([]);

  const sessionIds = usersResult.rows.map((u) => `user:${u.id}`);

  const balancesResult = await db.query(
    'SELECT session_id, cash_balance::float8 AS cash_balance FROM account_balances WHERE session_id = ANY($1)',
    [sessionIds]
  );
  const balanceBySession = new Map(balancesResult.rows.map((r) => [r.session_id, r.cash_balance as number]));

  const positionsResult = await db.query(
    'SELECT session_id, symbol, quantity::float8 AS quantity FROM positions WHERE session_id = ANY($1)',
    [sessionIds]
  );

  const symbols = [...new Set(positionsResult.rows.map((p) => p.symbol as string))];
  const priceBySymbol = new Map<string, number | null>();
  for (const symbol of symbols) {
    priceBySymbol.set(symbol, await getLivePrice(symbol));
  }

  const positionsValueBySession = new Map<string, number>();
  for (const p of positionsResult.rows) {
    const price = priceBySymbol.get(p.symbol);
    if (price == null) continue;
    const current = positionsValueBySession.get(p.session_id) ?? 0;
    positionsValueBySession.set(p.session_id, current + p.quantity * price);
  }

  const leaderboard = usersResult.rows.map((u) => {
    const sessionId = `user:${u.id}`;
    const cashBalance = balanceBySession.get(sessionId) ?? STARTING_BALANCE;
    const positionsValue = positionsValueBySession.get(sessionId) ?? 0;
    const totalValue = cashBalance + positionsValue;
    const profit = totalValue - STARTING_BALANCE;
    const profitPct = (profit / STARTING_BALANCE) * 100;

    return {
      displayName: String(u.email).split('@')[0],
      totalValue,
      profit,
      profitPct
    };
  });

  leaderboard.sort((a, b) => b.profit - a.profit);
  res.json(leaderboard);
}));

export default router;
