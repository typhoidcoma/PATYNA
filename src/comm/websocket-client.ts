/**
 * Low-level WebSocket wrapper with auto-reconnect + exponential backoff.
 * Handles binary (ArrayBuffer) and text (string) frames.
 */

export interface WebSocketClientOptions {
  url: string;
  reconnectDelay: number;      // Initial delay in ms
  maxReconnectDelay: number;   // Cap for exponential backoff
}

export type FrameHandler = {
  onText: (data: string) => void;
  onBinary: (data: ArrayBuffer) => void;
  onOpen: () => void;
  onClose: (code: number, reason: string) => void;
};

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private opts: WebSocketClientOptions;
  private handler: FrameHandler;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentDelay: number;
  private intentionalClose = false;
  private _connected = false;

  constructor(opts: WebSocketClientOptions, handler: FrameHandler) {
    this.opts = opts;
    this.handler = handler;
    this.currentDelay = opts.reconnectDelay;
  }

  get connected(): boolean {
    return this._connected;
  }

  /** Open the connection. Safe to call multiple times. */
  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.intentionalClose = false;
    this.createSocket();
  }

  /** Gracefully close. No reconnect will be attempted. */
  disconnect(): void {
    this.intentionalClose = true;
    this.clearReconnect();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this._connected = false;
  }

  /** Send a text frame (JSON string). */
  sendText(data: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Cannot send text — not connected');
      return;
    }
    this.ws.send(data);
  }

  /** Send a binary frame (audio chunk). */
  sendBinary(data: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Cannot send binary — not connected');
      return;
    }
    this.ws.send(data);
  }

  private createSocket(): void {
    try {
      this.ws = new WebSocket(this.opts.url);
      this.ws.binaryType = 'arraybuffer';
    } catch (err) {
      console.error('[WS] Failed to create socket:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[WS] Connected to', this.opts.url);
      this._connected = true;
      this.currentDelay = this.opts.reconnectDelay; // Reset backoff
      this.handler.onOpen();
    };

    this.ws.onclose = (ev) => {
      console.log(`[WS] Closed (${ev.code}): ${ev.reason || 'no reason'}`);
      this._connected = false;
      this.handler.onClose(ev.code, ev.reason);

      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (ev) => {
      // onerror is always followed by onclose, so just log
      console.error('[WS] Error:', ev);
    };

    this.ws.onmessage = (ev) => {
      if (ev.data instanceof ArrayBuffer) {
        this.handler.onBinary(ev.data);
      } else if (typeof ev.data === 'string') {
        this.handler.onText(ev.data);
      }
    };
  }

  private scheduleReconnect(): void {
    this.clearReconnect();

    console.log(`[WS] Reconnecting in ${this.currentDelay}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.createSocket();
    }, this.currentDelay);

    // Exponential backoff with jitter
    this.currentDelay = Math.min(
      this.currentDelay * 2 + Math.random() * 500,
      this.opts.maxReconnectDelay,
    );
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
