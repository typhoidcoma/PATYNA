import * as THREE from 'three';

/**
 * Creates an ambient environment background.
 * - Radial gradient: soft teal glow behind character, fading to dark edges
 * - Contour field: slow-moving topographic lines at low opacity
 * - Sparkle particles: floating luminous dots for ethereal feel
 */
export function createEnvironment(scene: THREE.Scene): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(12, 12);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uTeal: { value: new THREE.Color('#1C8E77') },
      uGlow: { value: new THREE.Color('#63E6C7') },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uTeal;
      uniform vec3 uGlow;
      varying vec2 vUv;

      // Simple pseudo-random
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec2 uv = vUv;
        vec2 center = uv - 0.5;
        float dist = length(center);

        // ── Radial gradient: soft teal glow behind character ──
        float glow = exp(-dist * dist * 4.0) * 0.28;
        vec3 glowColor = uGlow * glow;

        // ── Contour field ──
        vec2 p = uv * 8.0;
        float field = sin(p.x * 3.0 + uTime * 0.12)
                    + sin(p.y * 2.5 - uTime * 0.08)
                    + sin((p.x + p.y) * 1.8 + uTime * 0.06);
        field *= 0.333;

        float contour = abs(fract(field * 3.0) - 0.5);
        contour = smoothstep(0.0, 0.05, contour);
        float line = 1.0 - contour;

        // Fade contours toward edges (stronger near center)
        float contourFade = smoothstep(0.65, 0.1, dist);
        vec3 contourColor = uTeal * line * 0.08 * contourFade;

        // ── Sparkle particles ──
        float sparkle = 0.0;
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          vec2 grid = floor(uv * (14.0 + fi * 5.0));
          float h = hash(grid + fi * 10.0);

          // ~25% of cells have a sparkle
          if (h > 0.75) {
            vec2 cellUv = fract(uv * (14.0 + fi * 5.0));
            vec2 sparklePos = vec2(
              hash(grid + fi * 20.0 + 1.0),
              hash(grid + fi * 20.0 + 2.0)
            );
            // Slow drift
            sparklePos += vec2(
              sin(uTime * 0.15 + h * 6.28) * 0.1,
              cos(uTime * 0.12 + h * 3.14) * 0.1
            );
            float d = length(cellUv - sparklePos);
            // Twinkle
            float twinkle = sin(uTime * (1.2 + h * 2.5) + h * 6.28) * 0.5 + 0.5;
            twinkle *= twinkle; // sharper pulse
            float dot = smoothstep(0.07, 0.0, d) * twinkle;
            // Fade sparkles at edges
            dot *= smoothstep(0.65, 0.15, dist);
            sparkle += dot * (0.12 + fi * 0.02);
          }
        }
        vec3 sparkleColor = uGlow * sparkle;

        // ── Combine ──
        vec3 color = glowColor + contourColor + sparkleColor;
        float alpha = glow + line * 0.08 * contourFade + sparkle;

        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -3;
  scene.add(mesh);

  return mesh;
}

/** Update the environment shader time uniform — call from render loop */
export function updateEnvironment(mesh: THREE.Mesh, elapsed: number): void {
  const mat = mesh.material as THREE.ShaderMaterial;
  mat.uniforms.uTime.value = elapsed;
}
