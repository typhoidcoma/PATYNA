/**
 * Web Speech API STT implementation.
 * Uses the browser's built-in SpeechRecognition for zero-dependency transcription.
 * Provides interim (partial) and final results.
 */

import type { STTProvider, STTCallback } from './stt-provider.ts';

// Browser compatibility — webkit prefix on Chrome/Edge/Safari
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export class WebSpeechSTT implements STTProvider {
  readonly name = 'WebSpeech';
  private recognition: any | null = null;
  private _listening = false;
  private callback: STTCallback | null = null;

  get listening(): boolean {
    return this._listening;
  }

  start(onResult: STTCallback): void {
    if (this._listening) return;

    if (!SpeechRecognition) {
      console.error('[STT] Web Speech API not supported in this browser');
      return;
    }

    this.callback = onResult;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      // Process all results from the current event
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (text) {
          this.callback?.({ text, isFinal: result.isFinal });
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      // 'no-speech' and 'aborted' are expected during normal operation
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('[STT] Error:', event.error);
      }
    };

    this.recognition.onend = () => {
      // Auto-restart if we're still supposed to be listening
      // (Web Speech API stops after silence or network issues)
      if (this._listening) {
        try {
          this.recognition?.start();
        } catch {
          // Already started or stopped — ignore
        }
      }
    };

    try {
      this.recognition.start();
      this._listening = true;
      console.log('[STT] WebSpeech started');
    } catch (err) {
      console.error('[STT] Failed to start:', err);
    }
  }

  stop(): void {
    this._listening = false;
    this.callback = null;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Already stopped
      }
      this.recognition = null;
    }
    console.log('[STT] WebSpeech stopped');
  }
}
