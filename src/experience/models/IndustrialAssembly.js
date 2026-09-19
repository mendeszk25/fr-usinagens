import * as THREE from "three";
import { createMechanicalMaterials } from "../MechanicalMaterials.js";
import {
  addBoltCircle,
  addExternalSplines,
  addGroove,
  addMesh,
  collectStudy,
  cylinderX,
  ringX,
} from "../MechanicalDetails.js";
import { addCircumferentialGrooves, addRadialFasteners, helixTubeX } from "./ReferenceModelHelpers.js";

function boltCircleHoles(count, radius, holeRadius) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, radius: holeRadius };
  });
}

export function buildIndustrialAssembly(detail = "balanced", materials = createMechanicalMaterials()) {
  const group = new THREE.Group();
  group.name = "ReferenceIndustrialSpindleAssembly";
  const { machined, brushed, dark, blackened, raw, painted } = materials;

  const rearFlange = ringX({
    outer: 1.02,
    inner: 0.34,
    depth: 0.24,
    detail,
    bevel: 0.028,
    holes: boltCircleHoles(8, 0.77, 0.055),
  });
  addMesh(group, rearFlange, machined, { position: [-2.34, 0, 0], name: "rear-flange" });
  addBoltCircle(group, blackened, { centerX: -2.34, count: 8, radius: 0.77, boltRadius: 0.045, boltLength: 0.24, detail });

  addMesh(group, cylinderX(0.78, 1.34, detail), painted, { position: [-1.48, 0, 0], name: "painted-body" });
  addMesh(group, ringX({ outer: 0.90, inner: 0.33, depth: 0.20, detail, bevel: 0.020 }), raw, { position: [-0.72, 0, 0], name: "transition-ring" });
  addMesh(group, cylinderX(0.84, 0.70, detail), raw, { position: [-0.24, 0, 0], name: "bearing-housing" });
  addGroove(group, blackened, { x: -0.50, radius: 0.83, tube: 0.014 });
  addGroove(group, blackened, { x: -0.04, radius: 0.83, tube: 0.014 });

  addMesh(group, cylinderX(0.70, 0.82, detail), brushed, { position: [0.52, 0, 0], name: "grooved-section" });
  addCircumferentialGrooves(group, blackened, {
    centerX: 0.52,
    count: detail === "high" ? 7 : 6,
    spacing: 0.105,
    radius: 0.70,
    tube: 0.013,
  });

  addMesh(group, cylinderX(0.64, 0.28, detail), dark, { position: [1.08, 0, 0], name: "tooth-ring-core" });
  addExternalSplines(group, machined, {
    centerX: 1.08,
    length: 0.28,
    radius: 0.63,
    count: detail === "high" ? 30 : 24,
    toothWidth: 0.035,
    toothDepth: 0.055,
    chamfer: true,
  });

  const frontCollar = ringX({ outer: 0.70, inner: 0.29, depth: 0.40, detail, bevel: 0.020 });
  addMesh(group, frontCollar, raw, { position: [1.45, 0, 0], name: "front-collar" });
  addRadialFasteners(group, blackened, {
    centerX: 1.45,
    radius: 0.61,
    count: 6,
    shaftRadius: 0.028,
    shaftLength: 0.16,
    headRadius: 0.055,
    detail,
  });

  addMesh(group, cylinderX(0.49, 0.60, detail), dark, { position: [1.92, 0, 0], name: "thread-root" });
  const frontThread = helixTubeX({
    startX: 1.64,
    length: 0.57,
    radius: 0.515,
    turns: detail === "high" ? 7.5 : 6,
    tube: 0.022,
    segments: detail === "high" ? 230 : 170,
    radialSegments: detail === "high" ? 8 : 6,
  });
  addMesh(group, frontThread, machined, { name: "front-thread" });

  const frontHousing = ringX({ outer: 0.56, inner: 0.31, depth: 0.52, detail, bevel: 0.026 });
  addMesh(group, frontHousing, machined, { position: [2.48, 0, 0], name: "front-housing" });
  const boreSleeve = ringX({ outer: 0.33, inner: 0.255, depth: 0.60, detail, bevel: 0.010 });
  addMesh(group, boreSleeve, blackened, { position: [2.48, 0, 0], name: "internal-bore" });
  addGroove(group, blackened, { x: 2.23, radius: 0.555, tube: 0.012 });

  return collectStudy(group, {
    family: "industrialAssembly",
    materials: Object.values(materials),
  });
}
