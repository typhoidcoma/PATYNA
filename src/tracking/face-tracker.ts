/**
 * Face tracking using MediaPipe Face Landmarker.
 * Detects the user's face from webcam video and emits
 * normalised head position to the event bus for avatar gaze control.
 *
 * Landmarks used:
 *  - Nose tip (#1) for face center position
 *  - Face oval landmarks for bounding-box based normalisation
 *
 * The output is a normalised {x, y, z} where:
 *  x: -1 (far right in video = user's left) to +1 (far left = user's right)
 *  y: -1 (bottom) to +1 (top)
 *  z: rough depth estimate from face width (0 = normal, positive = closer)
 */
import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { eventBus } from '@/core/event-bus.ts';
import type { Webcam } from './webcam.ts';

// Debounce: # of consecutive "no face" frames before emitting face:lost
const LOST_THRESHOLD = 8;
// Expected face width at normal viewing distance (fraction of frame width)
const REFERENCE_FACE_WIDTH = 0.35;

export class FaceTracker {
  private landmarker: FaceLandmarker | null = null;
  private running = false;
  private rafId = 0;
  private lostFrames = 0;
  private faceVisible = false;

  constructor(private webcam: Webcam) {}

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    );

    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });

    console.log('[FaceTracker] Initialised (MediaPipe Face Landmarker)');
  }

  start(): void {
    if (this.running || !this.landmarker || !this.webcam.ready) return;
    this.running = true;
    this.lostFrames = 0;
    this.tick();
    console.log('[FaceTracker] Started');
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  destroy(): void {
    this.stop();
    this.landmarker?.close();
    this.landmarker = null;
  }

  private frameCount = 0;

  private tick = (): void => {
    if (!this.running || !this.landmarker) return;

    // Only run detection every 3rd frame to reduce GPU load
    this.frameCount++;
    if (this.frameCount % 3 === 0) {
      const video = this.webcam.element;
      if (video.readyState >= 2) {
        const result = this.landmarker.detectForVideo(video, performance.now());
        this.processResult(result);
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private processResult(result: FaceLandmarkerResult): void {
    const landmarks = result.faceLandmarks;

    if (!landmarks || landmarks.length === 0) {
      this.lostFrames++;
      if (this.faceVisible && this.lostFrames >= LOST_THRESHOLD) {
        this.faceVisible = false;
        eventBus.emit('face:lost');
      }
      return;
    }

    this.lostFrames = 0;
    this.faceVisible = true;

    // First detected face
    const face = landmarks[0];

    // Nose tip — landmark index 1 (centre of face)
    const nose = face[1];

    // Face width from outer eye corners: left-eye outer (#263) to right-eye outer (#33)
    const leftOuter = face[263];
    const rightOuter = face[33];
    const faceWidth = Math.abs(leftOuter.x - rightOuter.x);

    // Normalise nose position to -1..+1
    // MediaPipe landmarks are 0..1 where (0,0) is top-left of video
    // Mirror x so that user moving left -> avatar looks left
    const nx = -(nose.x - 0.5) * 2;
    const ny = -(nose.y - 0.5) * 2;

    // Rough depth from face width relative to expected width
    const nz = (faceWidth / REFERENCE_FACE_WIDTH) - 1;

    eventBus.emit('face:position', { x: nx, y: ny, z: nz });
  }
}
