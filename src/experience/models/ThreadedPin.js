import * as THREE from "three";
import { createMechanicalMaterials } from "../MechanicalMaterials.js";
import {
  addExternalSplines,
  addMesh,
  collectStudy,
  cylinderX,
  ringX,
} from "../MechanicalDetails.js";
import { helixTubeX } from "./ReferenceModelHelpers.js";

export function buildThreadedPin(detail = "balanced", materials = createMechanicalMaterials()) {
  const group = new THREE.Group();
  group.name = "ReferenceThreadedPin";
  const { machined, brushed, dark, blackened, accent } = materials;

  addMesh(group, cylinderX(0.38, 1.18, detail), brushed, { position: [-0.15, 0, 0], name: "main-body" });
  addMesh(group, cylinderX(0.27, 0.46, detail), machined, { position: [0.72, 0, 0], name: "neck" });
  addMesh(group, cylinderX(0.21, 0.62, detail), dark, { position: [-1.04, 0, 0], name: "thread-root" });

  const thread = helixTubeX({
    startX: -1.34,
    length: 0.78,
    radius: 0.235,
    turns: detail === "high" ? 8.5 : 7,
    tube: detail === "high" ? 0.030 : 0.028,
    segments: detail === "high" ? 260 : 190,
    radialSegments: detail === "high" ? 9 : 7,
  });
  addMesh(group, thread, machined, { name: "helical-thread" });

  const flangeA = ringX({ outer: 0.58, inner: 0.29, depth: 0.12, detail, bevel: 0.018 });
  addMesh(group, flangeA, accent, { position: [0.54, 0, 0], name: "front-flange" });
  const flangeB = ringX({ outer: 0.72, inner: 0.30, depth: 0.22, detail, bevel: 0.026 });
  addMesh(group, flangeB, machined, { position: [0.94, 0, 0], name: "rear-flange" });
  const collar = ringX({ outer: 0.48, inner: 0.27, depth: 0.18, detail, bevel: 0.014 });
  addMesh(group, collar, brushed, { position: [1.20, 0, 0], name: "rear-collar" });

  addMesh(group, cylinderX(0.24, 0.32, detail), dark, { position: [1.41, 0, 0], name: "knurl-core" });
  addExternalSplines(group, blackened, {
    centerX: 1.41,
    length: 0.30,
    radius: 0.235,
    count: detail === "high" ? 28 : 22,
    toothWidth: 0.032,
    toothDepth: 0.038,
    chamfer: true,
  });

  const endCap = new THREE.CylinderGeometry(0.19, 0.23, 0.12, 48, 1, false);
  endCap.rotateZ(Math.PI / 2);
  addMesh(group, endCap, machined, { position: [-1.48, 0, 0], name: "thread-tip" });

  return collectStudy(group, {
    family: "threadedPin",
    materials: Object.values(materials),
  });
}
