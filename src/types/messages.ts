/** Client -> Server messages */
export type ClientMessage =
  | { type: 'audio_chunk'; data: ArrayBuffer; format: 'pcm_16k' | 'pcm_24k' }
  | { type: 'text_input'; text: string }
  | { type: 'transcript'; text: string; isFinal: boolean }
  | { type: 'config'; settings: Record<string, unknown> };

/** Server -> Client messages */
export type ServerMessage =
  | { type: 'audio_chunk'; data: ArrayBuffer; format: 'pcm_16k' | 'pcm_24k' }
  | { type: 'text_delta'; text: string }
  | { type: 'text_done'; text: string }
  | { type: 'status'; state: 'thinking' | 'speaking' | 'idle' }
  | { type: 'error'; code: string; message: string };
