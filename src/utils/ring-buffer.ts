/**
 * Simple ring buffer for Float32 audio samples.
 * Used inside the AudioWorklet to buffer incoming chunks.
 * Not SharedArrayBuffer-based — works via message passing to avoid
 * requiring COOP/COEP headers.
 */
export class RingBuffer {
  private buffer: Float32Array;
  private readPos = 0;
  private writePos = 0;
  private available = 0;

  constructor(capacity: number) {
    this.buffer = new Float32Array(capacity);
  }

  get capacity(): number {
    return this.buffer.length;
  }

  /** Number of samples available to read. */
  get length(): number {
    return this.available;
  }

  /** Write samples into the buffer. Returns number actually written. */
  write(data: Float32Array): number {
    const toWrite = Math.min(data.length, this.buffer.length - this.available);
    if (toWrite === 0) return 0;

    for (let i = 0; i < toWrite; i++) {
      this.buffer[this.writePos] = data[i];
      this.writePos = (this.writePos + 1) % this.buffer.length;
    }
    this.available += toWrite;
    return toWrite;
  }

  /** Read samples from the buffer into output. Returns number actually read. */
  read(output: Float32Array): number {
    const toRead = Math.min(output.length, this.available);

    for (let i = 0; i < toRead; i++) {
      output[i] = this.buffer[this.readPos];
      this.readPos = (this.readPos + 1) % this.buffer.length;
    }
    this.available -= toRead;

    // Zero-fill remainder if not enough samples
    for (let i = toRead; i < output.length; i++) {
      output[i] = 0;
    }
    return toRead;
  }

  /** Discard all buffered data. */
  clear(): void {
    this.readPos = 0;
    this.writePos = 0;
    this.available = 0;
  }
}
