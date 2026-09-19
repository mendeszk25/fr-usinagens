import { ok, fail, methodNotAllowed } from "../../_lib/http.js";
import { isAdmin } from "../../_lib/adminAuth.js";

function text(value, max = 500) { return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max); }
function integer(value, fallback = 0) { const n = Number(value); return Number.isInteger(n) ? n : fallback; }

async function mediaExists(env, id) {
  if (!id) return true;
  return Boolean(await env.DB.prepare("SELECT 1 FROM site_media WHERE id = ? LIMIT 1").bind(id).first());
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return fail("unauthorized", "Sessão administrativa inválida.", 401);
  if (!env.DB) return fail("backend_not_configured", "Banco de dados não configurado.", 503);

  if (request.method === "GET") {
    const rows = await env.DB.prepare(`
      SELECT w.id, w.title, w.description, w.category, w.image_file_id, w.published, w.sort_order, w.created_at, w.updated_at,
             m.original_name AS image_name
      FROM works w LEFT JOIN site_media m ON m.id = w.image_file_id
      ORDER BY w.sort_order ASC, w.created_at DESC
    `).all();
    return ok({ items: (rows.results || []).map((row) => ({ ...row, published: Boolean(row.published), image_url: row.image_file_id ? `/api/admin/media/${row.image_file_id}` : null })) });
  }

  if (request.method === "POST") {
    let body; try { body = await request.json(); } catch { return fail("invalid_json", "Dados inválidos.", 400); }
    const title = text(body?.title, 140);
    const description = text(body?.description, 800) || null;
    const category = text(body?.category, 100) || null;
    const imageFileId = text(body?.image_file_id, 100) || null;
    const published = body?.published ? 1 : 0;
    const sortOrder = integer(body?.sort_order, 0);
    if (title.length < 2) return fail("validation_error", "Informe o título do trabalho.", 400);
    if (!(await mediaExists(env, imageFileId))) return fail("invalid_media", "A imagem selecionada não existe.", 400);
    if (published && !imageFileId) return fail("validation_error", "Adicione uma imagem antes de publicar o trabalho.", 400);
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    await env.DB.prepare(`INSERT INTO works (id,title,description,category,image_file_id,published,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`)
      .bind(id,title,description,category,imageFileId,published,sortOrder,now,now).run();
    return ok({ id }, 201);
  }

  return methodNotAllowed(["GET", "POST"]);
}
