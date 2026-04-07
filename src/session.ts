import type { Request } from 'express';

export function getSessionId(req: Request) {
  const sid = String(req.header('X-Session-Id') || '').trim();
  if (!sid || sid.length > 200) return null;
  return sid;
}
