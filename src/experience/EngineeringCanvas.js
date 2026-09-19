import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  createMechanicalStudy,
  createPrecisionStudy,
  createProcessStudy,
  disposeStudy,
} from "./ProceduralParts.js";
import { modelMeta } from "./MechanicalModelRegistry.js";
import { getViewportProfile } from "./responsive.js";
import { clamp01, getPrecisionVisualState, getProcessVisualState } from "./engineeringState.js";

function prepareStudy(study, targetSize = 4.3) {
  const box = new THREE.Box3().setFromObject(study.group);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z, 0.001);
  const fitScale = targetSize / longest;
  const pivot = new THREE.Group();
  pivot.name = `${study.group.name || "Study"}-Pivot`;
  study.group.position.sub(center);
  pivot.add(study.group);
  study.root = study.group;
  study.group = pivot;
  study.fitScale = fitScale;
  study.bounds = { size, center };
  return study;
}

function setMaterialOpacity(material, opacity) {
  if (!material || material.isLineBasicMaterial) return;
  material.transparent = opacity < 0.995;
  material.opacity = opacity;
  material.depthWrite = opacity > 0.48;
}

export function createEngineeringCanvas(host, { mode: requestedMode, modelId: suppliedModelId } = {}) {
  const instanceMode = requestedMode || host.dataset.engineering3d || "components";
  const modelId = suppliedModelId || host.dataset.modelId || (instanceMode === "process" ? "gearShaft" : instanceMode === "precision" ? "industrialAssembly" : "threadedPin");
  const profile = getViewportProfile(host.clientWidth || innerWidth, host.clientHeight || innerHeight);
  const renderer = new THREE.WebGLRenderer({
    antialias: !profile.mobile,
    alpha: true,
    powerPreference: profile.mobile ? "default" : "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = profile.mobile ? 0.90 : 0.86;
  renderer.setClearColor(0x080a0b, 0);
  renderer.shadowMap.enabled = !profile.mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "engineering-canvas";
  renderer.domElement.style.touchAction = "pan-y";
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 70);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.05);
  scene.environment = environment.texture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight("#f0f2ef", 1.18);
  key.position.set(-4.8, 6.8, 6.2);
  key.castShadow = !profile.mobile;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.camera.far = 24;
  const rim = new THREE.DirectionalLight("#a7bac2", 0.72);
  rim.position.set(5.4, 2.8, -6.2);
  const side = new THREE.DirectionalLight("#6f7a80", 0.34);
  side.position.set(1.5, -1.0, 5.5);
  const fill = new THREE.HemisphereLight("#9aa6ab", "#050708", 0.20);
  scene.add(key, rim, side, fill);

  const groundMaterial = new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.17 });
  const groundGeometry = new THREE.PlaneGeometry(12, 8);
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.48;
  ground.receiveShadow = !profile.mobile;
  scene.add(ground);

  const qualityDetail = profile.mobile ? "balanced" : "high";
  const studies = {};
  if (instanceMode === "components") {
    studies.component = prepareStudy(createMechanicalStudy(modelId, { detail: qualityDetail }), 4.55);
    scene.add(studies.component.group);
  } else if (instanceMode === "process") {
    studies.process = prepareStudy(createProcessStudy({ detail: qualityDetail, familyId: modelId }), 4.45);
    scene.add(studies.process.group);
  } else if (instanceMode === "precision") {
    studies.precision = prepareStudy(createPrecisionStudy({ detail: qualityDetail, familyId: modelId }), 4.0);
    scene.add(studies.precision.group);
  }

  let width = 1;
  let height = 1;
  let pointerX = 0;
  let pointerY = 0;
  let manualRotation = 0;
  let disposed = false;
  let contextLost = false;

  function resize() {
    if (disposed) return;
    width = Math.max(1, Math.round(host.clientWidth));
    height = Math.max(1, Math.round(host.clientHeight));
    const viewport = getViewportProfile(width, height);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, viewport.mobile ? 1.35 : 1.9));
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = !viewport.mobile;
    key.castShadow = !viewport.mobile;
    ground.receiveShadow = !viewport.mobile;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function updateComponents(progress, reducedMotion) {
    const study = studies.component;
    if (!study) return;
    const mobile = width < 760;
    const meta = modelMeta(modelId);
    const targetRotation = reducedMotion ? 0.02 : pointerX * 0.13 + manualRotation + progress * 0.12;
    study.group.rotation.y += (targetRotation - study.group.rotation.y) * 0.16;
    study.group.rotation.x += ((-0.05 + pointerY * 0.035) - study.group.rotation.x) * 0.16;
    study.group.scale.setScalar(study.fitScale * (mobile ? 0.80 : 1));
    study.group.position.set(0, meta.cameraPreset === "block" ? -0.08 : -0.02, 0);

    camera.fov = mobile ? 38 : meta.cameraPreset === "block" ? 30 : 31;
    if (meta.cameraPreset === "long") camera.position.set(mobile ? 5.7 : 4.9, mobile ? 2.35 : 1.95, mobile ? 8.8 : 7.7);
    else if (meta.cameraPreset === "block") camera.position.set(mobile ? 5.2 : 4.35, mobile ? 2.85 : 2.30, mobile ? 7.9 : 6.75);
    else camera.position.set(mobile ? 5.0 : 4.05, mobile ? 2.55 : 2.05, mobile ? 7.7 : 6.45);
    camera.lookAt(0, -0.03, 0);
    ground.position.y = -1.50;
  }

  function updateProcess(progress, reducedMotion) {
    const study = studies.process;
    if (!study) return;
    const mobile = width < 760;
    const state = getProcessVisualState(progress, reducedMotion);
    study.stages.forEach((entry, index) => {
      const opacity = state.stageOpacities?.[index] ?? 0;
      entry.group.visible = opacity > 0.02;
      entry.materials.forEach((material) => setMaterialOpacity(material, opacity));
    });

    const travel = state.toolTravel;
    study.toolGroup.position.set(3.1 - travel * 5.6, -1.02 + Math.sin(travel * Math.PI) * 0.06, 0.90);
    study.toolGroup.rotation.z = -0.035;
    study.group.rotation.x = -0.02;
    study.group.rotation.y = reducedMotion ? 0.02 : -0.08 + state.progress * 0.08;
    study.group.scale.setScalar(study.fitScale * (mobile ? 0.77 : 1.02));
    camera.fov = mobile ? 39 : 31;
    camera.position.set(mobile ? 5.6 : 4.65, mobile ? 2.75 : 2.05, mobile ? 8.8 : 7.5);
    camera.lookAt(0, -0.04, 0);
    ground.position.y = -1.5;
  }

  function updatePrecision(progress, reducedMotion) {
    const study = studies.precision;
    if (!study) return;
    const mobile = width < 760;
    const state = getPrecisionVisualState(progress, reducedMotion);
    study.wires.forEach((wire) => {
      wire.material.opacity = state.wireOpacity;
      wire.visible = state.wireOpacity > 0.025;
    });
    study.solids.forEach((solid) => {
      const mats = Array.isArray(solid.material) ? solid.material : [solid.material];
      mats.forEach((material) => {
        if (!material || material.isLineBasicMaterial) return;
        material.transparent = false;
        material.opacity = 1;
        if (typeof material.roughness === "number") material.roughness = Math.min(0.68, material.roughness + state.wireOpacity * 0.05);
      });
    });
    study.group.rotation.set(-0.08, -0.20 + (reducedMotion ? 0 : state.progress * 0.16), 0.05);
    study.group.scale.setScalar(study.fitScale * (mobile ? 0.84 : 1.02));
    camera.fov = mobile ? 38 : 29;
    camera.position.set(mobile ? 4.9 : 3.95, mobile ? 2.55 : 1.95, mobile ? 7.6 : 6.35);
    camera.lookAt(0, 0, 0);
    ground.position.y = -1.47;
  }

  function render(next = {}) {
    if (disposed || contextLost || document.hidden) return;
    const progress = clamp01(next.progress);
    pointerX = Number(next.pointerX) || 0;
    pointerY = Number(next.pointerY) || 0;
    manualRotation = Number(next.manualRotation) || 0;
    const reducedMotion = Boolean(next.reducedMotion);
    if (instanceMode === "components") updateComponents(progress, reducedMotion);
    if (instanceMode === "process") updateProcess(progress, reducedMotion);
    if (instanceMode === "precision") updatePrecision(progress, reducedMotion);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  const onContextLost = (event) => {
    event.preventDefault();
    contextLost = true;
    host.classList.add("is-webgl-unavailable");
  };
  const onContextRestored = () => {
    contextLost = false;
    host.classList.remove("is-webgl-unavailable");
    resize();
    render();
  };
  renderer.domElement.addEventListener("webglcontextlost", onContextLost);
  renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

  resize();

  return {
    canvas: renderer.domElement,
    modelId,
    resize,
    render,
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
      Object.values(studies).forEach(disposeStudy);
      groundGeometry.dispose();
      groundMaterial.dispose();
      environment.dispose();
      key.shadow.map?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
