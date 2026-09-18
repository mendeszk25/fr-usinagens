import * as THREE from "three";
import { createLatheAssembly } from "./LatheAssembly.js";
import { createSceneLighting } from "./SceneLighting.js";
import { createCameraRig } from "./CameraRig.js";
import {
  browserEnvironment,
  chooseAdaptiveMobileTier,
  getRenderProfile,
  getViewportProfile,
  summarizeFrameSamples,
} from "./responsive.js";

export function createMachiningCanvas(host, options = {}) {
  const initialViewport = getViewportProfile(host.clientWidth || innerWidth, host.clientHeight || innerHeight);
  const env = browserEnvironment();
  const initialQuality = getRenderProfile(initialViewport, env);

  const renderer = new THREE.WebGLRenderer({
    antialias: initialQuality.antialias,
    alpha: true,
    preserveDrawingBuffer: false,
    powerPreference: initialQuality.constrained ? "default" : "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = initialViewport.mobile ? 1.08 : 1.02;
  renderer.shadowMap.enabled = initialQuality.shadows;
  renderer.shadowMap.type = initialQuality.shadows ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
  renderer.setClearColor(0x080a0b, 0);
  renderer.domElement.style.touchAction = "pan-y";
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const assembly = createLatheAssembly({
    lowPower: initialQuality.lowDetail,
    mobile: initialViewport.mobile,
    materialDetail: initialQuality.materialDetail,
  });
  scene.add(assembly.root);
  const lighting = createSceneLighting(scene, renderer, { quality: initialQuality });
  const rig = createCameraRig({ centered: options.centered });
  const projected = new THREE.Vector3();
  const partById = new Map(assembly.parts.map((item) => [item.data.id, item]));
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
  let appliedDpr = 0;
  let adaptiveTier = initialViewport.mobile ? initialQuality.tier : null;
  let qualityLocked = !initialViewport.mobile || initialQuality.constrained;
  let sampleProfile = initialViewport.name;
  let frameSamples = [];
  let performanceMetrics = summarizeFrameSamples(frameSamples);

  const currentEnvironment = () => ({
    ...browserEnvironment(),
    ...(adaptiveTier ? { qualityTier: adaptiveTier } : {}),
  });

  const emitProfile = () => {
    const nextKey = `${viewport.name}:${quality.tier}:${quality.dprCap}`;
    if (nextKey === profileKey) return;
    profileKey = nextKey;
    options.onProfileChange?.({ viewport, quality, performance: performanceMetrics });
  };

  function applyQuality(nextQuality) {
    quality = nextQuality;
    const nextDpr = Math.min(window.devicePixelRatio || 1, quality.dprCap);
    if (Math.abs(nextDpr - appliedDpr) > 0.01) {
      appliedDpr = nextDpr;
      renderer.setPixelRatio(nextDpr);
      // setPixelRatio changes the backing buffer. Re-apply the CSS dimensions
      // once, never from the scroll/touch event itself.
      renderer.setSize(width, height, false);
    }
    lighting.setQuality(quality);
    emitProfile();
  }

  function resetAdaptiveQuality(nextProfileName) {
    sampleProfile = nextProfileName;
    frameSamples = [];
    performanceMetrics = summarizeFrameSamples(frameSamples);
    const base = getRenderProfile(viewport, browserEnvironment());
    adaptiveTier = viewport.mobile ? base.tier : null;
    qualityLocked = !viewport.mobile || base.constrained;
    applyQuality(base);
  }

  function sampleRenderCost(costMs) {
    if (!viewport.mobile || qualityLocked || document.hidden) return;
    if (sampleProfile !== viewport.name) {
      resetAdaptiveQuality(viewport.name);
      return;
    }
    if (!Number.isFinite(costMs) || costMs <= 0 || costMs > 80) return;
    frameSamples.push(costMs);
    if (frameSamples.length > 60) frameSamples.shift();
    performanceMetrics = summarizeFrameSamples(frameSamples);
    if (performanceMetrics.samples < 48) return;

    const selectedTier = chooseAdaptiveMobileTier(performanceMetrics);
    qualityLocked = true;
    if (selectedTier !== adaptiveTier) {
      adaptiveTier = selectedTier;
      applyQuality(getRenderProfile(viewport, currentEnvironment()));
    } else {
      emitProfile();
    }
  }

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
    const nextWidth = Math.max(1, Math.round(host.clientWidth));
    const nextHeight = Math.max(1, Math.round(host.clientHeight));
    const sizeChanged = nextWidth !== width || nextHeight !== height;
    const previousProfile = viewport.name;
    width = nextWidth;
    height = nextHeight;
    viewport = getViewportProfile(width, height);

    if (viewport.name !== previousProfile) {
      resetAdaptiveQuality(viewport.name);
    } else {
      applyQuality(getRenderProfile(viewport, currentEnvironment()));
    }

    if (sizeChanged) renderer.setSize(width, height, false);
  }

  function render(progress, activeId) {
    lastProgress = progress;
    lastActiveId = activeId;
    if (disposed || contextUnavailable) return null;

    const start = performance.now();
    assembly.update(progress, activeId, viewport.spread);
    lighting.update(progress);
    const rigProfile = rig.update(progress, width, height);
    renderer.render(scene, rig.camera);
    sampleRenderCost(performance.now() - start);

    // Camera and renderer share the same pure viewport classification. Expose
    // the actual profile used so responsive tests can verify the composition.
    if (rigProfile.name !== viewport.name) {
      viewport = rigProfile;
      emitProfile();
    }

    const part = activeId ? partById.get(activeId) : undefined;
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
      return { viewport, quality, performance: performanceMetrics, appliedDpr };
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
