import { redisSub } from '../redis';
import { db } from '../db';
import { PRICE_CHANNEL } from '../prices/service';
import type { WebSocketHub } from '../ws';

type PriceMsg = { symbol: string; price: number; ts: number };

export function startAlertEngine(wsHub: WebSocketHub) {
  redisSub.subscribe(PRICE_CHANNEL, (err) => {
    if (err) console.error('redis sub', err);
  });

  redisSub.on('message', async (_ch, msg) => {
    const { symbol, price } = JSON.parse(msg) as PriceMsg;

    const { rows } = await db.query(
      `SELECT id, session_id, alert_type, direction, target::float8 AS target,
              movement_direction, percent_threshold::float8 AS percent_threshold,
              baseline_price::float8 AS baseline_price, last_state
       FROM alerts
       WHERE symbol=$1`,
      [symbol]
    );

    for (const a of rows) {
      if (a.alert_type === 'percent_move') {
        let baselinePrice = a.baseline_price;
        if (baselinePrice == null || baselinePrice <= 0) {
          baselinePrice = price;
          await db.query('UPDATE alerts SET baseline_price=$1, last_state=$2 WHERE id=$3', [baselinePrice, 'armed', a.id]);
        }

        const pctChange = ((price - baselinePrice) / baselinePrice) * 100;
        const threshold = a.percent_threshold ?? 15;
        const direction = a.movement_direction ?? 'either';
        const thresholdMet =
          (direction === 'up' && pctChange >= threshold) ||
          (direction === 'down' && pctChange <= -threshold) ||
          (direction === 'either' && Math.abs(pctChange) >= threshold);
        const stateNow = thresholdMet ? 'triggered' : 'armed';

        if (thresholdMet && a.last_state !== 'triggered') {
          await db.query(
            'UPDATE alerts SET last_state=$1, last_triggered_at=now() WHERE id=$2',
            [stateNow, a.id]
          );
          wsHub.notifySession(a.session_id, {
            type: 'alert',
            payload: {
              id: a.id,
              symbol,
              alert_type: a.alert_type,
              movement_direction: direction,
              percent_threshold: threshold,
              baseline_price: baselinePrice,
              percent_change: pctChange,
              price
            }
          });
        } else if (a.last_state !== stateNow) {
          await db.query('UPDATE alerts SET last_state=$1 WHERE id=$2', [stateNow, a.id]);
        }

        continue;
      }

      const stateNow = price >= a.target ? 'above' : 'below';
      const shouldTrigger =
        (a.direction === 'gte' && stateNow === 'above' && a.last_state !== 'above') ||
        (a.direction === 'lte' && stateNow === 'below' && a.last_state !== 'below');

      if (shouldTrigger) {
        await db.query(
          'UPDATE alerts SET last_state=$1, last_triggered_at=now() WHERE id=$2',
          [stateNow, a.id]
        );
        wsHub.notifySession(a.session_id, {
          type: 'alert',
          payload: { id: a.id, symbol, alert_type: a.alert_type, direction: a.direction, target: a.target, price }
        });
      } else if (a.last_state !== stateNow) {
        await db.query('UPDATE alerts SET last_state=$1 WHERE id=$2', [stateNow, a.id]);
      }
    }
  });
}
