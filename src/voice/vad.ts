/**
 * Energy-based Voice Activity Detection using the Web Audio API.
 *
 * Monitors the RMS energy of the microphone input via an AnalyserNode.
 * Detects speech start when sustained energy exceeds a threshold, and
 * speech end after sustained silence. Uses hysteresis to avoid flicker.
 *
 * This replaces the Silero/ONNX-based VAD. The ONNX approach required
 * SharedArrayBuffer (which needs COOP/COEP headers) — those headers
 * break Chrome's Web Speech API. Energy-based detection avoids the
 * conflict entirely with zero external dependencies.
 */

import { eventBus } from '@/core/event-bus.ts';

export class VAD {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private timeDomainData: Float32Array | null = null;
  private rafId = 0;
  private _active = false;
  private _paused = false;

  // Detection state
  private speaking = false;
  private speechStartTime = 0;
  private silenceStartTime = 0;

  // Tunable thresholds
  // Higher "on" threshold + lower "off" threshold = hysteresis to avoid flicker
  private readonly SPEECH_THRESHOLD = 0.012;   // RMS above this → possible speech
  private readonly SILENCE_THRESHOLD = 0.006;  // RMS below this → possible silence
  private readonly SPEECH_DEBOUNCE = 150;      // ms of sustained energy to trigger start
  private readonly SILENCE_DEBOUNCE = 900;     // ms of sustained silence to trigger end

  get active(): boolean {
    return this._active;
  }

  /**
   * Initialize the energy-based VAD.
   * @param audioStream — Pre-existing audio MediaStream from getUserMedia.
   */
  async init(audioStream?: MediaStream): Promise<void> {
    if (this.audioContext) return; // Already initialized

    if (!audioStream) {
      throw new Error('[VAD] An audio stream is required');
    }

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.3;
    this.timeDomainData = new Float32Array(this.analyser.fftSize);

    this.source = this.audioContext.createMediaStreamSource(audioStream);
    this.source.connect(this.analyser);

    // Start the monitoring loop
    this._paused = false;
    this.monitor();

    console.log('[VAD] Energy-based VAD initialized');
  }

  /**
   * Main monitoring loop — runs at display refresh rate (~60fps).
   * Computes RMS energy and applies speech/silence detection with hysteresis.
   */
  private monitor = (): void => {
    if (!this.analyser || !this.timeDomainData || this._paused) return;

    this.analyser.getFloatTimeDomainData(this.timeDomainData);

    // Compute RMS energy
    let sum = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      const sample = this.timeDomainData[i];
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / this.timeDomainData.length);

    const now = performance.now();

    if (!this.speaking) {
      // ── Not speaking: look for sustained energy above threshold ──
      if (rms > this.SPEECH_THRESHOLD) {
        if (this.speechStartTime === 0) this.speechStartTime = now;
        if (now - this.speechStartTime >= this.SPEECH_DEBOUNCE) {
          this.speaking = true;
          this._active = true;
          this.silenceStartTime = 0;
          console.log('[VAD] Speech start');
          eventBus.emit('voice:speechStart');
        }
      } else {
        this.speechStartTime = 0;
      }
    } else {
      // ── Speaking: look for sustained silence below threshold ──
      if (rms < this.SILENCE_THRESHOLD) {
        if (this.silenceStartTime === 0) this.silenceStartTime = now;
        if (now - this.silenceStartTime >= this.SILENCE_DEBOUNCE) {
          this.speaking = false;
          this._active = false;
          this.speechStartTime = 0;
          console.log('[VAD] Speech end');
          eventBus.emit('voice:speechEnd');
        }
      } else {
        this.silenceStartTime = 0;
      }
    }

    this.rafId = requestAnimationFrame(this.monitor);
  };

  /** Pause VAD (e.g., while TTS is playing to avoid echo). */
  async pause(): Promise<void> {
    this._paused = true;
    cancelAnimationFrame(this.rafId);
    if (this.speaking) {
      this.speaking = false;
      this._active = false;
      this.speechStartTime = 0;
      this.silenceStartTime = 0;
      eventBus.emit('voice:speechEnd');
    }
    console.log('[VAD] Paused');
  }

  /** Resume VAD listening. */
  async resume(): Promise<void> {
    if (this.analyser && this._paused) {
      this._paused = false;
      this.speaking = false;
      this.speechStartTime = 0;
      this.silenceStartTime = 0;
      this.monitor();
      console.log('[VAD] Resumed');
    }
  }

  /** Destroy and release resources. */
  async destroy(): Promise<void> {
    cancelAnimationFrame(this.rafId);
    this.source?.disconnect();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.timeDomainData = null;
    this._active = false;
    this.speaking = false;
    console.log('[VAD] Destroyed');
  }
}
