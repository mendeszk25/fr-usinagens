import { ok, fail, methodNotAllowed } from "../../_lib/http.js";
import { createSession, sessionCookie, verifyPassword } from "../../_lib/adminAuth.js";
import { rateLimit } from "../../_lib/rateLimit.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed(["POST"]);
  const { request, env } = context;
  if (!env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) {
    return fail("admin_not_configured", "O acesso administrativo ainda não está configurado.", 503);
  }

  const limited = await rateLimit(env, request, "admin-login", 10, 15 * 60);
  if (!limited.allowed) return fail("rate_limited", "Muitas tentativas. Aguarde alguns minutos.", 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_json", "Requisição inválida.", 400);
  }

  if (!(await verifyPassword(body?.password, env.ADMIN_PASSWORD))) {
    return fail("invalid_credentials", "Senha inválida.", 401);
  }

  const token = await createSession(env.ADMIN_SESSION_SECRET);
  return ok({ authenticated: true }, 200, { "set-cookie": sessionCookie(token) });
}
