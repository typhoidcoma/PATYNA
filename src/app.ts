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
  private hud: HUD;
  private envMesh: THREE.Mesh | null = null;

  constructor(
    container: HTMLElement,
    config: PatynaConfig = DEFAULT_CONFIG,
  ) {
    // State machine
    this.stateMachine = new StateMachine();

    // Communication
    this.comm = new CommManager(config);

    // Audio
    this.audioManager = new AudioManager(config);
    this.ttsPlayer = new TTSPlayer(this.audioManager);
    this.voiceManager = new VoiceManager();

    // 3D Scene
    this.sceneManager = new SceneManager(container, config);

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

    // HUD
    this.hud = new HUD(container);

    // Register frame updates
    this.sceneManager.onFrame((delta, elapsed) => {
      this.avatar.update(delta, elapsed);
      this.avatarController.update(delta);
      if (this.envMesh) {
        updateEnvironment(this.envMesh, elapsed);
      }
    });

    // Wire comm events -> state machine
    this.setupCommListeners();

    // Wait for user interaction to unlock audio/permissions
    this.hud.ready.then(() => this.onReady());
  }

  private setupCommListeners(): void {
    // Server status -> state machine transitions
    eventBus.on('comm:status', ({ state }) => {
      this.stateMachine.transition(state);
    });

    // Connection lost -> reset to idle
    eventBus.on('comm:disconnected', () => {
      this.stateMachine.reset();
    });

    // Server errors
    eventBus.on('comm:error', ({ code, message }) => {
      console.error(`[Patyna] Server error (${code}): ${message}`);
      this.stateMachine.reset();
    });

    // Text responses -> HUD transcript
    eventBus.on('comm:textDelta', ({ text }) => {
      eventBus.emit('voice:transcript', { text, isFinal: false });
    });
    eventBus.on('comm:textDone', ({ text }) => {
      eventBus.emit('voice:transcript', { text, isFinal: true });
    });

    // Audio playback end -> back to idle (if currently speaking)
    eventBus.on('audio:playbackEnd', () => {
      if (this.stateMachine.state === 'speaking') {
        this.stateMachine.transition('idle');
      }
    });

    // Flush TTS buffer on interruption (user starts speaking)
    eventBus.on('voice:speechStart', () => {
      this.ttsPlayer.flush();
      // Transition to listening when speech starts (from idle)
      if (this.stateMachine.state === 'idle') {
        this.stateMachine.transition('listening');
      }
    });

    // Send final transcripts to backend
    eventBus.on('voice:transcript', ({ text, isFinal }) => {
      if (isFinal && this.comm.connected) {
        this.comm.send({ type: 'transcript', text, isFinal: true });
        // Transition to thinking after sending transcript
        if (this.stateMachine.state === 'listening') {
          this.stateMachine.transition('thinking');
        }
      }
    });
  }

  private async onReady(): Promise<void> {
    console.log('[Patyna] Session started');

    // Initialize audio (must happen after user gesture)
    await this.ttsPlayer.init();

    // Initialize voice input (VAD + STT, requests mic permission)
    await this.voiceManager.init();

    // Connect to backend
    this.comm.connect();
  }
}
