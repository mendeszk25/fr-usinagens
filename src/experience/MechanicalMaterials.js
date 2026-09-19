import * as THREE from "three";

function steel({ color, roughness, metalness = 0.9, env = 0.42 } = {}) {
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
  });
  material.envMapIntensity = env;
  material.dithering = true;
  return material;
}

export function createMechanicalMaterials() {
  return {
    machined: steel({ color: "#68747a", roughness: 0.24, env: 0.52 }),
    brushed: steel({ color: "#566269", roughness: 0.36, env: 0.42 }),
    dark: steel({ color: "#252c30", roughness: 0.48, env: 0.3 }),
    raw: steel({ color: "#3b4143", roughness: 0.66, env: 0.22 }),
    blackened: steel({ color: "#171d20", roughness: 0.52, env: 0.26 }),
    oxidized: steel({ color: "#59483d", roughness: 0.75, env: 0.16 }),
    tool: steel({ color: "#30393d", roughness: 0.43, env: 0.34 }),
    insert: steel({ color: "#796f4f", roughness: 0.48, metalness: 0.68, env: 0.3 }),
    accent: steel({ color: "#889399", roughness: 0.18, env: 0.58 }),
    painted: steel({ color: "#334c59", roughness: 0.52, metalness: 0.72, env: 0.28 }),
  };
}

export function disposeMechanicalMaterials(materials) {
  Object.values(materials || {}).forEach((material) => material?.dispose?.());
}
