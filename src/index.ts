import "dotenv/config";
import express from 'express';
import http from 'http';
import cors from 'cors';
import { CONFIG } from './config';
import { db } from './db';
import { redisSub } from './redis';
import symbolRoutes from './routes/symbols';
import positionRoutes from './routes/positions';
import alertRoutes from './routes/alerts';
import authRoutes from './routes/auth';
import accountRoutes from './routes/account';
import leaderboardRoutes from './routes/leaderboard';
import { createWsServer } from './ws';
import { setWsHub } from './wsHub';
import { startPriceIngest, PRICE_CHANNEL } from './prices/service';
import { startAlertEngine } from './alerts/engine';


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/symbols', symbolRoutes);
app.use('/positions', positionRoutes);
app.use('/alerts', alertRoutes);
app.use('/auth', authRoutes);
app.use('/account', accountRoutes);
app.use('/leaderboard', leaderboardRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
const wsHub = createWsServer(server);
setWsHub(wsHub);

redisSub.subscribe(PRICE_CHANNEL, err => { if (err) console.error('redis sub err', err); });
redisSub.on('message', (_ch, msg) => { const data = JSON.parse(msg); wsHub.broadcastPrice(data.symbol, data); });

startAlertEngine(wsHub);
startPriceIngest(['AAPL','MSFT','GOOG'], 750);

server.listen(CONFIG.port, async () => {
  await db.query('SELECT 1');
  console.log(`HTTP/WebSocket listening on :${CONFIG.port}`);
});
