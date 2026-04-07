import "dotenv/config";
import express from 'express';
import http from 'http';
import cors from 'cors';
import { CONFIG } from './config';
import { db } from './db';
import { redisSub } from './redis';
import symbolRoutes from './routes/symbols';
import watchlistRoutes from './routes/watchlists';
import positionRoutes from './routes/positions';
import alertRoutes from './routes/alerts';
import { createWsServer } from './ws';
import { startPriceIngest, PRICE_CHANNEL } from './prices/service';
import { startAlertEngine } from './alerts/engine';


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/symbols', symbolRoutes);
app.use('/watchlists', watchlistRoutes);
app.use('/positions', positionRoutes);
app.use('/alerts', alertRoutes);

const server = http.createServer(app);
const wsHub = createWsServer(server);

redisSub.subscribe(PRICE_CHANNEL, err => { if (err) console.error('redis sub err', err); });
redisSub.on('message', (_ch, msg) => { const data = JSON.parse(msg); wsHub.broadcastPrice(data.symbol, data); });

startAlertEngine(wsHub);
startPriceIngest(['AAPL','MSFT','GOOG'], 750);

server.listen(CONFIG.port, async () => {
  await db.query('SELECT 1');
  console.log(`HTTP/WebSocket listening on :${CONFIG.port}`);
});
