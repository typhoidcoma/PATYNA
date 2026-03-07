import * as THREE from 'three';
import { SceneManager } from '@/scene/scene-manager.ts';
import { Avatar } from '@/scene/avatar.ts';
import { AvatarController } from '@/scene/avatar-controller.ts';
import { updateEnvironment } from '@/scene/environment.ts';
import { StateMachine } from '@/core/state-machine.ts';
import { eventBus } from '@/core/event-bus.ts';
import { CommManager } from '@/comm/protocol.ts';
import { AudioManager } from '@/audio/audio-manager.ts';
import { TTSPlayer } from '@/audio/tts-player.ts';
import { VoiceManager } from '@/voice/voice-manager.ts';
import { Webcam } from '@/tracking/webcam.ts';
import { FaceTracker } from '@/tracking/face-tracker.ts';
import { HUD } from '@/ui/hud.ts';
import { DEFAULT_CONFIG, type PatynaConfig } from '@/types/config.ts';

export class App {
  private sceneManager: SceneManager;
  private avatar: Avatar;
  private avatarController: AvatarController;
  readonly stateMachine: StateMachine;
  private comm: CommManager;
  private audioManager: AudioManager;
  private ttsPlayer: TTSPlayer;
  private voiceManager: VoiceManager;
  private webcam: Webcam;
  private faceTracker: FaceTracker;
  private hud: HUD;
  private envMesh: THREE.Mesh | null = null;

  constructor(
    container: HTMLElement,
    config: PatynaConfig = DEFAULT_CONFIG,
  ) {
    // State machine
    this.stateMachine = new StateMachine();

    // Communication (Aelora backend)
    this.comm = new CommManager(config);

    // Audio (kept for future TTS integration)
    this.audioManager = new AudioManager(config);
    this.ttsPlayer = new TTSPlayer(this.audioManager);
    this.voiceManager = new VoiceManager();
    this.webcam = new Webcam();
    this.faceTracker = new FaceTracker(this.webcam);

    // ── Layout: scene wrapper (flex:1) + panel below ──
    const sceneWrap = document.createElement('div');
    sceneWrap.className = 'scene-wrap';
    container.appendChild(sceneWrap);

    // 3D Scene — renders into the scene wrapper so it never overlaps the panel
    this.sceneManager = new SceneManager(sceneWrap, config);

    // Find the environment mesh (contour plane has uTime uniform)
    this.sceneManager.scene.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.ShaderMaterial &&
        child.material.uniforms?.uTime
      ) {
        this.envMesh = child;
      }
    });

    // Avatar
    this.avatar = new Avatar();
    this.sceneManager.scene.add(this.avatar.group);

    // Avatar gaze controller
    this.avatarController = new AvatarController(this.avatar, config);

    // HUD — overlay goes into sceneWrap, panel goes into container
    this.hud = new HUD(sceneWrap, container);

    // Register frame updates
    this.sceneManager.onFrame((delta, elapsed) => {
      this.avatar.update(delta, elapsed);
      this.avatarController.update(delta);
      if (this.envMesh) {
        updateEnvironment(this.envMesh, elapsed);
      }
    });

    // Wire events
    this.setupListeners();

    // Wait for user interaction to unlock audio/permissions
    this.hud.ready.then(() => this.onReady());
  }

  private setupListeners(): void {
    // ── Connection lifecycle ──

    eventBus.on('comm:ready', ({ sessionId }) => {
      console.log(`[Patyna] Session bound: ${sessionId}`);
    });

    eventBus.on('comm:disconnected', () => {
      this.stateMachine.reset();
    });

    eventBus.on('comm:error', ({ code, message }) => {
      console.error(`[Patyna] Server error (${code}): ${message}`);
      this.stateMachine.reset();
    });

    // ── LLM response flow (text streaming) ──

    // First streaming token → transition to speaking (avatar animates while text streams)
    eventBus.on('comm:textDelta', () => {
      if (this.stateMachine.state === 'thinking') {
        this.stateMachine.transition('speaking');
      }
    });

    // Full response done → back to idle
    eventBus.on('comm:textDone', () => {
      if (this.stateMachine.state === 'speaking') {
        this.stateMachine.transition('idle');
      }
    });

    // ── Audio playback (future TTS) ──

    eventBus.on('audio:playbackEnd', () => {
      if (this.stateMachine.state === 'speaking') {
        this.stateMachine.transition('idle');
      }
    });

    // ── Voice input ──

    // User starts speaking → flush any TTS + go to listening
    eventBus.on('voice:speechStart', () => {
      this.ttsPlayer.flush();
      if (this.stateMachine.state === 'idle') {
        this.stateMachine.transition('listening');
      }
    });

    // Final transcript → send to Aelora + transition to thinking
    eventBus.on('voice:transcript', ({ text, isFinal }) => {
      if (isFinal && this.comm.connected) {
        this.comm.sendMessage(text);

        // Transition to thinking (handle both voice and text input paths)
        const s = this.stateMachine.state;
        if (s === 'idle') {
          // Text input path: idle -> listening -> thinking
          this.stateMachine.transition('listening');
          this.stateMachine.transition('thinking');
        } else if (s === 'listening') {
          this.stateMachine.transition('thinking');
        }
      }
    });

    // ── Mood events ──

    eventBus.on('comm:mood', (mood) => {
      console.log(`[Patyna] Mood: ${mood.label} (${mood.emotion}/${mood.intensity})`);
    });
  }

  private async onReady(): Promise<void> {
    console.log('[Patyna] Session started');

    // Initialize audio (must happen after user gesture)
    await this.ttsPlayer.init();

    // ── Single getUserMedia for both mic + camera ──
    // One permission prompt instead of two, more reliable across browsers
    let audioStream: MediaStream | undefined;
    let videoStream: MediaStream | undefined;

    try {
      const combined = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });

      // Split into audio-only and video-only streams
      const audioTracks = combined.getAudioTracks();
      const videoTracks = combined.getVideoTracks();

      if (audioTracks.length > 0) {
        audioStream = new MediaStream(audioTracks);
        console.log('[Patyna] Mic access granted');
      }
      if (videoTracks.length > 0) {
        videoStream = new MediaStream(videoTracks);
        console.log('[Patyna] Camera access granted');
      }
    } catch (err) {
      console.warn('[Patyna] Media access denied or unavailable:', err);

      // Try audio-only fallback (camera might be blocked but mic allowed)
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream = audioOnly;
        console.log('[Patyna] Mic access granted (camera denied)');
      } catch {
        console.warn('[Patyna] Mic also unavailable — text input only');
      }
    }

    // Emit media status so HUD can show indicators
    eventBus.emit('media:status', {
      mic: !!audioStream,
      camera: !!videoStream,
    });

    // Initialize voice input (VAD + STT)
    await this.voiceManager.init(audioStream);

    // Initialize face tracking with shared video stream
    if (videoStream) {
      try {
        const camOk = await this.webcam.startWithStream(videoStream);
        if (camOk) {
          await this.faceTracker.init();
          this.faceTracker.start();
        }
      } catch (err) {
        console.warn('[Patyna] Face tracking unavailable:', err);
      }
    }

    // Connect to Aelora backend
    this.comm.connect();
  }

  /** Tear down all resources. */
  async destroy(): Promise<void> {
    this.faceTracker.destroy();
    this.webcam.destroy();
    await this.voiceManager.destroy();
    this.ttsPlayer.destroy();
    this.audioManager.close();
    this.comm.disconnect();
    this.hud.destroy();
    console.log('[Patyna] Destroyed');
  }
}
