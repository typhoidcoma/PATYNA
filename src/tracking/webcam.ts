/**
 * Manages webcam access — provides a hidden <video> element
 * for the face tracker to consume frames from.
 * Gracefully degrades if camera is unavailable.
 */
export class Webcam {
  private video: HTMLVideoElement;
  private stream: MediaStream | null = null;
  private _ready = false;

  constructor() {
    this.video = document.createElement('video');
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('autoplay', '');
    this.video.muted = true;
    // Keep it off-screen — we only need the video feed for tracking
    this.video.style.position = 'absolute';
    this.video.style.width = '1px';
    this.video.style.height = '1px';
    this.video.style.opacity = '0';
    this.video.style.pointerEvents = 'none';
    document.body.appendChild(this.video);
  }

  get ready(): boolean {
    return this._ready;
  }

  get element(): HTMLVideoElement {
    return this.video;
  }

  async start(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      this.video.srcObject = this.stream;
      await this.video.play();
      this._ready = true;
      console.log('[Webcam] Started', `${this.video.videoWidth}x${this.video.videoHeight}`);
      return true;
    } catch (err) {
      console.warn('[Webcam] Camera not available:', err);
      this._ready = false;
      return false;
    }
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.video.srcObject = null;
    this._ready = false;
  }

  destroy(): void {
    this.stop();
    this.video.remove();
  }
}
