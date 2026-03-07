export type AppState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface PatynaConfig {
  websocket: {
    url: string;
    apiKey?: string;
    sessionId: string;
    userId?: string;
    username?: string;
    reconnectDelay: number;
    maxReconnectDelay: number;
  };
  audio: {
    sampleRate: number;
    channels: number;
    bufferSize: number;
  };
  scene: {
    antialias: boolean;
    pixelRatio: number;
  };
  tracking: {
    enabled: boolean;
    smoothingFactor: number;
    maxYaw: number;
    maxPitch: number;
  };
}

export const DEFAULT_CONFIG: PatynaConfig = {
  websocket: {
    url: 'wss://brainso101.tail0c86da.ts.net/ws',
    sessionId: 'patyna-web',
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
  },
  audio: {
    sampleRate: 24000,
    channels: 1,
    bufferSize: 4096,
  },
  scene: {
    antialias: true,
    pixelRatio: Math.min(window.devicePixelRatio, 2),
  },
  tracking: {
    enabled: true,
    smoothingFactor: 0.08,
    maxYaw: Math.PI / 6,    // 30 degrees
    maxPitch: Math.PI / 9,  // 20 degrees
  },
};
