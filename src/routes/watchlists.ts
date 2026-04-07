import { Router } from 'express';
import { db } from '../db';
import { getSessionId } from '../session';

const router = Router();

router.get('/', async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const r = await db.query(
    `SELECT w.id, w.name,
            COALESCE(json_agg(wi.symbol) FILTER (WHERE wi.symbol IS NOT NULL), '[]') AS symbols
     FROM watchlists w
     LEFT JOIN watchlist_items wi ON wi.watchlist_id = w.id
     WHERE w.session_id=$1
     GROUP BY w.id
     ORDER BY w.id DESC`,
    [sessionId]
  );

  res.json(r.rows);
});

router.post('/', async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const { name } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name required' });

  const r = await db.query(
    'INSERT INTO watchlists(session_id, name) VALUES($1,$2) RETURNING id,name',
    [sessionId, name]
  );

  res.json(r.rows[0]);
});

router.put('/:id', async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const watchlistId = Number(req.params.id);
  const { name } = req.body ?? {};

  if (!Number.isFinite(watchlistId)) return res.status(400).json({ error: 'invalid watchlist id' });
  if (!name) return res.status(400).json({ error: 'name required' });

  const r = await db.query(
    `UPDATE watchlists
     SET name=$3
     WHERE id=$1 AND session_id=$2
     RETURNING id, name`,
    [watchlistId, sessionId, name]
  );

  if (!r.rows.length) return res.status(404).json({ error: 'watchlist not found' });
  res.json(r.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const watchlistId = Number(req.params.id);
  if (!Number.isFinite(watchlistId)) return res.status(400).json({ error: 'invalid watchlist id' });

  const r = await db.query(
    'DELETE FROM watchlists WHERE id=$1 AND session_id=$2 RETURNING id',
    [watchlistId, sessionId]
  );

  if (!r.rows.length) return res.status(404).json({ error: 'watchlist not found' });
  res.json({ ok: true, id: watchlistId });
});

router.post('/:id/items', async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const watchlistId = Number(req.params.id);
  if (!Number.isFinite(watchlistId)) return res.status(400).json({ error: 'invalid watchlist id' });

  const { symbol } = req.body ?? {};
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const owned = await db.query('SELECT 1 FROM watchlists WHERE id=$1 AND session_id=$2', [watchlistId, sessionId]);
  if (!owned.rows.length) return res.status(404).json({ error: 'watchlist not found' });

  await db.query(
    'INSERT INTO watchlist_items(watchlist_id, symbol) VALUES($1,$2) ON CONFLICT DO NOTHING',
    [watchlistId, String(symbol).toUpperCase()]
  );

  res.json({ ok: true, symbol: String(symbol).toUpperCase() });
});

router.delete('/:id/items/:symbol', async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const watchlistId = Number(req.params.id);
  if (!Number.isFinite(watchlistId)) return res.status(400).json({ error: 'invalid watchlist id' });

  const owned = await db.query('SELECT 1 FROM watchlists WHERE id=$1 AND session_id=$2', [watchlistId, sessionId]);
  if (!owned.rows.length) return res.status(404).json({ error: 'watchlist not found' });

  await db.query(
    'DELETE FROM watchlist_items WHERE watchlist_id=$1 AND symbol=$2',
    [watchlistId, String(req.params.symbol).toUpperCase()]
  );

  res.json({ ok: true, symbol: String(req.params.symbol).toUpperCase() });
});

export default router;
