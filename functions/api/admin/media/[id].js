import { fail, methodNotAllowed } from "../../../_lib/http.js";
import { isAdmin } from "../../../_lib/adminAuth.js";

export async function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed(["GET"]);
  const { request, env, params } = context;
  if (!(await isAdmin(request, env))) return fail("unauthorized", "Sessão administrativa inválida.", 401);
  if (!env.DB || !env.SITE_MEDIA) return fail("storage_not_configured", "Armazenamento não configurado.", 503);
  const row = await env.DB.prepare("SELECT storage_key, original_name, mime_type FROM site_media WHERE id = ? LIMIT 1").bind(String(params.id || "")).first();
  if (!row) return fail("not_found", "Imagem não encontrada.", 404);
  const object = await env.SITE_MEDIA.get(row.storage_key);
  if (!object) return fail("not_found", "Imagem não encontrada.", 404);
  return new Response(object.body, { headers: { "content-type": row.mime_type || "application/octet-stream", "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.original_name)}`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
