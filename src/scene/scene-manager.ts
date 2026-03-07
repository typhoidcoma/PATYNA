import * as THREE from 'three';
import type { PatynaConfig } from '@/types/config.ts';
import { createEnvironment } from './environment.ts';

export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;

  private clock = new THREE.Clock();
  private frameCallbacks: Array<(delta: number, elapsed: number) => void> = [];

  constructor(container: HTMLElement, config: PatynaConfig) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: config.scene.antialias,
      alpha: false,
    });
    this.renderer.setPixelRatio(config.scene.pixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1A1A1F');

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 100);
    this.camera.position.set(0, 0.15, 2.0);
    this.camera.lookAt(0, 0.1, 0);

    // Lighting
    this.setupLighting();

    // Environment (contour background)
    createEnvironment(this.scene);

    // Resize handling
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Start render loop
    this.animate();
  }

  private setupLighting(): void {
    // Warm ambient for soft base illumination
    const ambient = new THREE.AmbientLight(0xFFF0E8, 0.5);
    this.scene.add(ambient);

    // Key light — warm white, from upper front-right
    const key = new THREE.DirectionalLight(0xFFF5EE, 1.0);
    key.position.set(1.5, 2.5, 3);
    this.scene.add(key);

    // Fill light — soft pink tint, from left
    const fill = new THREE.DirectionalLight(0xFFD0E0, 0.4);
    fill.position.set(-2, 1, 1.5);
    this.scene.add(fill);

    // Top light — warm glow from above (for bow highlight)
    const top = new THREE.DirectionalLight(0xFFE8B0, 0.3);
    top.position.set(0, 4, 0.5);
    this.scene.add(top);

    // Rim light — subtle warm backlight for depth
    const rim = new THREE.DirectionalLight(0xFFE0D0, 0.25);
    rim.position.set(0, 0.5, -2);
    this.scene.add(rim);
  }

  /** Register a callback to run each frame */
  onFrame(callback: (delta: number, elapsed: number) => void): void {
    this.frameCallbacks.push(callback);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    for (const cb of this.frameCallbacks) {
      cb(delta, elapsed);
    }

    this.renderer.render(this.scene, this.camera);
  };
}
