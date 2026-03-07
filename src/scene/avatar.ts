import * as THREE from 'three';

/**
 * Kawaii blob avatar — based on character reference sheet.
 * Round bubblegum-pink body, big expressive eyes, yellow bow, stubby nub limbs.
 */
export class Avatar {
  readonly group: THREE.Group;
  readonly headGroup: THREE.Group;

  private bowGroup: THREE.Group;
  private rightArm: THREE.Mesh;

  constructor() {
    this.group = new THREE.Group();
    this.headGroup = new THREE.Group();
    this.bowGroup = new THREE.Group();

    // Primary body material — vivid bubblegum pink, glossy
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: '#F48CB0',
      roughness: 0.2,
      metalness: 0.0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.08,
      sheen: 1.0,
      sheenRoughness: 0.2,
      sheenColor: new THREE.Color('#FFDCE8'),
      emissive: '#F48CB0',
      emissiveIntensity: 0.15,
    });

    this.buildBody(bodyMat);
    this.buildEyes();
    this.buildMouth();
    this.buildBlush();
    this.buildBow();
    this.buildArm(bodyMat, -1);
    this.rightArm = this.buildArm(bodyMat, 1);
    this.buildFeet(bodyMat);
    this.buildSpecularHighlights();

    this.group.add(this.headGroup);
  }

  private buildBody(mat: THREE.Material): void {
    // Round blob body — nearly spherical per reference turnaround
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 64, 48),
      mat,
    );
    // Very slightly wider than tall, barely flattened in depth
    body.scale.set(1.0, 0.96, 0.92);
    body.position.y = 0.08;
    this.headGroup.add(body);
  }

  private buildEyes(): void {
    // Large kawaii eyes — positioned on body surface, dark iris dominates
    const eyeOffsetX = 0.14;
    const eyeY = 0.08;
    const eyeZ = 0.40; // On the body surface (body Z radius ~0.405)

    for (const side of [-1, 1]) {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * eyeOffsetX, eyeY, eyeZ);

      // Sclera — white base, visible as thin rim around the dark iris
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

      // Iris — very large, nearly fills entire eye (dark brown)
      // Only a thin white crescent visible at top
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

      // Pupil — black center
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

      // Primary highlight — prominent white dot upper area
      const hlMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
      const hl1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 12, 8),
        hlMat,
      );
      hl1.position.set(side * 0.015, 0.03, 0.05);
      eyeGroup.add(hl1);

      // Secondary highlight — smaller dot lower-opposite
      const hl2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.013, 8, 6),
        hlMat,
      );
      hl2.position.set(side * -0.015, -0.025, 0.05);
      eyeGroup.add(hl2);

      // Eyelashes — 3 per eye, fanning from outer-top edge
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

  private buildMouth(): void {
    // Small curved smile
    const mouthMat = new THREE.MeshBasicMaterial({ color: '#9B4860' });
    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.03, 0.005, 8, 16, Math.PI),
      mouthMat,
    );
    mouth.position.set(0, -0.02, 0.41);
    mouth.rotation.z = Math.PI; // curves up = smile
    this.headGroup.add(mouth);
  }

  private buildBlush(): void {
    // Soft rosy cheek ovals — below and outside the eyes
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
      // Orient to face outward along body surface
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

    // Center knot
    const knot = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 16, 12),
      bowMat,
    );
    knot.scale.set(1, 0.8, 0.8);
    this.bowGroup.add(knot);

    // Two wing lobes — clearly visible as separate shapes
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

    // Sparkle dots near bow
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

    // Position bow centered on top of head
    this.bowGroup.position.set(0, 0.50, 0.10);
    this.headGroup.add(this.bowGroup);
  }

  private buildArm(mat: THREE.Material, side: number): THREE.Mesh {
    // Short stubby nub arms — like the reference side view
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
    // Small round feet — close together under body
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
    // Tiny subtle glossy surface dots
    const hlMat = new THREE.MeshBasicMaterial({
      color: '#FFFFFF',
      transparent: true,
      opacity: 0.35,
    });

    // Upper-left dot
    const d1 = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), hlMat);
    d1.position.set(-0.06, 0.34, 0.38);
    this.headGroup.add(d1);

    // Smaller companion dot
    const d2 = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), hlMat);
    d2.position.set(-0.02, 0.29, 0.40);
    this.headGroup.add(d2);
  }

  /** Idle animation — gentle breathing squash/stretch + arm wave */
  update(_delta: number, elapsed: number): void {
    // Breathing — squash and stretch
    const breathT = Math.sin(elapsed * 1.8) * 0.5 + 0.5;
    const squash = 1.0 + breathT * 0.012;
    const stretch = 1.0 - breathT * 0.008;
    this.headGroup.scale.set(stretch, squash, stretch);
    this.headGroup.position.y = breathT * 0.006;

    // Gentle sway
    this.headGroup.rotation.z = Math.sin(elapsed * 0.9) * 0.015;

    // Right arm wave
    this.rightArm.rotation.z = -0.5 + Math.sin(elapsed * 2.0) * 0.2;

    // Bow subtle bounce
    this.bowGroup.rotation.z = Math.sin(elapsed * 1.5) * 0.04;
  }
}
