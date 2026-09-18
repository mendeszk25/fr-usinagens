export const MotionMode = Object.freeze({
  FULL: "full",
  REDUCED: "reduced",
  STATIC: "static",
});

export function resolveMotionMode({ reducedMotion = false, staticExplicit = false } = {}) {
  if (staticExplicit) return MotionMode.STATIC;
  return reducedMotion ? MotionMode.REDUCED : MotionMode.FULL;
}
