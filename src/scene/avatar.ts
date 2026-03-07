import * as THREE from 'three';
import { eventBus } from '@/core/event-bus.ts';
import type { AppState } from '@/types/config.ts';

/**
 * Kawaii blob avatar — based on character reference sheet.
 * Round bubblegum-pink body, big expressive eyes, yellow bow, stubby nub limbs.
 * Reacts visually to app state changes (listening/thinking/speaking).
 */
export class Avatar {
  readonly group: THREE.Group;
  readonly headGroup: THREE.Group;

  private bowGroup: THREE.Group;
  private rightArm: THREE.Mesh;
  private mouth: THREE.Mesh;
  private bodyMesh!: THREE.Mesh;
  private bodyMat!: THREE.MeshPhysicalMaterial;

  // State-driven animation
  private currentState: AppState = 'idle';
  private stateBlend = 0; // 0..1 blend into current state visuals
  private baseEmissiveIntensity = 0.15;

  constructor() {
    this.group = new THREE.Group();
    this.headGroup = new THREE.Group();
    this.bowGroup = new THREE.Group();

    // Primary body material — vivid bubblegum pink, glossy
    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: '#F48CB0',
      roughness: 0.2,
      metalness: 0.0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.08,
      sheen: 1.0,
      sheenRoughness: 0.2,
      sheenColor: new THREE.Color('#FFDCE8'),
      emissive: '#F48CB0',
      emissiveIntensity: this.baseEmissiveIntensity,
    });

    this.buildBody(this.bodyMat);
    this.buildEyes();
    this.mouth = this.buildMouth();
    this.buildBlush();
    this.buildBow();
    this.buildArm(this.bodyMat, -1);
    this.rightArm = this.buildArm(this.bodyMat, 1);
    this.buildFeet(this.bodyMat);
    this.buildSpecularHighlights();

    this.group.add(this.headGroup);

    // Listen for state changes
    eventBus.on('state:change', ({ to }) => {
      this.currentState = to;
      this.stateBlend = 0;
    });
  }

  private buildBody(mat: THREE.Material): void {
    this.bodyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 64, 48),
      mat,
    );
    this.bodyMesh.scale.set(1.0, 0.96, 0.92);
    this.bodyMesh.position.y = 0.08;
    this.headGroup.add(this.bodyMesh);
  }

  private buildEyes(): void {
    const eyeOffsetX = 0.14;
    const eyeY = 0.08;
    const eyeZ = 0.40;

    for (const side of [-1, 1]) {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * eyeOffsetX, eyeY, eyeZ);

      const scleraMat = new THREE.MeshPhysicalMaterial({
        color: '#FFFFFF',
        roughness: 0.08,
        metalness: 0.0,
        clearcoat: 0.9,
      });
      const sclera = new THREE.Mesh(
        new THREE.SphereGeometry(0.10, 32, 24),
        scleraMat,
      );
      sclera.scale.set(0.85, 1.0, 0.55);
      eyeGroup.add(sclera);

      const irisMat = new THREE.MeshStandardMaterial({
        color: '#3D2212',
        roughness: 0.12,
        metalness: 0.05,
      });
      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.097, 32, 24),
        irisMat,
      );
      iris.scale.set(0.85, 1.0, 0.55);
      iris.position.set(0, -0.012, 0.005);
      eyeGroup.add(iris);

      const pupilMat = new THREE.MeshStandardMaterial({
        color: '#080808',
        roughness: 0.05,
      });
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 12),
        pupilMat,
      );
      pupil.scale.set(0.85, 1.0, 0.55);
      pupil.position.set(0, -0.012, 0.016);
      eyeGroup.add(pupil);

      const hlMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
      const hl1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 12, 8),
        hlMat,
      );
      hl1.position.set(side * 0.015, 0.03, 0.05);
      eyeGroup.add(hl1);

      const hl2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.013, 8, 6),
        hlMat,
      );
      hl2.position.set(side * -0.015, -0.025, 0.05);
      eyeGroup.add(hl2);

      const lashMat = new THREE.MeshBasicMaterial({ color: '#1A0E08' });
      for (let i = 0; i < 3; i++) {
        const lash = new THREE.Mesh(
          new THREE.CylinderGeometry(0.003, 0.001, 0.035, 6),
          lashMat,
        );
        const baseAngle = side * 0.5;
        const spread = baseAngle + (i - 1) * side * 0.25;
        lash.position.set(
          side * 0.05 + Math.sin(spread) * 0.018,
          0.07 + i * 0.014,
          0.03,
        );
        lash.rotation.z = spread;
        lash.rotation.x = -0.25;
        eyeGroup.add(lash);
      }

      this.headGroup.add(eyeGroup);
    }
  }

  private buildMouth(): THREE.Mesh {
    const mouthMat = new THREE.MeshBasicMaterial({ color: '#9B4860' });
    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.03, 0.005, 8, 16, Math.PI),
      mouthMat,
    );
    mouth.position.set(0, -0.02, 0.41);
    mouth.rotation.z = Math.PI;
    this.headGroup.add(mouth);
    return mouth;
  }

  private buildBlush(): void {
    const blushMat = new THREE.MeshBasicMaterial({
      color: '#FF7BA5',
      transparent: true,
      opacity: 0.3,
    });

    for (const side of [-1, 1]) {
      const blush = new THREE.Mesh(
        new THREE.CircleGeometry(0.045, 24),
        blushMat,
      );
      blush.scale.set(1.3, 0.75, 1);
      blush.position.set(side * 0.25, 0.03, 0.35);
      blush.lookAt(
        blush.position.clone().add(new THREE.Vector3(side * 0.5, -0.1, 1)),
      );
      this.headGroup.add(blush);
    }
  }

  private buildBow(): void {
    const bowMat = new THREE.MeshPhysicalMaterial({
      color: '#FFBF30',
      roughness: 0.22,
      metalness: 0.0,
      clearcoat: 0.4,
      emissive: '#FFA000',
      emissiveIntensity: 0.15,
    });

    const knot = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 16, 12),
      bowMat,
    );
    knot.scale.set(1, 0.8, 0.8);
    this.bowGroup.add(knot);

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(
        new THREE.SphereGeometry(0.058, 20, 14),
        bowMat,
      );
      wing.scale.set(1.5, 0.9, 0.55);
      wing.position.set(side * 0.058, 0.012, 0);
      wing.rotation.z = side * -0.3;
      this.bowGroup.add(wing);
    }

    const sparkleMat = new THREE.MeshBasicMaterial({
      color: '#FFF8E0',
      transparent: true,
      opacity: 0.7,
    });
    const sp1 = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), sparkleMat);
    sp1.position.set(0.1, 0.05, 0.02);
    this.bowGroup.add(sp1);
    const sp2 = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), sparkleMat);
    sp2.position.set(0.12, 0.025, 0.01);
    this.bowGroup.add(sp2);

    this.bowGroup.position.set(0, 0.50, 0.10);
    this.headGroup.add(this.bowGroup);
  }

  private buildArm(mat: THREE.Material, side: number): THREE.Mesh {
    const arm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.042, 0.05, 8, 16),
      mat,
    );
    arm.position.set(side * 0.42, 0.08, 0.0);
    arm.rotation.z = side * -0.5;
    this.headGroup.add(arm);
    return arm;
  }

  private buildFeet(mat: THREE.Material): void {
    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(
        new THREE.SphereGeometry(0.048, 16, 12),
        mat,
      );
      foot.scale.set(1, 0.55, 1.05);
      foot.position.set(side * 0.10, -0.35, 0.04);
      this.headGroup.add(foot);
    }
  }

  private buildSpecularHighlights(): void {
    const hlMat = new THREE.MeshBasicMaterial({
      color: '#FFFFFF',
      transparent: true,
      opacity: 0.35,
    });
    const d1 = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), hlMat);
    d1.position.set(-0.06, 0.34, 0.38);
    this.headGroup.add(d1);

    const d2 = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), hlMat);
    d2.position.set(-0.02, 0.29, 0.40);
    this.headGroup.add(d2);
  }

  /** Per-frame update — idle animation + state-driven reactions */
  update(_delta: number, elapsed: number): void {
    // Ease state blend toward 1
    this.stateBlend = Math.min(1, this.stateBlend + _delta * 3.0);

    // === Base idle animation (always active, damped by state) ===
    const idleMix = this.currentState === 'idle' ? 1.0 : 0.4;

    // Breathing — squash and stretch
    const breathT = Math.sin(elapsed * 1.8) * 0.5 + 0.5;
    const squash = 1.0 + breathT * 0.012 * idleMix;
    const stretch = 1.0 - breathT * 0.008 * idleMix;
    this.headGroup.scale.set(stretch, squash, stretch);
    this.headGroup.position.y = breathT * 0.006 * idleMix;

    // Gentle sway
    this.headGroup.rotation.z = Math.sin(elapsed * 0.9) * 0.015 * idleMix;

    // Right arm wave (idle only)
    this.rightArm.rotation.z = -0.5 + Math.sin(elapsed * 2.0) * 0.2 * idleMix;

    // Bow subtle bounce
    this.bowGroup.rotation.z = Math.sin(elapsed * 1.5) * 0.04;

    // Reset per-state overrides to defaults before applying
    this.bodyMat.emissiveIntensity = this.baseEmissiveIntensity;
    this.mouth.scale.set(1, 1, 1);
    this.headGroup.rotation.x = 0;

    // === State-specific reactions ===
    switch (this.currentState) {
      case 'listening':
        this.updateListening(elapsed);
        break;
      case 'thinking':
        this.updateThinking(elapsed);
        break;
      case 'speaking':
        this.updateSpeaking(elapsed);
        break;
    }
  }

  /** Listening — body pulses with soft glow, leans forward slightly */
  private updateListening(elapsed: number): void {
    const pulse = Math.sin(elapsed * 3.0) * 0.5 + 0.5;
    this.bodyMat.emissiveIntensity = this.baseEmissiveIntensity + pulse * 0.12 * this.stateBlend;
    this.headGroup.rotation.x = -0.03 * this.stateBlend;
    this.mouth.scale.y = 1.0 + 0.3 * this.stateBlend;
  }

  /** Thinking — gentle bounce, emissive shimmer */
  private updateThinking(elapsed: number): void {
    const bounce = Math.abs(Math.sin(elapsed * 4.0));
    this.headGroup.position.y += bounce * 0.015 * this.stateBlend;
    const shimmer = Math.sin(elapsed * 6.0) * 0.5 + 0.5;
    this.bodyMat.emissiveIntensity = this.baseEmissiveIntensity + shimmer * 0.08 * this.stateBlend;
  }

  /** Speaking — mouth opens/closes rhythmically, body bobs */
  private updateSpeaking(elapsed: number): void {
    const mouthOpen = (Math.sin(elapsed * 12.0) * 0.5 + 0.5)
                    * (Math.sin(elapsed * 7.3) * 0.3 + 0.7);
    this.mouth.scale.y = 1.0 + mouthOpen * 1.2 * this.stateBlend;
    this.mouth.scale.x = 1.0 + mouthOpen * 0.3 * this.stateBlend;

    const bob = Math.sin(elapsed * 5.0) * 0.004;
    this.headGroup.position.y += bob * this.stateBlend;

    this.bodyMat.emissiveIntensity = this.baseEmissiveIntensity + 0.08 * this.stateBlend;
  }
}
