export const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
export const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
export const range = (p, start, end) => smooth((p - start) / (end - start));

// A tiny preload release followed by deterministic travel. No elapsed-time state:
// scrolling backwards reproduces exactly the same mechanical pose.
export function release(p, start, end) {
  const t = clamp((p - start) / (end - start));
  if (t < 0.1) return -0.008 * Math.sin((t / 0.1) * Math.PI);
  return smooth((t - 0.1) / 0.9);
}

export function partPose(part, progress, spread = 1, pose = {}) {
  const travel = release(progress, ...part.stage);
  const compact = typeof spread === "number" ? spread : spread ? 0.72 : 1;

  // Spread is applied to the displacement, not to the absolute coordinate. This
  // is important for nested lathe groups: mobile keeps the same assembled datum
  // and simply reduces how far each component is allowed to leave it.
  pose.x =
    part.position[0] +
    (part.explodedPosition[0] - part.position[0]) * travel * compact;
  pose.y =
    part.position[1] +
    (part.explodedPosition[1] - part.position[1]) * travel * compact;
  pose.z =
    part.position[2] +
    (part.explodedPosition[2] - part.position[2]) * travel * compact;
  pose.rotationX =
    part.rotation[0] + (part.explodedRotation[0] - part.rotation[0]) * travel;
  pose.rotationY =
    part.rotation[1] + (part.explodedRotation[1] - part.rotation[1]) * travel;
  pose.rotationZ =
    part.rotation[2] + (part.explodedRotation[2] - part.rotation[2]) * travel;
  return pose;
}

export function annotationReveal(part, progress) {
  const start = part.scrollRange[0] + 0.006;
  const duration = Math.max(0.035, part.scrollRange[1] - start);
  return {
    line: range(progress, start, start + duration * 0.2),
    text: range(progress, start + duration * 0.18, start + duration * 0.42),
  };
}
