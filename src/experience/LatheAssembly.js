import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createMachinedMaterial, createCastIronMaterial } from "./MachinedMaterial.js";
import { latheParts } from "../data/latheParts.js";
import { partPose, range } from "./animation.js";

const PI2 = Math.PI * 2;

export function createLatheAssembly({ lowPower = false, mobile = false, materialDetail = "high" } = {}) {
  const root = new THREE.Group();
  root.name = "UniversalHorizontalLathe";

  const geometries = new Map();
  const materials = new Map();
  const nodeMap = new Map();
  const partMaterials = new Map();
  const toolPostBolts = [];

  const palette = {
    castIron: { color: "#39443f", metalness: 0.7, roughness: 0.62 },
    castIronDark: { color: "#222a28", metalness: 0.66, roughness: 0.68 },
    castIronMid: { color: "#46514b", metalness: 0.68, roughness: 0.58 },
    machined: { color: "#aab3b7", metalness: 0.97, roughness: 0.29 },
    polished: { color: "#c4cbce", metalness: 1, roughness: 0.22 },
    darkSteel: { color: "#4b5559", metalness: 0.91, roughness: 0.42 },
    toolSteel: { color: "#6f797d", metalness: 0.95, roughness: 0.31 },
    blackSteel: { color: "#171d1f", metalness: 0.78, roughness: 0.55 },
    brass: { color: "#756b50", metalness: 0.76, roughness: 0.43 },
    insert: { color: "#b5aa7b", metalness: 0.7, roughness: 0.35 },
  };

  function rememberMaterial(partId, mat) {
    if (!partMaterials.has(partId)) partMaterials.set(partId, new Set());
    partMaterials.get(partId).add(mat);
    return mat;
  }

  function material(partId, type = "castIron", finish = "plain") {
    const key = `${partId}-${type}-${finish}`;
    if (materials.has(key)) return materials.get(key);
    const props = palette[type] || palette.castIron;
    const shouldMachine = ["machined", "polished", "darkSteel", "toolSteel"].includes(type);
    const shouldCast = type.startsWith("castIron");
    const mat = lowPower && (shouldMachine || shouldCast)
      ? new THREE.MeshStandardMaterial(props)
      : shouldMachine
        ? createMachinedMaterial(props, finish === "plain" ? "turned" : finish, { mobile, detail: materialDetail })
        : shouldCast
          ? createCastIronMaterial(props, { mobile, detail: materialDetail })
          : new THREE.MeshStandardMaterial(props);
    const baseEnvIntensity = shouldCast ? (mobile ? 0.62 : 0.54) : (mobile ? 0.96 : 0.88);
    mat.envMapIntensity = baseEnvIntensity;
    mat.userData.baseEnvIntensity = baseEnvIntensity;
    materials.set(key, mat);
    return rememberMaterial(partId, mat);
  }

  function geometry(key, factory) {
    if (!geometries.has(key)) geometries.set(key, factory());
    return geometries.get(key);
  }

  function box(w, h, d, radius = 0.045, segments = lowPower ? 2 : mobile ? 3 : 4) {
    const key = `box-${w}-${h}-${d}-${radius}-${segments}`;
    return geometry(key, () =>
      new RoundedBoxGeometry(
        w,
        h,
        d,
        segments,
        Math.min(radius, w / 4, h / 4, d / 4),
      ),
    );
  }

  function cylinderX(radius, length, segments = lowPower ? 22 : mobile ? 34 : 44) {
    return geometry(`cx-${radius}-${length}-${segments}`, () => {
      const g = new THREE.CylinderGeometry(radius, radius, length, segments);
      g.rotateZ(Math.PI / 2);
      return g;
    });
  }

  function cylinderY(radius, length, segments = lowPower ? 20 : mobile ? 30 : 36) {
    return geometry(`cy-${radius}-${length}-${segments}`, () =>
      new THREE.CylinderGeometry(radius, radius, length, segments),
    );
  }

  function cylinderZ(radius, length, segments = lowPower ? 20 : mobile ? 30 : 36) {
    return geometry(`cz-${radius}-${length}-${segments}`, () => {
      const g = new THREE.CylinderGeometry(radius, radius, length, segments);
      g.rotateX(Math.PI / 2);
      return g;
    });
  }

  function coneX(radius, length, segments = lowPower ? 18 : mobile ? 26 : 32) {
    return geometry(`conex-${radius}-${length}-${segments}`, () => {
      const g = new THREE.ConeGeometry(radius, length, segments);
      g.rotateZ(-Math.PI / 2);
      return g;
    });
  }

  function ringX(outer, inner, length, segments = lowPower ? 24 : mobile ? 36 : 48) {
    return geometry(`ringx-${outer}-${inner}-${length}-${segments}`, () => {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, outer, 0, PI2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, inner, 0, PI2, true);
      shape.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(shape, {
        depth: length,
        bevelEnabled: true,
        bevelSegments: 1,
        bevelSize: 0.01,
        bevelThickness: 0.01,
        curveSegments: Math.max(12, Math.floor(segments / 2)),
      });
      g.translate(0, 0, -length / 2);
      g.rotateY(Math.PI / 2);
      g.computeVertexNormals();
      return g;
    });
  }

  function torusX(radius, tube, segments = lowPower ? 20 : mobile ? 32 : 40) {
    return geometry(`tx-${radius}-${tube}-${segments}`, () => {
      const g = new THREE.TorusGeometry(radius, tube, 8, segments);
      g.rotateY(Math.PI / 2);
      return g;
    });
  }

  function torusY(radius, tube, segments = lowPower ? 20 : mobile ? 32 : 40) {
    return geometry(`ty-${radius}-${tube}-${segments}`, () => {
      const g = new THREE.TorusGeometry(radius, tube, 8, segments);
      g.rotateX(Math.PI / 2);
      return g;
    });
  }

  function torusZ(radius, tube, segments = lowPower ? 20 : mobile ? 32 : 40) {
    return geometry(
      `tz-${radius}-${tube}-${segments}`,
      () => new THREE.TorusGeometry(radius, tube, 8, segments),
    );
  }

  function mesh(
    group,
    geo,
    mat,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    { castShadow = true, receiveShadow = true } = {},
  ) {
    const object = new THREE.Mesh(geo, mat);
    object.position.fromArray(position);
    object.rotation.set(...rotation);
    object.scale.fromArray(scale);
    object.castShadow = castShadow;
    object.receiveShadow = receiveShadow;
    group.add(object);
    return object;
  }

  function register(id, parent = root) {
    const group = new THREE.Group();
    group.name = id;
    parent.add(group);
    nodeMap.set(id, group);
    return group;
  }

  function smallBolt(group, partId, position, axis = "z", scale = 1) {
    const bolt = new THREE.Group();
    bolt.position.fromArray(position);
    group.add(bolt);
    const shaft = 0.035 * scale;
    const head = 0.068 * scale;
    const length = 0.1 * scale;
    if (axis === "y") {
      mesh(bolt, cylinderY(shaft, length, 14), material(partId, "darkSteel"), [0, 0, 0]);
      mesh(bolt, cylinderY(head, 0.045 * scale, 6), material(partId, "machined"), [0, length * 0.58, 0], [0, Math.PI / 6, 0]);
    } else if (axis === "x") {
      mesh(bolt, cylinderX(shaft, length, 14), material(partId, "darkSteel"), [0, 0, 0]);
      mesh(bolt, cylinderX(head, 0.045 * scale, 6), material(partId, "machined"), [length * 0.58, 0, 0], [Math.PI / 6, 0, 0]);
    } else {
      mesh(bolt, cylinderZ(shaft, length, 14), material(partId, "darkSteel"), [0, 0, 0]);
      mesh(bolt, cylinderZ(head, 0.045 * scale, 6), material(partId, "machined"), [0, 0, length * 0.58], [0, 0, Math.PI / 6]);
    }
    return bolt;
  }

  function createHandwheel(
    parent,
    partId,
    { position = [0, 0, 0], radius = 0.28, axis = "z", handle = true } = {},
  ) {
    const group = new THREE.Group();
    group.position.fromArray(position);
    parent.add(group);
    const ringGeo = axis === "x" ? torusX(radius, 0.035) : axis === "y" ? torusY(radius, 0.035) : torusZ(radius, 0.035);
    mesh(group, ringGeo, material(partId, "darkSteel"));

    if (axis === "x") {
      mesh(group, cylinderX(radius * 0.23, 0.12), material(partId, "machined"));
      for (let i = 0; i < 3; i++) {
        const a = (i * PI2) / 3;
        mesh(
          group,
          box(0.07, radius * 0.88, 0.055, 0.012, 2),
          material(partId, "darkSteel"),
          [0, Math.cos(a) * radius * 0.43, Math.sin(a) * radius * 0.43],
          [a, 0, 0],
        );
      }
      if (handle) {
        mesh(group, cylinderX(0.045, 0.19, 16), material(partId, "machined"), [0.08, radius * 0.86, 0]);
      }
    } else {
      mesh(group, cylinderZ(radius * 0.23, 0.12), material(partId, "machined"));
      for (let i = 0; i < 3; i++) {
        const a = (i * PI2) / 3;
        const r = radius * 0.43;
        mesh(
          group,
          box(0.055, radius * 0.88, 0.07, 0.012, 2),
          material(partId, "darkSteel"),
          [Math.cos(a) * r, Math.sin(a) * r, 0],
          [0, 0, -a],
        );
      }
      if (handle) {
        mesh(group, cylinderZ(0.045, 0.19, 16), material(partId, "machined"), [radius * 0.86, 0, 0.08]);
      }
    }
    return group;
  }

  function selectorLever(parent, partId, position, length = 0.22, angle = -0.28) {
    const lever = new THREE.Group();
    lever.position.fromArray(position);
    lever.rotation.x = angle;
    parent.add(lever);
    mesh(lever, cylinderZ(0.032, length, 14), material(partId, "darkSteel"), [0, 0, length * 0.45]);
    mesh(lever, cylinderZ(0.065, 0.08, 18), material(partId, "machined"), [0, 0, length]);
    return lever;
  }

  // -------------------------------------------------------------------------
  // BASE + BARRAMENTO — a massa estrutural que permanece como datum visual.
  // -------------------------------------------------------------------------
  const bed = register("bed");
  const bedDark = material("bed", "castIronDark");
  const bedIron = material("bed", "castIron");
  const bedMid = material("bed", "castIronMid");
  const bedMachined = material("bed", "machined", "linear");

  // Lower ribbed bed and upper ways. Layering avoids a single-box silhouette.
  mesh(bed, box(8.9, 0.36, 1.72, 0.08), bedDark, [0, -0.42, 0]);
  mesh(bed, box(8.7, 0.23, 1.46, 0.055), bedIron, [0, -0.12, 0]);
  mesh(bed, box(8.48, 0.16, 1.3, 0.035), bedMid, [0, 0.07, 0]);
  mesh(bed, box(8.38, 0.11, 0.23, 0.022), bedMachined, [0, 0.18, 0.51]);
  mesh(bed, box(8.38, 0.11, 0.23, 0.022), bedMachined, [0, 0.18, -0.51]);
  mesh(bed, box(8.26, 0.075, 0.23, 0.018), material("bed", "darkSteel"), [0, 0.11, 0]);
  // V-way suggestions along the top.
  mesh(bed, box(8.22, 0.08, 0.12, 0.012, 2), bedMachined, [0, 0.24, 0.31], [0.08, 0, 0]);
  mesh(bed, box(8.22, 0.08, 0.12, 0.012, 2), bedMachined, [0, 0.24, -0.31], [-0.08, 0, 0]);

  // Chip tray underneath the work area.
  mesh(bed, box(6.3, 0.1, 1.92, 0.035), material("bed", "blackSteel"), [0.25, -0.78, 0]);
  mesh(bed, box(6.0, 0.035, 1.64, 0.01, 1), material("bed", "castIronMid"), [0.25, -0.71, 0]);

  // Two substantial cast pedestals, with recessed access panels and feet.
  for (const [x, width] of [[-3.28, 1.42], [3.05, 1.3]]) {
    mesh(bed, box(width, 1.18, 1.5, 0.11), bedDark, [x, -1.06, 0]);
    mesh(bed, box(width * 0.82, 0.74, 0.055, 0.03), material("bed", "blackSteel"), [x, -1.02, 0.78]);
    mesh(bed, box(width + 0.2, 0.13, 1.68, 0.04), bedIron, [x, -1.7, 0]);
    mesh(bed, box(width * 0.86, 0.12, 1.42, 0.035), bedMid, [x, -0.48, 0]);
    for (const dx of [-0.42, 0.42]) smallBolt(bed, "bed", [x + dx * (width / 1.42), -0.72, 0.82], "z", 0.82);
  }

  // Recessed ribs between pedestal and bed, visible in a 3/4 view.
  for (const x of [-2.55, -2.1, 2.22, 2.62]) {
    mesh(bed, box(0.12, 0.52, 1.35, 0.025), bedMid, [x, -0.74, 0]);
  }

  // Rack teeth under the operator-side guide: one draw call instead of dozens.
  const rackGeo = box(0.075, 0.085, 0.13, 0.01, 2);
  const rackCount = lowPower ? 44 : 72;
  const rack = new THREE.InstancedMesh(rackGeo, material("bed", "darkSteel"), rackCount);
  const rackMatrix = new THREE.Matrix4();
  const rackQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.12));
  const rackScale = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < rackCount; i++) {
    rackMatrix.compose(
      new THREE.Vector3(-3.9 + i * (7.8 / (rackCount - 1)), -0.29, 0.81),
      rackQuat,
      rackScale,
    );
    rack.setMatrixAt(i, rackMatrix);
  }
  rack.castShadow = true;
  rack.receiveShadow = true;
  bed.add(rack);

  // -------------------------------------------------------------------------
  // FEED ASSEMBLY — lead screw, feed rod and supports.
  // -------------------------------------------------------------------------
  const feedAssembly = register("feedAssembly");
  const feedMat = material("feedAssembly", "machined", "linear");
  const feedDark = material("feedAssembly", "darkSteel");
  mesh(feedAssembly, cylinderX(0.052, 7.95, lowPower ? 26 : 52), feedMat, [0, 0.03, 0]);
  mesh(feedAssembly, cylinderX(0.043, 7.82, lowPower ? 24 : 48), feedDark, [0, -0.15, -0.08]);
  // Thread cue as spaced rings around the lead screw, kept restrained for web.
  const threadCount = lowPower ? 20 : 38;
  const threadGeo = torusX(0.057, 0.006, 18);
  for (let i = 0; i < threadCount; i++) {
    const x = -3.62 + i * (7.24 / (threadCount - 1));
    mesh(feedAssembly, threadGeo, feedDark, [x, 0.03, 0]);
  }
  for (const x of [-3.76, -2.05, 0.05, 2.15, 3.76]) {
    mesh(feedAssembly, box(0.14, 0.34, 0.28, 0.03), material("feedAssembly", "castIronDark"), [x, -0.05, -0.01]);
    mesh(feedAssembly, ringX(0.09, 0.055, 0.17, 28), feedMat, [x + 0.02, 0.03, 0]);
  }

  // -------------------------------------------------------------------------
  // HEADSTOCK / CABEÇOTE + NORTON-STYLE SELECTOR LANGUAGE.
  // -------------------------------------------------------------------------
  const headstock = register("headstock");
  const headIron = material("headstock", "castIron");
  const headDark = material("headstock", "castIronDark");
  const headMid = material("headstock", "castIronMid");
  const headMachined = material("headstock", "machined");

  mesh(headstock, box(1.82, 1.44, 1.54, 0.14), headIron, [-0.08, 0.46, 0]);
  mesh(headstock, box(1.98, 0.22, 1.68, 0.065), headDark, [-0.04, -0.31, 0]);
  mesh(headstock, box(1.56, 0.24, 1.42, 0.065), headDark, [-0.16, 1.22, 0]);
  mesh(headstock, box(1.32, 0.18, 1.26, 0.05), headMid, [0.05, 1.41, 0]);
  // Side ribs and inspection bosses produce the cast-housing silhouette.
  mesh(headstock, box(0.18, 1.04, 1.58, 0.045), headMid, [-0.83, 0.48, 0]);
  mesh(headstock, box(0.18, 0.78, 1.6, 0.045), headMid, [0.75, 0.42, 0]);
  mesh(headstock, cylinderX(0.5, 0.22, 52), headDark, [0.86, 0.82, 0]);
  mesh(headstock, cylinderX(0.38, 0.16, 48), headMachined, [0.99, 0.82, 0]);
  mesh(headstock, cylinderX(0.35, 0.13, 42), material("headstock", "darkSteel"), [-0.98, 0.82, 0]);

  // Front gearbox / selector panel on operator side.
  const norton = new THREE.Group();
  norton.name = "NortonSelectorPanel";
  norton.position.set(-0.32, 0.35, 0.79);
  headstock.add(norton);
  mesh(norton, box(0.92, 0.74, 0.06, 0.045), material("headstock", "blackSteel"));
  mesh(norton, box(0.82, 0.63, 0.025, 0.02, 2), headMid, [0, 0, 0.045]);
  for (const p of [[-0.25, 0.2, 0.08], [0.05, 0.2, 0.08], [0.28, -0.14, 0.08]]) {
    selectorLever(norton, "headstock", p, 0.2, -0.18);
  }
  for (const [x, y] of [[-0.3, -0.2], [-0.04, -0.2], [0.22, 0.2], [0.3, -0.3]]) {
    mesh(norton, cylinderZ(0.055, 0.08, 20), headMachined, [x, y, 0.11]);
    mesh(norton, cylinderZ(0.09, 0.035, 24), material("headstock", "darkSteel"), [x, y, 0.15]);
  }
  for (const [x, y] of [[-0.39, 0.28], [0.39, 0.28], [-0.39, -0.28], [0.39, -0.28]]) {
    smallBolt(norton, "headstock", [x, y, 0.095], "z", 0.7);
  }

  // Rear/top selector shafts and caps.
  for (const [x, y, z] of [[-0.55, 1.03, 0.64], [0.05, 1.07, 0.68], [0.49, 0.98, 0.62]]) {
    mesh(headstock, cylinderZ(0.052, 0.18, 18), material("headstock", "darkSteel"), [x, y, z]);
    mesh(headstock, cylinderZ(0.1, 0.055, 24), headMachined, [x, y, z + 0.12]);
  }
  createHandwheel(headstock, "headstock", { position: [-0.92, 0.18, 0.2], radius: 0.2, axis: "x", handle: false });

  const spindle = register("spindle", headstock);
  mesh(spindle, cylinderX(0.19, 0.8, 54), material("spindle", "machined"), [0, 0, 0]);
  mesh(spindle, cylinderX(0.245, 0.22, 50), material("spindle", "darkSteel"), [0.34, 0, 0]);
  mesh(spindle, ringX(0.3, 0.19, 0.18, 50), material("spindle", "machined"), [0.47, 0, 0]);
  mesh(spindle, torusX(0.255, 0.016, 48), material("spindle", "polished"), [0.57, 0, 0]);

  // -------------------------------------------------------------------------
  // CHUCK / PLACA UNIVERSAL DE 3 CASTANHAS.
  // -------------------------------------------------------------------------
  const chuck = register("chuck", headstock);
  const chuckDark = material("chuck", "darkSteel");
  const chuckMachined = material("chuck", "machined");
  const chuckBlack = material("chuck", "blackSteel");
  mesh(chuck, cylinderX(0.86, 0.44, lowPower ? 42 : 72), chuckDark, [0, 0, 0]);
  mesh(chuck, cylinderX(0.78, 0.18, lowPower ? 42 : 72), chuckMachined, [0.22, 0, 0]);
  mesh(chuck, ringX(0.68, 0.2, 0.12, 58), chuckDark, [0.33, 0, 0]);
  mesh(chuck, ringX(0.58, 0.17, 0.055, 54), chuckMachined, [0.397, 0, 0]);
  mesh(chuck, torusX(0.73, 0.014, 52), material("chuck", "polished"), [0.395, 0, 0]);
  mesh(chuck, torusX(0.47, 0.009, 48), chuckBlack, [0.43, 0, 0]);

  // Radial jaw guide slots on front face and wrench sockets.
  for (let i = 0; i < 3; i++) {
    const a = (i * PI2) / 3;
    const y = Math.cos(a) * 0.43;
    const z = Math.sin(a) * 0.43;
    mesh(chuck, box(0.055, 0.17, 0.58, 0.012, 2), chuckBlack, [0.43, y * 0.2, z * 0.2], [a, 0, 0]);
    mesh(chuck, cylinderX(0.064, 0.055, 18), chuckBlack, [0.44, y, z]);
    mesh(chuck, cylinderX(0.032, 0.075, 12), chuckMachined, [0.47, y, z]);
  }

  function buildJaw(id) {
    const jaw = register(id, chuck);
    const dark = material(id, "darkSteel");
    const machined = material(id, "machined");
    const black = material(id, "blackSteel");
    // Base tongue, body and stepped gripping face.
    mesh(jaw, box(0.38, 0.18, 0.27, 0.025), dark, [-0.02, -0.055, 0]);
    mesh(jaw, box(0.35, 0.21, 0.3, 0.032), dark, [0.02, 0.08, 0]);
    mesh(jaw, box(0.3, 0.13, 0.25, 0.022), machined, [0.13, 0.18, 0]);
    mesh(jaw, box(0.24, 0.09, 0.21, 0.018), machined, [0.17, 0.28, 0]);
    // Serration cue on the gripping surface.
    for (const yy of [0.235, 0.275, 0.315]) {
      mesh(jaw, box(0.22, 0.018, 0.19, 0.004, 1), black, [0.18, yy, 0]);
    }
    return jaw;
  }
  buildJaw("jaw01");
  buildJaw("jaw02");
  buildJaw("jaw03");

  // -------------------------------------------------------------------------
  // CARRIAGE / APRON / CROSS SLIDE / COMPOUND.
  // -------------------------------------------------------------------------
  const carriage = register("carriage");
  const carriageIron = material("carriage", "castIron");
  const carriageDark = material("carriage", "castIronDark");
  const carriageMachined = material("carriage", "machined", "linear");
  mesh(carriage, box(1.62, 0.25, 1.78, 0.07), carriageIron, [0, 0, 0]);
  mesh(carriage, box(1.34, 0.15, 1.92, 0.045), carriageMachined, [0.02, 0.18, 0]);
  // Saddle wings that visibly wrap the ways.
  mesh(carriage, box(0.28, 0.34, 1.64, 0.05), carriageDark, [-0.61, -0.08, 0]);
  mesh(carriage, box(0.28, 0.34, 1.64, 0.05), carriageDark, [0.61, -0.08, 0]);
  // Apron on operator side.
  mesh(carriage, box(1.22, 0.72, 0.36, 0.065), carriageDark, [0, -0.28, 0.83]);
  mesh(carriage, box(1.05, 0.56, 0.055, 0.035), material("carriage", "castIronMid"), [0, -0.27, 1.025]);
  mesh(carriage, box(0.72, 0.13, 0.06, 0.02), material("carriage", "blackSteel"), [0.08, -0.03, 1.065]);
  createHandwheel(carriage, "carriage", { position: [0.3, -0.24, 1.12], radius: 0.28, axis: "z" });
  createHandwheel(carriage, "carriage", { position: [-0.38, -0.22, 1.1], radius: 0.15, axis: "z", handle: false });
  selectorLever(carriage, "carriage", [0.48, -0.46, 1.08], 0.18, -0.4);
  for (const [x, y] of [[-0.44, 0.02], [-0.06, 0.02], [0.46, 0.02]]) {
    mesh(carriage, cylinderZ(0.055, 0.075, 18), carriageMachined, [x, y - 0.27, 1.07]);
  }

  const crossSlide = register("crossSlide", carriage);
  const crossIron = material("crossSlide", "castIron");
  const crossMachined = material("crossSlide", "machined", "linear");
  mesh(crossSlide, box(1.16, 0.27, 1.26, 0.055), crossIron, [0, 0, 0]);
  mesh(crossSlide, box(0.96, 0.075, 1.08, 0.02), crossMachined, [0, 0.17, 0]);
  mesh(crossSlide, box(0.88, 0.1, 0.2, 0.018), material("crossSlide", "darkSteel"), [0, 0.05, 0.53]);
  mesh(crossSlide, cylinderZ(0.072, 0.3, 22), crossMachined, [-0.66, 0.01, 0.67]);
  createHandwheel(crossSlide, "crossSlide", { position: [-0.66, 0.01, 0.9], radius: 0.15, axis: "z" });
  smallBolt(crossSlide, "crossSlide", [0.43, 0.18, 0.48], "y", 0.72);

  const compound = register("compound", crossSlide);
  const compoundDark = material("compound", "darkSteel");
  const compoundIron = material("compound", "castIron");
  mesh(compound, cylinderY(0.47, 0.095, lowPower ? 34 : 56), compoundDark, [0, -0.02, 0]);
  mesh(compound, cylinderY(0.4, 0.035, lowPower ? 32 : 52), material("compound", "machined"), [0, 0.05, 0]);
  // Tick blocks around the rotating base, readable as a scale without fake numbers.
  for (let i = 0; i < 12; i++) {
    const a = (i * PI2) / 12;
    mesh(
      compound,
      box(0.018, 0.045, 0.085, 0.003, 1),
      material("compound", "machined"),
      [Math.cos(a) * 0.42, 0.085, Math.sin(a) * 0.42],
      [0, -a, 0],
    );
  }
  mesh(compound, box(0.8, 0.2, 0.74, 0.045), compoundIron, [0, 0.12, 0]);
  mesh(compound, box(0.68, 0.065, 0.62, 0.018), material("compound", "machined", "linear"), [0.02, 0.24, 0]);
  mesh(compound, cylinderZ(0.05, 0.24, 18), material("compound", "machined"), [0.45, 0.13, 0.34]);
  createHandwheel(compound, "compound", { position: [0.45, 0.13, 0.53], radius: 0.12, axis: "z", handle: false });

  // -------------------------------------------------------------------------
  // TOOL POST — deliberately echoes the workshop reference: four tall bolts,
  // solid square tower, machined tops and a clearly clamped cutting tool.
  // -------------------------------------------------------------------------
  const toolPost = register("toolPost", compound);
  const postDark = material("toolPost", "darkSteel");
  const postMachined = material("toolPost", "machined");
  const postBlack = material("toolPost", "blackSteel");
  mesh(toolPost, cylinderY(0.36, 0.1, 44), postDark, [0, -0.06, 0]);
  mesh(toolPost, box(0.62, 0.42, 0.62, 0.055), postDark, [0, 0.15, 0]);
  mesh(toolPost, box(0.55, 0.09, 0.55, 0.025), postMachined, [0, 0.41, 0]);
  mesh(toolPost, box(0.76, 0.18, 0.16, 0.025), postBlack, [0.05, 0.22, 0.33]);
  mesh(toolPost, cylinderY(0.12, 0.62, 30), postMachined, [0, 0.36, 0]);
  mesh(toolPost, cylinderY(0.2, 0.08, 34), postDark, [0, 0.72, 0]);

  for (const [x, z] of [[-0.23, -0.23], [0.23, -0.23], [-0.23, 0.23], [0.23, 0.23]]) {
    const bolt = new THREE.Group();
    bolt.position.set(x, 0.42, z);
    bolt.userData.baseY = 0.42;
    toolPost.add(bolt);
    toolPostBolts.push(bolt);
    mesh(bolt, cylinderY(0.05, 0.52, 18), postDark, [0, 0, 0]);
    // Visible thread cue near the upper half, inspired by the real reference.
    for (let i = 0; i < (lowPower ? 3 : 5); i++) {
      mesh(bolt, torusY(0.055, 0.007, 18), postBlack, [0, 0.08 + i * 0.045, 0]);
    }
    mesh(bolt, cylinderY(0.1, 0.1, 6), postMachined, [0, 0.32, 0], [0, Math.PI / 6, 0]);
    mesh(bolt, cylinderY(0.075, 0.045, 6), postDark, [0, 0.39, 0], [0, Math.PI / 6, 0]);
  }

  const cuttingTool = register("cuttingTool", toolPost);
  mesh(cuttingTool, box(0.84, 0.11, 0.13, 0.016, 2), material("cuttingTool", "toolSteel"), [-0.02, 0, 0], [0, -0.09, 0]);
  mesh(cuttingTool, box(0.19, 0.075, 0.19, 0.012, 1), material("cuttingTool", "insert"), [0.44, 0.005, -0.055], [0, 0.28, 0.1]);
  smallBolt(cuttingTool, "cuttingTool", [0.31, 0.075, -0.02], "y", 0.56);

  // -------------------------------------------------------------------------
  // TAILSTOCK / CONTRAPONTO.
  // -------------------------------------------------------------------------
  const tailstock = register("tailstock");
  const tailIron = material("tailstock", "castIron");
  const tailDark = material("tailstock", "castIronDark");
  const tailMid = material("tailstock", "castIronMid");
  mesh(tailstock, box(1.32, 0.24, 1.38, 0.07), tailDark, [0, 0, 0]);
  mesh(tailstock, box(1.16, 0.22, 1.22, 0.06), tailMid, [0.02, 0.18, 0]);
  mesh(tailstock, box(1.08, 0.68, 1.08, 0.11), tailIron, [0.08, 0.52, 0]);
  mesh(tailstock, box(0.82, 0.62, 0.92, 0.1), tailIron, [-0.2, 0.97, 0]);
  mesh(tailstock, box(0.6, 0.22, 0.84, 0.06), tailMid, [-0.38, 1.36, 0]);
  mesh(tailstock, cylinderX(0.39, 0.36, 48), tailDark, [-0.5, 0.87, 0]);
  mesh(tailstock, cylinderX(0.29, 0.12, 44), material("tailstock", "machined"), [-0.7, 0.87, 0]);
  // Locking lever and clamp details.
  selectorLever(tailstock, "tailstock", [0.24, 1.25, 0.5], 0.22, -0.25);
  mesh(tailstock, cylinderY(0.055, 0.42, 18), material("tailstock", "darkSteel"), [0.36, 0.3, 0.58]);
  mesh(tailstock, cylinderY(0.11, 0.06, 22), material("tailstock", "machined"), [0.36, 0.54, 0.58]);
  for (const [x, z] of [[-0.38, 0.54], [0.42, 0.54], [-0.38, -0.54], [0.42, -0.54]]) {
    smallBolt(tailstock, "tailstock", [x, 0.25, z], "y", 0.72);
  }

  const quill = register("quill", tailstock);
  mesh(quill, cylinderX(0.205, 0.88, 52), material("quill", "machined"), [0, 0, 0]);
  mesh(quill, cylinderX(0.145, 0.2, 40), material("quill", "darkSteel"), [-0.48, 0, 0]);
  mesh(quill, coneX(0.145, 0.39, 36), material("quill", "polished"), [-0.7, 0, 0]);
  mesh(quill, torusX(0.18, 0.012, 38), material("quill", "darkSteel"), [0.4, 0, 0]);

  const tailstockHandle = register("tailstockHandle", tailstock);
  const handleWheel = createHandwheel(tailstockHandle, "tailstockHandle", {
    position: [0, 0, 0],
    radius: 0.37,
    axis: "x",
  });
  handleWheel.rotation.x = 0.08;
  mesh(tailstockHandle, cylinderX(0.11, 0.23, 28), material("tailstockHandle", "machined"), [-0.02, 0, 0]);

  // Controlled workshop cues: a few curled chips, never a particle effect.
  const chipMat = material("bed", "machined");
  const chipGeo = geometry("chip", () => new THREE.TorusGeometry(0.055, 0.008, 5, 14, Math.PI * 1.5));
  for (const [x, y, z, rz] of [
    [-0.82, 0.24, -0.62, 0.7],
    [-0.56, 0.24, -0.69, -0.4],
    [-0.28, 0.24, -0.58, 0.2],
    [0.04, 0.24, -0.66, 1.1],
    [0.28, 0.24, -0.6, -0.65],
  ]) {
    mesh(bed, chipGeo, chipMat, [x, y, z], [Math.PI / 2, 0, rz], [1, 1, 1], { castShadow: false });
  }

  // Apply the configured assembled datum to every animated group.
  const parts = latheParts.map((data) => {
    const group = nodeMap.get(data.id);
    if (!group) throw new Error(`Lathe node not found: ${data.id}`);
    group.position.fromArray(data.position);
    group.rotation.set(...data.rotation);
    return {
      data,
      group,
      pose: {},
      materials: [...(partMaterials.get(data.id) || [])],
    };
  });

  // The opening frame is intentionally larger than the previous iteration.
  // Camera framing supplies the remaining scale so responsive breakpoints do
  // not rely on a blunt CSS/model scale reduction.
  root.scale.setScalar(1.04);
  root.position.set(0.1, -0.02, 0);

  const normalEmissive = new THREE.Color("#000000");
  const highlight = new THREE.Color("#75909d");
  let lastActiveId = Symbol("initial-active-part");

  function updateMaterialSelection(activeId) {
    if (activeId === lastActiveId) return;
    lastActiveId = activeId;
    for (const item of parts) {
      const selected = item.data.id === activeId;
      for (const mat of item.materials) {
        if (mat.emissive) {
          mat.emissive.copy(selected ? highlight : normalEmissive);
          mat.emissiveIntensity = selected ? 0.038 : 0;
        }
        const baseEnv = mat.userData.baseEnvIntensity ?? 0.82;
        mat.envMapIntensity = activeId && !selected ? baseEnv * 0.72 : baseEnv;
      }
    }
  }

  function update(progress, activeId, spread = 1) {
    const safeSpread = Math.min(1, Math.max(0.5, Number(spread) || 1));
    updateMaterialSelection(activeId);
    for (const item of parts) {
      const pose = partPose(item.data, progress, safeSpread, item.pose);
      item.group.position.set(pose.x, pose.y, pose.z);
      item.group.rotation.set(pose.rotationX, pose.rotationY, pose.rotationZ);
    }

    // The four reference-inspired tool-post bolts visibly release before the
    // whole post lifts, reinforcing the mechanical reading of the exploded view.
    const boltLift = range(progress, 0.38, 0.45) * 0.17;
    for (const bolt of toolPostBolts) bolt.position.y = bolt.userData.baseY + boltLift;

    // Restrained presentation rotation: enough depth to read the machine, no
    // free-spinning demo behavior.
    root.rotation.set(
      0.012,
      -0.105 + 0.065 * range(progress, 0.72, 0.9),
      -0.018 + 0.018 * range(progress, 0.88, 1),
    );
    // renderer.render() updates world matrices immediately afterwards. Doing a
    // full forced traversal here doubled matrix work on every mobile frame.
  }

  return {
    root,
    parts,
    update,
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      geometries.clear();
      materials.clear();
    },
  };
}
