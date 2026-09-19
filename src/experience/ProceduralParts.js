import * as THREE from "three";
import { createMechanicalMaterials } from "./MechanicalMaterials.js";
import {
  addMesh,
  addRadialTeeth,
  collectStudy,
  cylinderX,
  ringX,
  roundedBox,
} from "./MechanicalDetails.js";
import { buildGearShaft } from "./models/GearShaft.js";
import { buildThreadedPin } from "./models/ThreadedPin.js";
import { buildIndustrialAssembly } from "./models/IndustrialAssembly.js";

const BUILDERS = {
  gearShaft: buildGearShaft,
  threadedPin: buildThreadedPin,
  industrialAssembly: buildIndustrialAssembly,
};

export function createMechanicalStudy(id, { detail = "balanced" } = {}) {
  const builder = BUILDERS[id] || BUILDERS.gearShaft;
  return builder(detail);
}

function makeStage() {
  return { group: new THREE.Group(), materials: createMechanicalMaterials() };
}

function buildGearShaftProcessStages(detail) {
  const stages = [];

  let stage = makeStage();
  addMesh(stage.group, cylinderX(0.72, 4.55, detail), stage.materials.raw, { name: "raw-stock" });
  stages.push(collectStudy(stage.group, { materials: Object.values(stage.materials) }));

  stage = makeStage();
  addMesh(stage.group, cylinderX(0.64, 4.32, detail), stage.materials.raw);
  addMesh(stage.group, cylinderX(0.52, 0.62, detail), stage.materials.brushed, { position: [1.84, 0, 0] });
  stages.push(collectStudy(stage.group, { materials: Object.values(stage.materials) }));

  stage = makeStage();
  addMesh(stage.group, cylinderX(0.46, 2.82, detail), stage.materials.brushed, { position: [0.34, 0, 0] });
  addMesh(stage.group, cylinderX(0.55, 0.72, detail), stage.materials.machined, { position: [-1.45, 0, 0] });
  addMesh(stage.group, cylinderX(0.36, 0.62, detail), stage.materials.machined, { position: [2.02, 0, 0] });
  stages.push(collectStudy(stage.group, { materials: Object.values(stage.materials) }));

  stage = makeStage();
  addMesh(stage.group, cylinderX(0.35, 2.66, detail), stage.materials.brushed, { position: [0.56, 0, 0] });
  addMesh(stage.group, cylinderX(0.40, 0.68, detail), stage.materials.machined, { position: [-1.06, 0, 0] });
  addMesh(stage.group, cylinderX(0.31, 0.58, detail), stage.materials.machined, { position: [2.09, 0, 0] });
  const keyway = roundedBox(0.66, 0.075, 0.18, detail, 0.025);
  addMesh(stage.group, keyway, stage.materials.blackened, { position: [0.82, 0.335, 0] });
  stages.push(collectStudy(stage.group, { materials: Object.values(stage.materials) }));

  stage = makeStage();
  addMesh(stage.group, cylinderX(0.35, 2.66, detail), stage.materials.brushed, { position: [0.56, 0, 0] });
  addMesh(stage.group, cylinderX(0.40, 0.68, detail), stage.materials.machined, { position: [-1.06, 0, 0] });
  addMesh(stage.group, cylinderX(0.31, 0.58, detail), stage.materials.machined, { position: [2.09, 0, 0] });
  addMesh(stage.group, ringX({ outer: 0.66, inner: 0.095, depth: 0.46, detail, bevel: 0.025 }), stage.materials.machined, { position: [-1.64, 0, 0] });
  addRadialTeeth(stage.group, stage.materials.machined, {
    centerX: -1.64,
    radius: 0.70,
    count: detail === "high" ? 10 : 8,
    length: 0.48,
    height: 0.15,
    width: 0.16,
  });
  stages.push(collectStudy(stage.group, { materials: Object.values(stage.materials) }));

  stages.push(buildGearShaft(detail));
  return stages;
}

export function createProcessStudy({ detail = "balanced", familyId = "gearShaft" } = {}) {
  const group = new THREE.Group();
  group.name = `MachiningProcessStudy-${familyId}`;
  const stages = buildGearShaftProcessStages(detail);
  stages.forEach((stage, index) => {
    stage.group.visible = index === 0;
    group.add(stage.group);
  });

  const toolMaterials = createMechanicalMaterials();
  const toolGroup = new THREE.Group();
  addMesh(toolGroup, roundedBox(1.36, 0.22, 0.30, detail, 0.035), toolMaterials.tool);
  const insertGeometry = new THREE.ConeGeometry(0.18, 0.30, 4);
  insertGeometry.rotateZ(-Math.PI / 2);
  addMesh(toolGroup, insertGeometry, toolMaterials.insert, {
    position: [-0.74, 0, 0],
    rotation: [Math.PI / 4, 0, Math.PI / 4],
  });
  toolGroup.position.set(3.1, -1.0, 0.88);
  group.add(toolGroup);

  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-2.8, 0, 0),
    new THREE.Vector3(2.8, 0, 0),
  ]);
  const lineMaterial = new THREE.LineBasicMaterial({ color: "#66737a", transparent: true, opacity: 0.22 });
  group.add(new THREE.Line(lineGeometry, lineMaterial));

  return collectStudy(group, {
    family: familyId,
    stages,
    toolGroup,
    materials: [...Object.values(toolMaterials), lineMaterial],
    geometries: [lineGeometry],
  });
}

function addWireOverlay(group, sourceGroup, material) {
  const wires = [];
  const geometries = [];
  sourceGroup.updateMatrixWorld(true);
  sourceGroup.traverse((object) => {
    if ((!object.isMesh && !object.isInstancedMesh) || !object.geometry) return;
    if (object.isInstancedMesh) return;
    const edges = new THREE.EdgesGeometry(object.geometry, 28);
    const wire = new THREE.LineSegments(edges, material);
    object.matrixWorld.decompose(wire.position, wire.quaternion, wire.scale);
    wire.renderOrder = 8;
    group.add(wire);
    wires.push(wire);
    geometries.push(edges);
  });
  return { wires, geometries };
}

export function createPrecisionStudy({ detail = "balanced", familyId = "industrialAssembly" } = {}) {
  const study = createMechanicalStudy(familyId, { detail });
  const group = new THREE.Group();
  group.name = `PrecisionStudy-${familyId}`;
  group.add(study.group);
  const wireMaterial = new THREE.LineBasicMaterial({ color: "#b8c3c8", transparent: true, opacity: 0 });
  const { wires, geometries } = addWireOverlay(group, study.group, wireMaterial);
  const solids = [];
  study.group.traverse((obj) => {
    if (obj.isMesh || obj.isInstancedMesh) solids.push(obj);
  });
  return collectStudy(group, {
    family: familyId,
    solids,
    wires,
    geometries: [...study.geometries, ...geometries],
    materials: [...study.materials, wireMaterial],
  });
}

export function disposeStudy(study) {
  const geometries = [...new Set(study?.geometries || [])];
  const materials = [...new Set(study?.materials || [])];
  geometries.forEach((geometry) => geometry?.dispose?.());
  materials.forEach((material) => material?.dispose?.());
}
