import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { signSessionToken, getVerifiedSessionId } from '../session';
import { ensureBalance, getBalance } from '../account';
import { asyncHandler } from '../asyncHandler';

const router = Router();

function normalizeEmail(email: unknown) {
  return String(email || '').trim().toLowerCase();
}

router.post('/register', asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  if (!email || !email.includes('@')) return res.status(400).json({ error: 'A valid email is required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const existing = await db.query('SELECT 1 FROM users WHERE email=$1', [email]);
  if (existing.rows.length) return res.status(409).json({ error: 'An account with that email already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const r = await db.query(
    'INSERT INTO users(email, password_hash) VALUES($1,$2) RETURNING id',
    [email, passwordHash]
  );

  const sessionId = `user:${r.rows[0].id}`;
  await ensureBalance(sessionId);
  const cashBalance = await getBalance(sessionId);
  const token = signSessionToken({ sessionId, email });

  res.json({ token, sessionId, email, cashBalance });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  const r = await db.query('SELECT id, password_hash FROM users WHERE email=$1', [email]);
  const user = r.rows[0];
  const valid = user ? await bcrypt.compare(password, user.password_hash) : false;

  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const sessionId = `user:${user.id}`;
  const cashBalance = await getBalance(sessionId);
  const token = signSessionToken({ sessionId, email });

  res.json({ token, sessionId, email, cashBalance });
}));

router.patch('/email', asyncHandler(async (req, res) => {
  // Changing credentials is sensitive, so require a real verified token rather
  // than the spoofable X-Session-Id fallback guests use.
  const sessionId = getVerifiedSessionId(req);
  const match = sessionId?.match(/^user:(\d+)$/);
  if (!match) return res.status(401).json({ error: 'Log in again to change your email' });

  const userId = Number(match[1]);
  const newEmail = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  if (!newEmail || !newEmail.includes('@')) return res.status(400).json({ error: 'A valid email is required' });

  const r = await db.query('SELECT password_hash FROM users WHERE id=$1', [userId]);
  const user = r.rows[0];
  const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!valid) return res.status(401).json({ error: 'Incorrect password' });

  const existing = await db.query('SELECT 1 FROM users WHERE email=$1 AND id<>$2', [newEmail, userId]);
  if (existing.rows.length) return res.status(409).json({ error: 'An account with that email already exists' });

  await db.query('UPDATE users SET email=$1 WHERE id=$2', [newEmail, userId]);
  const token = signSessionToken({ sessionId: sessionId!, email: newEmail });

  res.json({ token, sessionId, email: newEmail });
}));

router.patch('/password', asyncHandler(async (req, res) => {
  const sessionId = getVerifiedSessionId(req);
  const match = sessionId?.match(/^user:(\d+)$/);
  if (!match) return res.status(401).json({ error: 'Log in again to change your password' });

  const userId = Number(match[1]);
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');

  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

  const r = await db.query('SELECT password_hash, email FROM users WHERE id=$1', [userId]);
  const user = r.rows[0];
  const valid = user ? await bcrypt.compare(currentPassword, user.password_hash) : false;
  if (!valid) return res.status(401).json({ error: 'Incorrect current password' });

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, userId]);
  const token = signSessionToken({ sessionId: sessionId!, email: user.email });

  res.json({ token, sessionId, email: user.email });
}));

router.delete('/account', asyncHandler(async (req, res) => {
  // Deletion is irreversible, so it requires a real verified token rather than
  // the spoofable X-Session-Id fallback guests use.
  const sessionId = getVerifiedSessionId(req);
  const match = sessionId?.match(/^user:(\d+)$/);
  if (!match) return res.status(401).json({ error: 'Log in again to delete your account' });

  const userId = Number(match[1]);
  const password = String(req.body?.password || '');

  const r = await db.query('SELECT password_hash FROM users WHERE id=$1', [userId]);
  const user = r.rows[0];
  const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!valid) return res.status(401).json({ error: 'Incorrect password' });

  await db.query('DELETE FROM positions WHERE session_id=$1', [sessionId]);
  await db.query('DELETE FROM alerts WHERE session_id=$1', [sessionId]);
  await db.query('DELETE FROM account_balances WHERE session_id=$1', [sessionId]);
  await db.query('DELETE FROM users WHERE id=$1', [userId]);

  res.json({ ok: true });
}));

export default router;
