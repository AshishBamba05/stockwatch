import WebSocket, { WebSocketServer } from 'ws';

type ClientInfo = { ws: WebSocket; sessionId: string | null; subs: Set<string> };
export type WebSocketHub = {
  notifySession: (sessionId: string, msg: any) => void;
  broadcastPrice: (symbol: string, payload: any) => void;
};

export function createWsServer(server: any): WebSocketHub {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Set<ClientInfo>();

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', 'http://localhost');
    const sid = String(url.searchParams.get('sid') || '').trim();

    const client: ClientInfo = {
      ws,
      sessionId: sid && sid.length <= 200 ? sid : null,
      subs: new Set()
    };

    clients.add(client);

    const send = (o: any) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(o));
    };

    ws.on('message', raw => {
      try {
        const msg = JSON.parse(String(raw));

        if (msg.type === 'hello' && typeof msg.sid === 'string') {
          const s = msg.sid.trim();
          client.sessionId = s && s.length <= 200 ? s : null;
          return send({ type: client.sessionId ? 'hello_ok' : 'hello_err' });
        }

        if (msg.type === 'subscribe' && Array.isArray(msg.symbols)) {
          msg.symbols.forEach((s: string) => client.subs.add(String(s).toUpperCase()));
          return send({ type: 'subscribed', symbols: [...client.subs] });
        }

        if (msg.type === 'unsubscribe' && Array.isArray(msg.symbols)) {
          msg.symbols.forEach((s: string) => client.subs.delete(String(s).toUpperCase()));
          return send({ type: 'subscribed', symbols: [...client.subs] });
        }
      } catch {}
    });

    ws.on('close', () => clients.delete(client));
  });

  return {
    notifySession(sessionId, msg) {
      for (const c of clients) {
        if (c.sessionId === sessionId && c.ws.readyState === WebSocket.OPEN) {
          c.ws.send(JSON.stringify(msg));
        }
      }
    },
    broadcastPrice(symbol, payload) {
      const sym = symbol.toUpperCase();
      for (const c of clients) {
        if (c.subs.has(sym) && c.ws.readyState === WebSocket.OPEN) {
          c.ws.send(JSON.stringify({ type: 'price', payload }));
        }
      }
    }
  };
}
