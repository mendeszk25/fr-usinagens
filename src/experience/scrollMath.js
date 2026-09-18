export function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
}

export function normalizedScrollProgress(scrollY, start, end) {
  const y = Number(scrollY);
  const from = Number(start);
  const to = Number(end);
  if (!Number.isFinite(y) || !Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 0;
  return clamp01((y - from) / (to - from));
}
