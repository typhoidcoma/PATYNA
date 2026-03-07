/**
 * Message codec for the Aelora WebSocket protocol.
 * All messages are JSON text frames.
 */

import type { ClientMessage, ServerMessage } from '@/types/messages.ts';

/** Encode a client message into a JSON text frame. */
export function encodeMessage(msg: ClientMessage): string {
  return JSON.stringify(msg);
}

/** Decode a text frame from the server into a ServerMessage. */
export function decodeMessage(raw: string): ServerMessage | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.type !== 'string') {
      console.warn('[Codec] Invalid message — missing type:', raw);
      return null;
    }
    return parsed as ServerMessage;
  } catch (err) {
    console.error('[Codec] Failed to parse message:', err);
    return null;
  }
}
