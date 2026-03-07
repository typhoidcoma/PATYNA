/**
 * Message codec for the WebSocket protocol.
 *
 * Text frames carry JSON control messages.
 * Binary frames carry audio data with a minimal header:
 *   [0]    u8  — message type (1 = audio_chunk)
 *   [1]    u8  — format (1 = pcm_16k, 2 = pcm_24k)
 *   [2..n] raw PCM bytes
 */

import type { ClientMessage, ServerMessage } from '@/types/messages.ts';

// Binary header constants
const BINARY_TYPE_AUDIO = 1;
const FORMAT_PCM_16K = 1;
const FORMAT_PCM_24K = 2;

type AudioFormat = 'pcm_16k' | 'pcm_24k';

const FORMAT_TO_BYTE: Record<AudioFormat, number> = {
  pcm_16k: FORMAT_PCM_16K,
  pcm_24k: FORMAT_PCM_24K,
};

const BYTE_TO_FORMAT: Record<number, AudioFormat> = {
  [FORMAT_PCM_16K]: 'pcm_16k',
  [FORMAT_PCM_24K]: 'pcm_24k',
};

/** Encode a client audio chunk into a binary frame. */
export function encodeAudioFrame(data: ArrayBuffer, format: AudioFormat): ArrayBuffer {
  const header = new Uint8Array(2);
  header[0] = BINARY_TYPE_AUDIO;
  header[1] = FORMAT_TO_BYTE[format];

  const result = new Uint8Array(2 + data.byteLength);
  result.set(header, 0);
  result.set(new Uint8Array(data), 2);
  return result.buffer;
}

/** Decode a binary frame from the server into a ServerMessage. */
export function decodeBinaryFrame(data: ArrayBuffer): ServerMessage | null {
  if (data.byteLength < 2) {
    console.warn('[Codec] Binary frame too short:', data.byteLength);
    return null;
  }

  const view = new Uint8Array(data);
  const msgType = view[0];
  const formatByte = view[1];

  if (msgType !== BINARY_TYPE_AUDIO) {
    console.warn('[Codec] Unknown binary message type:', msgType);
    return null;
  }

  const format = BYTE_TO_FORMAT[formatByte];
  if (!format) {
    console.warn('[Codec] Unknown audio format byte:', formatByte);
    return null;
  }

  // Slice out the audio payload (skip 2-byte header)
  const audioData = data.slice(2);

  return { type: 'audio_chunk', data: audioData, format };
}

/** Encode a client JSON message into a text frame. */
export function encodeTextMessage(msg: ClientMessage): string {
  // Audio chunks go as binary, not text
  if (msg.type === 'audio_chunk') {
    throw new Error('Use encodeAudioFrame for audio_chunk messages');
  }
  return JSON.stringify(msg);
}

/** Decode a text frame from the server into a ServerMessage. */
export function decodeTextMessage(raw: string): ServerMessage | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.type !== 'string') {
      console.warn('[Codec] Invalid text message — missing type:', raw);
      return null;
    }
    return parsed as ServerMessage;
  } catch (err) {
    console.error('[Codec] Failed to parse text message:', err);
    return null;
  }
}
