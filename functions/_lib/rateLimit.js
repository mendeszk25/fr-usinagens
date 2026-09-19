import { sha256 } from "./crypto.js";

export async function rateLimit(env, request, scope, limit, windowSeconds) {
  if (!env.DB) return { allowed: true };
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "unknown";
  const salt = env.RATE_LIMIT_SALT || "fr-usinagens-rate-limit";
  const key = await sha256(`${scope}:${ip}:${salt}`);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(now - 7 * 24 * 60 * 60).run();
  const row = await env.DB.prepare("SELECT window_start, count FROM rate_limits WHERE key = ?").bind(key).first();

  if (!row || now - Number(row.window_start) >= windowSeconds) {
    await env.DB.prepare(
      "INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1",
    ).bind(key, now).run();
    return { allowed: true, remaining: limit - 1 };
  }

  if (Number(row.count) >= limit) {
    return { allowed: false, retryAfter: Math.max(1, windowSeconds - (now - Number(row.window_start))) };
  }

  await env.DB.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").bind(key).run();
  return { allowed: true, remaining: Math.max(0, limit - Number(row.count) - 1) };
}
