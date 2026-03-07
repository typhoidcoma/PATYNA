/**
 * VoiceManager — coordinates VAD and STT.
 *
 * Flow:
 *   VAD detects speech start -> start STT
 *   VAD detects speech end   -> stop STT, send final transcript
 *   STT produces interim results -> emit to event bus
 *
 * Also handles pausing VAD during TTS playback to prevent echo detection.
 */

import { eventBus } from '@/core/event-bus.ts';
import { VAD } from './vad.ts';
import { WebSpeechSTT } from './web-speech-stt.ts';
import type { STTProvider } from './stt-provider.ts';

export class VoiceManager {
  private vad: VAD;
  private stt: STTProvider;
  private _initialized = false;

  constructor() {
    this.vad = new VAD();
    this.stt = new WebSpeechSTT();
  }

  get initialized(): boolean {
    return this._initialized;
  }

  /** Initialize mic + VAD + wire events. Call after user gesture. */
  async init(): Promise<void> {
    if (this._initialized) return;

    // Initialize VAD (requests mic permission internally)
    try {
      await this.vad.init();
    } catch (err) {
      console.warn('[Voice] VAD init failed (mic may not be available):', err);
      // Continue without VAD — text input still works
    }

    // Wire VAD events to STT lifecycle
    eventBus.on('voice:speechStart', () => {
      this.onSpeechStart();
    });

    eventBus.on('voice:speechEnd', () => {
      this.onSpeechEnd();
    });

    // Pause VAD while TTS is playing to prevent echo
    eventBus.on('audio:playbackStart', () => {
      this.vad.pause();
    });

    eventBus.on('audio:playbackEnd', () => {
      this.vad.resume();
    });

    this._initialized = true;
    console.log('[Voice] Manager initialized');
  }

  private onSpeechStart(): void {
    // Start STT when VAD detects speech
    if (!this.stt.listening) {
      this.stt.start((result) => {
        eventBus.emit('voice:transcript', {
          text: result.text,
          isFinal: result.isFinal,
        });
      });
    }
  }

  private onSpeechEnd(): void {
    // Stop STT when VAD detects silence
    if (this.stt.listening) {
      this.stt.stop();
    }
  }

  /** Clean up all resources. */
  async destroy(): Promise<void> {
    this.stt.stop();
    await this.vad.destroy();
    this._initialized = false;
    console.log('[Voice] Manager destroyed');
  }
}
