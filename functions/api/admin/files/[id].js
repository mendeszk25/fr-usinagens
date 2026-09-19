import { fail, methodNotAllowed } from "../../../_lib/http.js";
import { isAdmin } from "../../../_lib/adminAuth.js";

export async function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed(["GET"]);
  const { request, env, params } = context;
  if (!(await isAdmin(request, env))) return fail("unauthorized", "Sessão administrativa inválida.", 401);
  if (!env.DB || !env.QUOTE_FILES) return fail("storage_not_configured", "Armazenamento não configurado.", 503);

  const row = await env.DB.prepare("SELECT storage_key, original_name, mime_type FROM quote_files WHERE id = ? LIMIT 1")
    .bind(String(params.id || "")).first();
  if (!row) return fail("not_found", "Arquivo não encontrado.", 404);
  const object = await env.QUOTE_FILES.get(row.storage_key);
  if (!object) return fail("not_found", "Arquivo não encontrado no armazenamento.", 404);

  return new Response(object.body, {
    headers: {
      "content-type": row.mime_type || object.httpMetadata?.contentType || "application/octet-stream",
      "content-disposition": `${String(row.mime_type || "").startsWith("image/") ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(row.original_name)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
