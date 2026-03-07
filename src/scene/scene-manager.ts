import * as THREE from 'three';
import type { PatynaConfig } from '@/types/config.ts';
import { createEnvironment, updateEnvironment } from './environment.ts';

export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;

  private clock = new THREE.Clock();
  private frameCallbacks: Array<(delta: number, elapsed: number) => void> = [];
  private envMesh: THREE.Mesh | null = null;

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
    this.scene.background = new THREE.Color('#191B20');

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 100);
    this.camera.position.set(0, 0.10, 2.8);
    this.camera.lookAt(0, 0.06, 0);

    // Lighting
    this.setupLighting();

    // Environment (contour background + sparkles)
    this.envMesh = createEnvironment(this.scene);

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
    // Warm ambient — creates pleasing warm/cool contrast with teal character
    const ambient = new THREE.AmbientLight(0xFFF0E8, 0.5);
    this.scene.add(ambient);

    // Key light — clean white, from upper front-right
    const key = new THREE.DirectionalLight(0xFFF5EE, 1.0);
    key.position.set(1.5, 2.5, 3);
    this.scene.add(key);

    // Fill light — soft mint tint, from left
    const fill = new THREE.DirectionalLight(0xD0FFE8, 0.4);
    fill.position.set(-2, 1, 1.5);
    this.scene.add(fill);

    // Top light — cool mint glow from above (highlights wings/antennae)
    const top = new THREE.DirectionalLight(0xE0FFF0, 0.3);
    top.position.set(0, 4, 0.5);
    this.scene.add(top);

    // Rim light — subtle cool backlight for depth + wing glow
    const rim = new THREE.DirectionalLight(0xD0FFE8, 0.25);
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

    // Update environment shader (contour animation + sparkle twinkle)
    if (this.envMesh) updateEnvironment(this.envMesh, elapsed);

    for (const cb of this.frameCallbacks) {
      cb(delta, elapsed);
    }

    this.renderer.render(this.scene, this.camera);
  };
}
