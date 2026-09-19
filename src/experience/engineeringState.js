export const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export function smoothRange(from, to, value) {
  const t = clamp01((value - from) / Math.max(0.0001, to - from));
  return t * t * (3 - 2 * t);
}

function stageBlend(progress, index, count = 6) {
  const position = clamp01(progress) * (count - 1);
  const distance = Math.abs(position - index);
  if (distance >= 1) return 0;
  const t = 1 - distance;
  return t * t * (3 - 2 * t);
}

export function getProcessVisualState(progress, reducedMotion = false) {
  const source = clamp01(progress);
  const p = reducedMotion ? (source < 0.5 ? 0 : 1) : source;
  const stageOpacities = Array.from({ length: 6 }, (_, index) => stageBlend(p, index, 6));
  const rawOpacity = stageOpacities[0];
  const intermediateOpacity = Math.min(1, stageOpacities[1] + stageOpacities[2] + stageOpacities[3] + stageOpacities[4]);
  const finalOpacity = stageOpacities[5];
  return {
    progress: p,
    rawOpacity,
    intermediateOpacity,
    finalOpacity,
    stageOpacities,
    toolTravel: smoothRange(0.08, 0.88, p),
  };
}

export function getPrecisionVisualState(progress, reducedMotion = false) {
  const p = reducedMotion ? 0.72 : clamp01(progress);
  const wireIn = smoothRange(0.25, 0.5, p);
  const wireOut = smoothRange(0.72, 0.94, p);
  return {
    progress: p,
    wireOpacity: Math.max(0, wireIn * (1 - wireOut)) * 0.82,
    solidOpacity: 1 - wireIn * 0.34 + wireOut * 0.34,
  };
}

export function getProcessStep(progress) {
  const p = clamp01(progress);
  if (p < 0.18) return 1;
  if (p < 0.42) return 2;
  if (p < 0.68) return 3;
  if (p < 0.86) return 4;
  return 5;
}
