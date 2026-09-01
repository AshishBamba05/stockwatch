import { Router } from 'express';
import { getBalance } from '../account';
import { getSessionId } from '../session';
import { asyncHandler } from '../asyncHandler';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: 'Missing X-Session-Id' });

  const cashBalance = await getBalance(sessionId);
  res.json({ cashBalance });
}));

export default router;
