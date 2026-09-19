import * as THREE from "three";
import { createMechanicalMaterials } from "../MechanicalMaterials.js";
import {
  addMesh,
  addRadialTeeth,
  collectStudy,
  cylinderX,
  ringX,
  roundedBox,
} from "../MechanicalDetails.js";

export function buildGearShaft(detail = "balanced", materials = createMechanicalMaterials()) {
  const group = new THREE.Group();
  group.name = "ReferenceGearShaft";
  const { machined, brushed, dark, blackened, accent } = materials;

  addMesh(group, cylinderX(0.34, 2.65, detail), brushed, { position: [0.55, 0, 0], name: "main-shaft" });
  addMesh(group, cylinderX(0.39, 0.64, detail), machined, { position: [-1.05, 0, 0], name: "gear-seat" });
  addMesh(group, cylinderX(0.30, 0.56, detail), machined, { position: [2.10, 0, 0], name: "rear-journal" });
  addMesh(group, cylinderX(0.37, 0.16, detail), accent, { position: [1.75, 0, 0], name: "rear-shoulder" });

  const gearCore = ringX({ outer: 0.66, inner: 0.095, depth: 0.46, detail, bevel: 0.025 });
  addMesh(group, gearCore, machined, { position: [-1.64, 0, 0], name: "gear-core" });
  addRadialTeeth(group, machined, {
    centerX: -1.64,
    radius: 0.70,
    count: detail === "high" ? 18 : 16,
    length: 0.48,
    height: 0.18,
    width: detail === "high" ? 0.14 : 0.155,
  });

  const boreShade = ringX({ outer: 0.13, inner: 0.075, depth: 0.52, detail, bevel: 0.004 });
  addMesh(group, boreShade, blackened, { position: [-1.64, 0, 0], name: "gear-bore" });

  const keyway = roundedBox(0.66, 0.075, 0.18, detail, 0.025);
  addMesh(group, keyway, blackened, { position: [0.82, 0.325, 0], name: "keyway-recess" });
  const keywayLip = roundedBox(0.52, 0.02, 0.13, detail, 0.012);
  addMesh(group, keywayLip, dark, { position: [0.84, 0.356, 0], name: "keyway-shadow" });

  const seam = new THREE.TorusGeometry(0.342, 0.010, 8, 72);
  seam.rotateY(Math.PI / 2);
  addMesh(group, seam, blackened, { position: [1.65, 0, 0], castShadow: false, name: "transition-seam" });

  return collectStudy(group, {
    family: "gearShaft",
    materials: Object.values(materials),
  });
}
