import * as THREE from "three";
import { addMesh, cylinderX } from "../MechanicalDetails.js";

export function helixTubeX({
  startX = -0.8,
  length = 0.8,
  radius = 0.22,
  turns = 5,
  tube = 0.024,
  segments = 180,
  radialSegments = 8,
} = {}) {
  const points = [];
  const count = Math.max(48, segments);
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const angle = t * Math.PI * 2 * turns;
    points.push(new THREE.Vector3(
      startX + t * length,
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
    ));
  }
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.2);
  const geometry = new THREE.TubeGeometry(curve, count, tube, radialSegments, false);
  geometry.computeVertexNormals();
  return geometry;
}

export function addRadialFasteners(group, material, {
  centerX = 0,
  radius = 0.65,
  count = 6,
  shaftRadius = 0.035,
  shaftLength = 0.22,
  headRadius = 0.065,
  detail = "balanced",
} = {}) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const bolt = new THREE.Group();
    const shaft = addMesh(bolt, cylinderX(shaftRadius, shaftLength, detail, 20), material);
    shaft.rotation.z = Math.PI / 2;
    const headGeo = new THREE.CylinderGeometry(headRadius, headRadius, headRadius * 0.55, 6, 1, false);
    const head = addMesh(bolt, headGeo, material, { position: [0, shaftLength * 0.55, 0] });
    head.rotation.z = 0;
    bolt.position.set(centerX, Math.cos(angle) * radius, Math.sin(angle) * radius);
    bolt.rotation.x = angle - Math.PI / 2;
    group.add(bolt);
  }
}

export function addCircumferentialGrooves(group, material, {
  centerX = 0,
  count = 6,
  spacing = 0.11,
  radius = 0.64,
  tube = 0.012,
} = {}) {
  for (let i = 0; i < count; i += 1) {
    const x = centerX + (i - (count - 1) / 2) * spacing;
    const geometry = new THREE.TorusGeometry(radius, tube, 8, 72);
    geometry.rotateY(Math.PI / 2);
    addMesh(group, geometry, material, { position: [x, 0, 0], castShadow: false });
  }
}
