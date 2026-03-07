/**
 * Voice Activity Detection wrapper around @ricky0123/vad-web (Silero).
 * Detects when the user starts/stops speaking.
 */

import { MicVAD } from '@ricky0123/vad-web';
import * as ort from 'onnxruntime-web';
import { eventBus } from '@/core/event-bus.ts';

// Point ONNX runtime to the static WASM files in /vad/
// This prevents Vite's dynamic import resolution from failing
ort.env.wasm.wasmPaths = '/vad/';

export class VAD {
  private micVAD: MicVAD | null = null;
  private _active = false;

  get active(): boolean {
    return this._active;
  }

  /** Initialize and start listening for speech. */
  async init(): Promise<void> {
    if (this.micVAD) return;

    try {
      this.micVAD = await MicVAD.new({
        model: 'v5',
        baseAssetPath: '/vad/',
        startOnLoad: true,

        onSpeechStart: () => {
          console.log('[VAD] Speech start');
          this._active = true;
          eventBus.emit('voice:speechStart');
        },

        onSpeechEnd: (audio: Float32Array) => {
          console.log('[VAD] Speech end', `${(audio.length / 16000).toFixed(1)}s`);
          this._active = false;
          eventBus.emit('voice:speechEnd');
        },

        onVADMisfire: () => {
          // Speech was too short — treat as false positive
          this._active = false;
        },
      });

      console.log('[VAD] Silero initialized');
    } catch (err) {
      console.error('[VAD] Failed to initialize:', err);
      throw err;
    }
  }

  /** Pause VAD (e.g., while TTS is playing to avoid echo). */
  async pause(): Promise<void> {
    if (this.micVAD) {
      await this.micVAD.pause();
      this._active = false;
      console.log('[VAD] Paused');
    }
  }

  /** Resume VAD listening. */
  async resume(): Promise<void> {
    if (this.micVAD) {
      await this.micVAD.start();
      console.log('[VAD] Resumed');
    }
  }

  /** Destroy and release resources. */
  async destroy(): Promise<void> {
    if (this.micVAD) {
      await this.micVAD.destroy();
      this.micVAD = null;
      this._active = false;
      console.log('[VAD] Destroyed');
    }
  }
}
