/**
 * WebSocket client with auto-reconnection.
 */

export type WsMessageType = "counter_update" | "ruleset_changed" | "apply_status";

export interface WsMessage {
  type: WsMessageType;
  data: unknown;
}

type WsHandler = (message: WsMessage) => void;

export class NftWebSocket {
  private ws: WebSocket | null = null;
  private handlers: Set<WsHandler> = new Set();
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private shouldReconnect = true;

  constructor(private url: string = `ws://${window.location.host}/ws/live`) {}

  connect(): void {
    this.shouldReconnect = true;
    this._connect();
  }

  private _connect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectDelay = 1000; // Reset on successful connection
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WsMessage = JSON.parse(event.data);
          this.handlers.forEach((handler) => handler(message));
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        if (this.shouldReconnect) {
          setTimeout(() => this._connect(), this.reconnectDelay);
          this.reconnectDelay = Math.min(
            this.reconnectDelay * 2,
            this.maxReconnectDelay,
          );
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      if (this.shouldReconnect) {
        setTimeout(() => this._connect(), this.reconnectDelay);
      }
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
  }

  subscribe(handler: WsHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
