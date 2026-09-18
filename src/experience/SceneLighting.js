import * as THREE from "three";
import { range } from "./animation.js";

// Broad, neutral reflections keep the metal readable without post-processing.
// Shadow resolution is intentionally adaptive because Retina mobile screens can
// otherwise spend most of their GPU budget on an invisible shadow map.
export function createSceneLighting(scene, renderer, options = {}) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color("#101514");
  const panels = [];

  function softbox(position, width, height, strength, color = "#eef1ef") {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(strength),
      side: THREE.DoubleSide,
    });
    const panel = new THREE.Mesh(geometry, material);
    panel.position.fromArray(position);
    panel.lookAt(0, 0.2, 0);
    studio.add(panel);
    panels.push(panel);
  }

  softbox([-4.5, 6.5, 5.5], 8.5, 3.4, 4.0);
  softbox([6.5, 3.0, 4.5], 2.5, 7.5, 3.0);
  softbox([0.5, 4.5, -6.5], 7.5, 3.4, 2.3, "#c0cbca");
  softbox([-7.5, 1.0, -1.0], 2.0, 5.0, 1.25);
  softbox([0, -3.2, 3], 8.0, 2.2, 0.25);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, 0.045);
  scene.environment = environment.texture;
  panels.forEach((panel) => {
    panel.geometry.dispose();
    panel.material.dispose();
  });
  pmrem.dispose();

  const key = new THREE.DirectionalLight("#f1f2ef", 1.72);
  key.position.set(-4.5, 7.5, 6.2);
  key.castShadow = true;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -4;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 22;
  key.shadow.bias = -0.00025;

  const rim = new THREE.DirectionalLight("#d9ddd7", 1.5);
  rim.position.set(5.8, 3.8, -6.2);
  const side = new THREE.DirectionalLight("#e0e1dc", 0.54);
  side.position.set(7.5, 1.2, 4.5);
  const chuckAccent = new THREE.DirectionalLight("#ecece6", 0.4);
  chuckAccent.position.set(-5, 2.6, 4.8);
  const fill = new THREE.HemisphereLight("#b5bbb6", "#070909", 0.34);

  const groundMaterial = new THREE.ShadowMaterial({
    color: 0x000000,
    opacity: 0.3,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(18, 9), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0.2, -1.79, 0.15);
  ground.receiveShadow = true;

  // A single radial alpha plane gives phones a cheap contact shadow when
  // dynamic shadow maps are disabled. It restores grounding and depth without
  // redrawing the entire many-mesh lathe from the light point of view.
  const contactMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uOpacity: { value: 0.3 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uOpacity;
      void main() {
        vec2 p = (vUv - 0.5) * vec2(1.0, 1.65);
        float alpha = smoothstep(0.58, 0.04, length(p)) * uOpacity;
        gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
      }
    `,
  });
  const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 4.6), contactMaterial);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0.3, -1.775, 0.12);
  contactShadow.renderOrder = -1;

  scene.add(key, rim, side, chuckAccent, fill, ground, contactShadow);

  let shadowSize = 0;
  let lowDetail = false;
  function setQuality(quality = {}) {
    const nextSize = quality.shadowMapSize || 1024;
    lowDetail = Boolean(quality.lowDetail);
    const shadowsEnabled = quality.shadows !== false;
    renderer.shadowMap.enabled = shadowsEnabled;
    key.castShadow = shadowsEnabled;
    ground.receiveShadow = shadowsEnabled;
    if (shadowsEnabled && nextSize !== shadowSize) {
      shadowSize = nextSize;
      key.shadow.mapSize.set(nextSize, nextSize);
      key.shadow.map?.dispose();
      key.shadow.map = null;
      key.shadow.needsUpdate = true;
    }
    ground.visible = shadowsEnabled;
    contactShadow.visible = !shadowsEnabled;
    groundMaterial.opacity = lowDetail ? 0.18 : 0.3;
    contactMaterial.uniforms.uOpacity.value = lowDetail ? 0.22 : 0.3;
  }

  setQuality(options.quality);

  return {
    setQuality,
    update(progress) {
      const inspect = range(progress, 0.08, 0.36);
      const cutting = range(progress, 0.36, 0.62);
      const exploded = range(progress, 0.78, 0.94);
      key.intensity = 1.72 + inspect * 0.14;
      rim.intensity = 1.5 + exploded * 0.24;
      chuckAccent.intensity = 0.4 + inspect * 0.17 - cutting * 0.08;
      const baseOpacity = lowDetail ? 0.18 : 0.3;
      groundMaterial.opacity = baseOpacity - exploded * (lowDetail ? 0.06 : 0.12);
      contactMaterial.uniforms.uOpacity.value = (lowDetail ? 0.22 : 0.3) - exploded * 0.09;
    },
    dispose() {
      environment.dispose();
      key.shadow.map?.dispose();
      ground.geometry.dispose();
      groundMaterial.dispose();
      contactShadow.geometry.dispose();
      contactMaterial.dispose();
      scene.remove(key, rim, side, chuckAccent, fill, ground, contactShadow);
    },
  };
}
