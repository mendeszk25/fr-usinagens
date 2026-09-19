import { hmac, safeEqual, sha256 } from "./crypto.js";

const COOKIE = "fr_admin_session";
const MAX_AGE = 8 * 60 * 60;

function parseCookies(request) {
  return Object.fromEntries(
    (request.headers.get("cookie") || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

export async function verifyPassword(candidate, configured) {
  if (!configured) return false;
  const [left, right] = await Promise.all([sha256(candidate || ""), sha256(configured)]);
  return safeEqual(left, right);
}

export async function createSession(secret) {
  if (!secret) throw new Error("ADMIN_SESSION_SECRET não configurado");
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = String(expires);
  const signature = await hmac(payload, secret);
  return `${payload}.${signature}`;
}

export async function isAdmin(request, env) {
  const token = parseCookies(request)[COOKIE];
  if (!token || !env.ADMIN_SESSION_SECRET) return false;
  const [expiresRaw, signature] = token.split(".");
  const expires = Number(expiresRaw);
  if (!expires || expires < Math.floor(Date.now() / 1000) || !signature) return false;
  const expected = await hmac(expiresRaw, env.ADMIN_SESSION_SECRET);
  return safeEqual(signature, expected);
}

export function sessionCookie(token) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
