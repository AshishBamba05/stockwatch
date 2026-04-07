import 'dotenv/config';
import { getEnvOrDefault } from './env';

export const CONFIG = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'change_me',
  dbUrl: getEnvOrDefault(process.env.DATABASE_URL, 'postgres://stock:stock@localhost:5432/stocktrackr'),
  redisUrl: getEnvOrDefault(process.env.REDIS_URL, 'redis://localhost:6379')
};
