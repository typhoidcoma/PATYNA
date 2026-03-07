/**
 * Manages the AudioContext lifecycle.
 * Must be created after a user gesture (click/tap) to satisfy browser autoplay policy.
 */

import type { PatynaConfig } from '@/types/config.ts';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private config: PatynaConfig;

  constructor(config: PatynaConfig) {
    this.config = config;
  }

  /** Get the AudioContext, creating it if needed. */
  get context(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: this.config.audio.sampleRate });
      console.log(`[Audio] Context created (${this.ctx.sampleRate}Hz, ${this.ctx.state})`);
    }
    return this.ctx;
  }

  /** Resume the context if it's suspended (required after user gesture). */
  async resume(): Promise<void> {
    const ctx = this.context;
    if (ctx.state === 'suspended') {
      await ctx.resume();
      console.log('[Audio] Context resumed');
    }
  }

  /** Close the context and release resources. */
  async close(): Promise<void> {
    if (this.ctx) {
      await this.ctx.close();
      this.ctx = null;
      console.log('[Audio] Context closed');
    }
  }
}
