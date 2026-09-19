import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function segmentCount(detail, high = 144, balanced = 84) {
  return detail === "high" ? high : balanced;
}

export function cylinderX(radius, length, detail = "balanced", radialOverride = null) {
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    length,
    radialOverride || segmentCount(detail),
    1,
    false,
  );
  geometry.rotateZ(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

export function frustumX(radiusA, radiusB, length, detail = "balanced") {
  const geometry = new THREE.CylinderGeometry(
    radiusA,
    radiusB,
    length,
    segmentCount(detail),
    1,
    false,
  );
  geometry.rotateZ(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

export function addMesh(group, geometry, material, {
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  castShadow = true,
  receiveShadow = true,
  name = "",
} = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.fromArray(position);
  mesh.rotation.set(...rotation);
  mesh.scale.fromArray(scale);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  mesh.name = name;
  group.add(mesh);
  return mesh;
}

export function roundedBox(width, height, depth, detail = "balanced", radius = 0.06) {
  return new RoundedBoxGeometry(width, height, depth, detail === "high" ? 5 : 3, radius);
}

export function ringX({ outer = 0.8, inner = 0.38, depth = 0.4, detail = "balanced", bevel = 0.02, holes = [] } = {}) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const bore = new THREE.Path();
  bore.absarc(0, 0, inner, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  holes.forEach(({ x = 0, y = 0, radius = 0.06 }) => {
    const hole = new THREE.Path();
    hole.absarc(x, y, radius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  });
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSegments: detail === "high" ? 4 : 2,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: detail === "high" ? 72 : 42,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.rotateY(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

export function splineBoreX({
  outer = 0.82,
  boreRoot = 0.34,
  boreGroove = 0.41,
  splines = 18,
  depth = 1.1,
  detail = "balanced",
  bevel = 0.018,
  holes = [],
} = {}) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  const steps = splines * 4;
  for (let i = 0; i < steps; i += 1) {
    const radius = i % 4 === 1 || i % 4 === 2 ? boreGroove : boreRoot;
    const angle = -(i / steps) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  hole.closePath();
  shape.holes.push(hole);
  holes.forEach(({ x = 0, y = 0, radius = 0.06 }) => {
    const p = new THREE.Path();
    p.absarc(x, y, radius, 0, Math.PI * 2, true);
    shape.holes.push(p);
  });
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSegments: detail === "high" ? 4 : 2,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: detail === "high" ? 60 : 36,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.rotateY(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

export function addExternalSplines(group, material, {
  centerX = 0,
  length = 0.75,
  radius = 0.3,
  count = 20,
  toothWidth = 0.045,
  toothDepth = 0.07,
  chamfer = false,
} = {}) {
  const geometry = chamfer
    ? roundedBox(length, toothDepth, toothWidth, "balanced", Math.min(toothWidth * 0.28, 0.02))
    : new THREE.BoxGeometry(length, toothDepth, toothWidth);
  const instanced = new THREE.InstancedMesh(geometry, material, count);
  instanced.castShadow = true;
  instanced.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    dummy.position.set(
      centerX,
      Math.cos(angle) * (radius + toothDepth * 0.34),
      Math.sin(angle) * (radius + toothDepth * 0.34),
    );
    dummy.rotation.set(angle, 0, 0);
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);
  }
  instanced.instanceMatrix.needsUpdate = true;
  group.add(instanced);
  return instanced;
}

export function addRadialTeeth(group, material, {
  centerX = 0,
  radius = 0.75,
  count = 24,
  length = 0.35,
  height = 0.16,
  width = 0.095,
  coneTilt = 0,
} = {}) {
  const geometry = roundedBox(length, height, width, "balanced", 0.018);
  const instanced = new THREE.InstancedMesh(geometry, material, count);
  instanced.castShadow = true;
  instanced.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    dummy.position.set(centerX, Math.cos(angle) * radius, Math.sin(angle) * radius);
    dummy.rotation.set(angle, 0, coneTilt);
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);
  }
  instanced.instanceMatrix.needsUpdate = true;
  group.add(instanced);
  return instanced;
}

export function socketBolt(material, { radius = 0.065, length = 0.32, detail = "balanced" } = {}) {
  const group = new THREE.Group();
  addMesh(group, cylinderX(radius * 0.62, length, detail, 24), material, { position: [length * 0.18, 0, 0] });
  const head = new THREE.CylinderGeometry(radius, radius, radius * 0.72, 6, 1, false);
  head.rotateZ(Math.PI / 2);
  addMesh(group, head, material, { position: [-length * 0.38, 0, 0] });
  return group;
}

export function hexBolt(material, { radius = 0.075, length = 0.34, detail = "balanced" } = {}) {
  const group = new THREE.Group();
  addMesh(group, cylinderX(radius * 0.52, length, detail, 24), material, { position: [length * 0.18, 0, 0] });
  const head = new THREE.CylinderGeometry(radius, radius, radius * 0.66, 6, 1, false);
  head.rotateZ(Math.PI / 2);
  addMesh(group, head, material, { position: [-length * 0.38, 0, 0] });
  return group;
}

export function washer(material, { outer = 0.10, inner = 0.052, depth = 0.028, detail = "balanced" } = {}) {
  return addMesh(new THREE.Group(), ringX({ outer, inner, depth, detail, bevel: 0.004 }), material);
}

export function addBoltCircle(group, material, {
  centerX = 0,
  count = 6,
  radius = 0.62,
  boltRadius = 0.06,
  boltLength = 0.30,
  detail = "balanced",
} = {}) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const bolt = socketBolt(material, { radius: boltRadius, length: boltLength, detail });
    bolt.position.set(centerX, Math.cos(angle) * radius, Math.sin(angle) * radius);
    group.add(bolt);
  }
}

export function addGroove(group, material, { x = 0, radius = 0.4, tube = 0.016, segments = 72 } = {}) {
  const geometry = new THREE.TorusGeometry(radius, tube, 8, segments);
  geometry.rotateY(Math.PI / 2);
  return addMesh(group, geometry, material, { position: [x, 0, 0], castShadow: false });
}

export function collectStudy(group, extras = {}) {
  const geometries = [];
  const materials = [];
  group.traverse((object) => {
    if (object.geometry && !geometries.includes(object.geometry)) geometries.push(object.geometry);
    const mats = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    mats.forEach((material) => {
      if (!materials.includes(material)) materials.push(material);
    });
  });
  (extras.geometries || []).forEach((geometry) => {
    if (!geometries.includes(geometry)) geometries.push(geometry);
  });
  (extras.materials || []).forEach((material) => {
    if (!materials.includes(material)) materials.push(material);
  });
  return { ...extras, group, geometries, materials };
}
