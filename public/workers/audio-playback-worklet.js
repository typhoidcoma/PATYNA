/**
 * AudioWorklet processor for low-latency TTS playback.
 *
 * Receives Float32 PCM chunks via port.postMessage({ type: 'chunk', data: Float32Array }).
 * Maintains an internal ring buffer and pulls samples each audio frame (128 samples).
 *
 * Messages:
 *   -> { type: 'chunk', data: Float32Array }   Feed audio data
 *   -> { type: 'clear' }                        Flush buffer
 *   <- { type: 'starved' }                      Buffer underrun
 *   <- { type: 'state', playing: boolean }       Playback state change
 */

const BUFFER_CAPACITY = 24000 * 10; // 10 seconds at 24kHz
const PRE_BUFFER = 24000 * 0.15;   // 150ms pre-buffer before starting playback

class PlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(BUFFER_CAPACITY);
    this._readPos = 0;
    this._writePos = 0;
    this._available = 0;
    this._playing = false;
    this._draining = false; // true once we've started playing (disables pre-buffer gate)

    this.port.onmessage = (ev) => {
      const msg = ev.data;
      if (msg.type === 'chunk') {
        this._writeChunk(msg.data);
      } else if (msg.type === 'clear') {
        this._readPos = 0;
        this._writePos = 0;
        this._available = 0;
        this._draining = false;
        if (this._playing) {
          this._playing = false;
          this.port.postMessage({ type: 'state', playing: false });
        }
      }
    };
  }

  _writeChunk(data) {
    const toWrite = Math.min(data.length, BUFFER_CAPACITY - this._available);
    for (let i = 0; i < toWrite; i++) {
      this._buffer[this._writePos] = data[i];
      this._writePos = (this._writePos + 1) % BUFFER_CAPACITY;
    }
    this._available += toWrite;

    if (toWrite < data.length) {
      // Buffer overflow — dropped samples
      // This shouldn't happen with 10s buffer, but log it
    }
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const channel = output[0];
    const frameSamples = channel.length; // Typically 128

    // Pre-buffer gate: wait until we've accumulated enough data before
    // starting playback. This absorbs network jitter from ElevenLabs
    // streaming and prevents starvation at the start of each response.
    if (!this._draining && this._available < PRE_BUFFER) {
      for (let i = 0; i < frameSamples; i++) channel[i] = 0;
      return true;
    }

    if (this._available >= frameSamples) {
      // Read from ring buffer
      this._draining = true;
      for (let i = 0; i < frameSamples; i++) {
        channel[i] = this._buffer[this._readPos];
        this._readPos = (this._readPos + 1) % BUFFER_CAPACITY;
      }
      this._available -= frameSamples;

      if (!this._playing) {
        this._playing = true;
        this.port.postMessage({ type: 'state', playing: true });
      }
    } else if (this._available > 0) {
      // Partial read — play what we have, zero the rest
      for (let i = 0; i < this._available; i++) {
        channel[i] = this._buffer[this._readPos];
        this._readPos = (this._readPos + 1) % BUFFER_CAPACITY;
      }
      for (let i = this._available; i < frameSamples; i++) {
        channel[i] = 0;
      }
      this._available = 0;

      // Buffer fully drained — response is complete
      this._playing = false;
      this._draining = false;
      this.port.postMessage({ type: 'state', playing: false });
    } else {
      // Nothing to play — output silence
      for (let i = 0; i < frameSamples; i++) {
        channel[i] = 0;
      }
      if (this._playing) {
        this._playing = false;
        this._draining = false;
        this.port.postMessage({ type: 'state', playing: false });
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('playback-processor', PlaybackProcessor);
