/**
 * Protocol layer — routes WebSocket messages to/from the event bus.
 * This is the single point of contact between comm and the rest of the app.
 */

import type { PatynaConfig } from '@/types/config.ts';
import type { ClientMessage } from '@/types/messages.ts';
import { eventBus } from '@/core/event-bus.ts';
import { WebSocketClient, type FrameHandler } from './websocket-client.ts';
import {
  decodeBinaryFrame,
  decodeTextMessage,
  encodeAudioFrame,
  encodeTextMessage,
} from './message-codec.ts';

export class CommManager {
  private client: WebSocketClient;

  constructor(config: PatynaConfig) {
    const handler: FrameHandler = {
      onOpen: () => this.onOpen(),
      onClose: (_code, _reason) => this.onClose(),
      onText: (data) => this.onText(data),
      onBinary: (data) => this.onBinary(data),
    };

    this.client = new WebSocketClient(
      {
        url: config.websocket.url,
        reconnectDelay: config.websocket.reconnectDelay,
        maxReconnectDelay: config.websocket.maxReconnectDelay,
      },
      handler,
    );
  }

  get connected(): boolean {
    return this.client.connected;
  }

  /** Start the WebSocket connection. */
  connect(): void {
    this.client.connect();
  }

  /** Gracefully close and stop reconnecting. */
  disconnect(): void {
    this.client.disconnect();
  }

  /** Send a client message (text input, transcript, config). */
  send(msg: ClientMessage): void {
    if (msg.type === 'audio_chunk') {
      this.client.sendBinary(encodeAudioFrame(msg.data, msg.format));
    } else {
      this.client.sendText(encodeTextMessage(msg));
    }
  }

  /** Send raw audio PCM data (convenience for voice pipeline). */
  sendAudio(pcmData: ArrayBuffer, format: 'pcm_16k' | 'pcm_24k' = 'pcm_24k'): void {
    this.client.sendBinary(encodeAudioFrame(pcmData, format));
  }

  // --- Internal handlers ---

  private onOpen(): void {
    console.log('[Comm] Connected');
    eventBus.emit('comm:connected');
  }

  private onClose(): void {
    console.log('[Comm] Disconnected');
    eventBus.emit('comm:disconnected');
  }

  private onText(raw: string): void {
    const msg = decodeTextMessage(raw);
    if (!msg) return;

    switch (msg.type) {
      case 'text_delta':
        eventBus.emit('comm:textDelta', { text: msg.text });
        break;
      case 'text_done':
        eventBus.emit('comm:textDone', { text: msg.text });
        break;
      case 'status':
        eventBus.emit('comm:status', { state: msg.state });
        break;
      case 'error':
        eventBus.emit('comm:error', { code: msg.code, message: msg.message });
        break;
      default:
        console.warn('[Comm] Unhandled text message type:', (msg as { type: string }).type);
    }
  }

  private onBinary(data: ArrayBuffer): void {
    const msg = decodeBinaryFrame(data);
    if (!msg) return;

    if (msg.type === 'audio_chunk') {
      // Convert 16-bit PCM to Float32 for the audio pipeline
      const pcm16 = new Int16Array(msg.data);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }
      eventBus.emit('audio:chunkReceived', { data: float32 });
    }
  }
}
