import { Router } from 'express';
import { db } from '../db';
import { asyncHandler } from '../asyncHandler';
const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').toUpperCase();
  if (!q) {
    const r = await db.query('SELECT symbol, name FROM symbols ORDER BY symbol LIMIT 100');
    return res.json(r.rows);
  }
  const r = await db.query(
    `SELECT symbol, name FROM symbols
     WHERE symbol LIKE $1 OR name ILIKE $2
     ORDER BY symbol LIMIT 50`,
    [q + '%', '%' + q + '%']
  );
  res.json(r.rows);
}));

export default router;
