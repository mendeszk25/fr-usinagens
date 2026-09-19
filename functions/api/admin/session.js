import { ok, fail, methodNotAllowed } from "../../_lib/http.js";
import { isAdmin } from "../../_lib/adminAuth.js";

export async function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed(["GET"]);
  if (!(await isAdmin(context.request, context.env))) return fail("unauthorized", "Sessão administrativa inválida.", 401);
  return ok({ authenticated: true });
}
