import { ok, methodNotAllowed } from "../../_lib/http.js";
import { clearSessionCookie } from "../../_lib/adminAuth.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed(["POST"]);
  return ok({ authenticated: false }, 200, { "set-cookie": clearSessionCookie() });
}
