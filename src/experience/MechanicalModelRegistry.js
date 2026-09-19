export const MODEL_METADATA = {
  gearShaft: {
    id: "gearShaft",
    displayName: "EIXO COM ENGRENAGEM / VISUALIZAÇÃO",
    family: "shaft-gear",
    compatibleScenes: ["components", "process"],
    cameraPreset: "long",
  },
  threadedPin: {
    id: "threadedPin",
    displayName: "PINO ROSCADO / VISUALIZAÇÃO",
    family: "threaded-pin",
    compatibleScenes: ["components", "precision"],
    cameraPreset: "compact",
  },
  industrialAssembly: {
    id: "industrialAssembly",
    displayName: "CONJUNTO INDUSTRIAL / VISUALIZAÇÃO",
    family: "industrial-assembly",
    compatibleScenes: ["components", "precision"],
    cameraPreset: "medium",
  },
};

const FIXED_PLAN = {
  components: ["gearShaft", "threadedPin", "industrialAssembly"],
  process: "gearShaft",
  precision: "industrialAssembly",
};

export function getMechanicalSessionPlan() {
  return {
    components: [...FIXED_PLAN.components],
    process: FIXED_PLAN.process,
    precision: FIXED_PLAN.precision,
  };
}

export function modelMeta(id) {
  return MODEL_METADATA[id] || MODEL_METADATA.gearShaft;
}
