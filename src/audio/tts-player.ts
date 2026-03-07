/**
 * TTS audio player — receives Float32 PCM chunks and plays them
 * through an AudioWorklet with minimal latency.
 *
 * Listens to: audio:chunkReceived (from CommManager)
 * Emits:      audio:playbackStart, audio:playbackEnd
 */

import { eventBus } from '@/core/event-bus.ts';
import { AudioManager } from './audio-manager.ts';

export class TTSPlayer {
  private audioManager: AudioManager;
  private workletNode: AudioWorkletNode | null = null;
  private initialized = false;
  private playing = false;

  constructor(audioManager: AudioManager) {
    this.audioManager = audioManager;
  }

  /** Initialize the AudioWorklet. Call after user gesture. */
  async init(): Promise<void> {
    if (this.initialized) return;

    const ctx = this.audioManager.context;
    await this.audioManager.resume();

    // Load the worklet processor
    await ctx.audioWorklet.addModule('/workers/audio-playback-worklet.js');

    // Create the worklet node
    this.workletNode = new AudioWorkletNode(ctx, 'playback-processor', {
      outputChannelCount: [1],
    });

    // Listen for state messages from worklet
    this.workletNode.port.onmessage = (ev) => {
      const msg = ev.data;
      if (msg.type === 'state') {
        if (msg.playing && !this.playing) {
          this.playing = true;
          eventBus.emit('audio:playbackStart');
        } else if (!msg.playing && this.playing) {
          this.playing = false;
          eventBus.emit('audio:playbackEnd');
        }
      } else if (msg.type === 'starved') {
        console.warn('[TTS] Buffer starved — audio may glitch');
      }
    };

    // Connect to audio output
    this.workletNode.connect(ctx.destination);

    // Listen for incoming audio chunks from the comm layer
    eventBus.on('audio:chunkReceived', ({ data }) => {
      this.feedChunk(data);
    });

    this.initialized = true;
    console.log('[TTS] Player initialized');
  }

  /** Feed a Float32 PCM chunk to the worklet. */
  feedChunk(samples: Float32Array): void {
    if (!this.workletNode) {
      console.warn('[TTS] Not initialized — dropping chunk');
      return;
    }
    this.workletNode.port.postMessage({ type: 'chunk', data: samples });
  }

  /** Flush the playback buffer (e.g., on interruption). */
  flush(): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'clear' });
    }
    if (this.playing) {
      this.playing = false;
      eventBus.emit('audio:playbackEnd');
    }
  }
}
