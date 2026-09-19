import { ok, fail, methodNotAllowed } from "../../_lib/http.js";
export async function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed(["GET"]);
  const { env } = context;
  if (!env.DB) return fail("backend_not_configured", "Conteúdo dinâmico não configurado.", 503);
  const rows = await env.DB.prepare(`SELECT id,title,description,category,image_file_id,sort_order FROM works WHERE published=1 ORDER BY sort_order ASC, created_at DESC`).all();
  return ok({ items: (rows.results || []).map((row) => ({ ...row, image_url: row.image_file_id ? `/api/media/${row.image_file_id}` : null })) });
}
