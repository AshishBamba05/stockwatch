import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from './config';

type SessionTokenPayload = { sessionId: string; email: string };

export function signSessionToken(payload: SessionTokenPayload) {
  return jwt.sign(payload, CONFIG.jwtSecret, { expiresIn: '30d' });
}

export function getVerifiedSessionId(req: Request) {
  const header = String(req.header('Authorization') || '');
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  try {
    const payload = jwt.verify(token, CONFIG.jwtSecret) as SessionTokenPayload;
    return payload.sessionId || null;
  } catch {
    return null;
  }
}

export function getSessionId(req: Request) {
  const verified = getVerifiedSessionId(req);
  if (verified) return verified;

  const sid = String(req.header('X-Session-Id') || '').trim();
  if (!sid || sid.length > 200) return null;
  return sid;
}
