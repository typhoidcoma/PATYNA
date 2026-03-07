import type { AppState } from './config.ts';

export interface EventMap {
  // State changes
  'state:change': { from: AppState; to: AppState };

  // Face tracking
  'face:position': { x: number; y: number; z: number };
  'face:lost': void;

  // Voice
  'voice:speechStart': void;
  'voice:speechEnd': void;
  'voice:transcript': { text: string; isFinal: boolean };

  // Audio
  'audio:chunkReceived': { data: Float32Array };
  'audio:playbackStart': void;
  'audio:playbackEnd': void;

  // Communication
  'comm:connected': void;
  'comm:disconnected': void;
  'comm:textDelta': { text: string };
  'comm:textDone': { text: string };
  'comm:status': { state: 'thinking' | 'speaking' | 'idle' };
  'comm:error': { code: string; message: string };
}
