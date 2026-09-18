import * as THREE from "three";
import { createLatheAssembly } from "./LatheAssembly.js";
import { createSceneLighting } from "./SceneLighting.js";
import { createCameraRig } from "./CameraRig.js";
import { browserEnvironment, getRenderProfile, getViewportProfile } from "./responsive.js";

export function createMachiningCanvas(host, options = {}) {
  const initialViewport = getViewportProfile(host.clientWidth || innerWidth, host.clientHeight || innerHeight);
  const env = browserEnvironment();
  const initialQuality = getRenderProfile(initialViewport, env);

  const renderer = new THREE.WebGLRenderer({
    antialias: initialQuality.antialias,
    alpha: true,
    powerPreference: initialQuality.constrained ? "default" : "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x080a0b, 0);
  renderer.domElement.style.touchAction = "pan-y";
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const assembly = createLatheAssembly({ lowPower: initialQuality.lowDetail });
  scene.add(assembly.root);
  const lighting = createSceneLighting(scene, renderer, { quality: initialQuality });
  const rig = createCameraRig({ centered: options.centered });
  const projected = new THREE.Vector3();
  const anchor = { x: 0, y: 0 };

  let width = 1;
  let height = 1;
  let disposed = false;
  let contextUnavailable = false;
  let lastProgress = 0;
  let lastActiveId;
  let viewport = initialViewport;
  let quality = initialQuality;
  let profileKey = "";

  const emitProfile = () => {
    const nextKey = `${viewport.name}:${quality.tier}`;
    if (nextKey === profileKey) return;
    profileKey = nextKey;
    options.onProfileChange?.({ viewport, quality });
  };

  const contextLost = (event) => {
    event.preventDefault();
    contextUnavailable = true;
    options.onContextLost?.();
  };
  const contextRestored = () => {
    contextUnavailable = false;
    resize();
    options.onContextRestored?.();
    render(lastProgress, lastActiveId);
  };
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  renderer.domElement.addEventListener("webglcontextrestored", contextRestored);

  function resize() {
    if (disposed) return;
    width = Math.max(1, Math.round(host.clientWidth));
    height = Math.max(1, Math.round(host.clientHeight));
    viewport = getViewportProfile(width, height);
    quality = getRenderProfile(viewport, browserEnvironment());

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dprCap));
    renderer.setSize(width, height, false);
    lighting.setQuality(quality);
    emitProfile();
  }

  function render(progress, activeId) {
    lastProgress = progress;
    lastActiveId = activeId;
    if (disposed || contextUnavailable) return null;

    assembly.update(progress, activeId, viewport.spread);
    lighting.update(progress);
    const rigProfile = rig.update(progress, width, height);
    renderer.render(scene, rig.camera);

    // Camera and renderer share the same pure viewport classification. Expose
    // the actual profile used so responsive tests can verify the composition.
    if (rigProfile.name !== viewport.name) {
      viewport = rigProfile;
      emitProfile();
    }

    const part = activeId && assembly.parts.find((p) => p.data.id === activeId);
    if (!part) return null;
    part.group.getWorldPosition(projected);
    projected.project(rig.camera);
    anchor.x = ((projected.x + 1) * width) / 2;
    anchor.y = ((1 - projected.y) * height) / 2;
    return anchor;
  }

  resize();

  return {
    resize,
    render,
    get profile() {
      return { viewport, quality };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", contextRestored);
      assembly.dispose();
      lighting.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
