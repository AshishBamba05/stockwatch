import type { WebSocketHub } from './ws';

let hub: WebSocketHub | null = null;

export function setWsHub(h: WebSocketHub) {
  hub = h;
}

export function getWsHub() {
  return hub;
}
