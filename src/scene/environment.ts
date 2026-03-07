import * as THREE from 'three';

/**
 * Creates a subtle contour-field background plane.
 * Topographic lines at 2-4% opacity per design system.
 * Animated slowly for organic feel.
 */
export function createEnvironment(scene: THREE.Scene): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(10, 10);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#4F6F8C') },
      uOpacity: { value: 0.035 },
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
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        // Scale UV for contour density
        vec2 p = vUv * 8.0;

        // Animated contour field — slow organic movement
        float field = sin(p.x * 3.0 + uTime * 0.15)
                    + sin(p.y * 2.5 - uTime * 0.1)
                    + sin((p.x + p.y) * 1.8 + uTime * 0.08);
        field *= 0.333;

        // Create contour lines from the field
        float contour = abs(fract(field * 3.0) - 0.5);
        contour = smoothstep(0.0, 0.06, contour);
        float line = 1.0 - contour;

        gl_FragColor = vec4(uColor, line * uOpacity);
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
