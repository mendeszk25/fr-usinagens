import { fail, methodNotAllowed } from "../../_lib/http.js";

export async function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed(["GET"]);
  const { env, params } = context;
  if (!env.DB || !env.SITE_MEDIA) return fail("not_found", "Imagem não encontrada.", 404);
  const id = String(params.id || "");
  const row = await env.DB.prepare(`
    SELECT m.storage_key, m.mime_type
    FROM site_media m
    WHERE m.id = ? AND (
      EXISTS (SELECT 1 FROM works w WHERE w.published = 1 AND w.image_file_id = m.id)
      OR EXISTS (SELECT 1 FROM before_after_cases b WHERE b.published = 1 AND (b.before_file_id = m.id OR b.after_file_id = m.id))
    ) LIMIT 1
  `).bind(id).first();
  if (!row) return fail("not_found", "Imagem não encontrada.", 404);
  const object = await env.SITE_MEDIA.get(row.storage_key);
  if (!object) return fail("not_found", "Imagem não encontrada.", 404);
  return new Response(object.body, { headers: { "content-type": row.mime_type || object.httpMetadata?.contentType || "application/octet-stream", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
}
