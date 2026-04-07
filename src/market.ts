import { redis } from './redis';

export async function getLivePrice(symbol: string) {
  const raw = await redis.get(`price:${symbol}`);
  if (raw == null) return null;

  const price = Number(raw);
  return Number.isFinite(price) ? price : null;
}
