import { Router } from 'express';
import { db } from '../db';
import { getLivePrice } from '../market';
import { getSessionId } from '../session';

const router = Router();

router.get('/', async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const r = await db.query(
    `SELECT id, symbol, alert_type, direction,
            target::float8 AS target,
            movement_direction,
            percent_threshold::float8 AS percent_threshold,
            baseline_price::float8 AS baseline_price,
            last_state,
            last_triggered_at
     FROM alerts
     WHERE session_id=$1
     ORDER BY id DESC`,
    [sessionId]
  );

  res.json(r.rows);
});

router.post('/', async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const symbol = String(req.body?.symbol || '').toUpperCase();
  const alertType = String(req.body?.alert_type || 'percent_move');

  if (!symbol) {
    return res.status(400).json({ error: 'symbol required' });
  }

  if (alertType === 'price_threshold') {
    const direction = String(req.body?.direction || '');
    const target = Number(req.body?.target);

    if (!['gte', 'lte'].includes(direction) || !Number.isFinite(target)) {
      return res.status(400).json({ error: 'direction (gte|lte) and target required' });
    }

    const r = await db.query(
      `INSERT INTO alerts(session_id, symbol, alert_type, direction, target)
       VALUES($1,$2,$3,$4,$5)
       RETURNING id, symbol, alert_type, direction, target::float8 AS target, movement_direction,
                 percent_threshold::float8 AS percent_threshold, baseline_price::float8 AS baseline_price,
                 last_state, last_triggered_at`,
      [sessionId, symbol, alertType, direction, target]
    );

    return res.json(r.rows[0]);
  }

  const movementDirection = String(req.body?.movement_direction || 'either');
  const percentThreshold = req.body?.percent_threshold == null ? 15 : Number(req.body.percent_threshold);

  if (!['up', 'down', 'either'].includes(movementDirection) || !Number.isFinite(percentThreshold) || percentThreshold <= 0) {
    return res.status(400).json({ error: 'movement_direction (up|down|either) and a positive percent_threshold required' });
  }

  const baselinePrice = req.body?.baseline_price == null ? await getLivePrice(symbol) : Number(req.body.baseline_price);
  if (baselinePrice != null && !Number.isFinite(baselinePrice)) {
    return res.status(400).json({ error: 'baseline_price must be numeric when provided' });
  }

  const r = await db.query(
    `INSERT INTO alerts(
       session_id, symbol, alert_type, movement_direction, percent_threshold, baseline_price, last_state
     )
     VALUES($1,$2,'percent_move',$3,$4,$5,'armed')
     RETURNING id, symbol, alert_type, direction, target::float8 AS target, movement_direction,
               percent_threshold::float8 AS percent_threshold, baseline_price::float8 AS baseline_price,
               last_state, last_triggered_at`,
    [sessionId, symbol, movementDirection, percentThreshold, baselinePrice]
  );

  res.json(r.rows[0]);
});

router.put('/:id', async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const alertId = Number(req.params.id);
  if (!Number.isFinite(alertId)) return res.status(400).json({ error: 'invalid alert id' });

  const existing = await db.query(
    `SELECT id, symbol, alert_type
     FROM alerts
     WHERE id=$1 AND session_id=$2`,
    [alertId, sessionId]
  );

  if (!existing.rows.length) return res.status(404).json({ error: 'alert not found' });

  const alertType = String(req.body?.alert_type || existing.rows[0].alert_type);
  const symbol = String(req.body?.symbol || existing.rows[0].symbol).toUpperCase();

  if (alertType === 'price_threshold') {
    const direction = String(req.body?.direction || '');
    const target = Number(req.body?.target);

    if (!['gte', 'lte'].includes(direction) || !Number.isFinite(target)) {
      return res.status(400).json({ error: 'direction (gte|lte) and target required' });
    }

    const r = await db.query(
      `UPDATE alerts
       SET symbol=$3, alert_type='price_threshold', direction=$4, target=$5,
           movement_direction=NULL, percent_threshold=NULL, baseline_price=NULL, last_state=NULL
       WHERE id=$1 AND session_id=$2
       RETURNING id, symbol, alert_type, direction, target::float8 AS target, movement_direction,
                 percent_threshold::float8 AS percent_threshold, baseline_price::float8 AS baseline_price,
                 last_state, last_triggered_at`,
      [alertId, sessionId, symbol, direction, target]
    );

    return res.json(r.rows[0]);
  }

  const movementDirection = String(req.body?.movement_direction || 'either');
  const percentThreshold = req.body?.percent_threshold == null ? 15 : Number(req.body.percent_threshold);
  const baselinePrice = req.body?.baseline_price == null ? await getLivePrice(symbol) : Number(req.body.baseline_price);

  if (!['up', 'down', 'either'].includes(movementDirection) || !Number.isFinite(percentThreshold) || percentThreshold <= 0) {
    return res.status(400).json({ error: 'movement_direction (up|down|either) and a positive percent_threshold required' });
  }
  if (baselinePrice != null && !Number.isFinite(baselinePrice)) {
    return res.status(400).json({ error: 'baseline_price must be numeric when provided' });
  }

  const r = await db.query(
    `UPDATE alerts
     SET symbol=$3, alert_type='percent_move', direction=NULL, target=NULL,
         movement_direction=$4, percent_threshold=$5, baseline_price=$6, last_state='armed'
     WHERE id=$1 AND session_id=$2
     RETURNING id, symbol, alert_type, direction, target::float8 AS target, movement_direction,
               percent_threshold::float8 AS percent_threshold, baseline_price::float8 AS baseline_price,
               last_state, last_triggered_at`,
    [alertId, sessionId, symbol, movementDirection, percentThreshold, baselinePrice]
  );

  res.json(r.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const r = await db.query('DELETE FROM alerts WHERE id=$1 AND session_id=$2 RETURNING id', [req.params.id, sessionId]);
  if (!r.rows.length) return res.status(404).json({ error: 'alert not found' });
  res.json({ ok: true, id: Number(req.params.id) });
});

export default router;
