import { ok, fail, methodNotAllowed } from "../../../_lib/http.js";
import { isAdmin } from "../../../_lib/adminAuth.js";
function text(value, max = 500) { return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max); }
function integer(value, fallback = 0) { const n = Number(value); return Number.isInteger(n) ? n : fallback; }
async function mediaExists(env, id) { if (!id) return true; return Boolean(await env.DB.prepare("SELECT 1 FROM site_media WHERE id = ? LIMIT 1").bind(id).first()); }

export async function onRequest(context) {
  const { request, env, params } = context;
  if (!(await isAdmin(request, env))) return fail("unauthorized", "Sessão administrativa inválida.", 401);
  if (!env.DB) return fail("backend_not_configured", "Banco de dados não configurado.", 503);
  const id = String(params.id || "");
  const current = await env.DB.prepare("SELECT * FROM works WHERE id = ? LIMIT 1").bind(id).first();
  if (!current) return fail("not_found", "Trabalho não encontrado.", 404);

  if (request.method === "PATCH") {
    let body; try { body = await request.json(); } catch { return fail("invalid_json", "Dados inválidos.", 400); }
    const title = body?.title === undefined ? current.title : text(body.title, 140);
    const description = body?.description === undefined ? current.description : (text(body.description, 800) || null);
    const category = body?.category === undefined ? current.category : (text(body.category, 100) || null);
    const imageFileId = body?.image_file_id === undefined ? current.image_file_id : (text(body.image_file_id, 100) || null);
    const published = body?.published === undefined ? Number(current.published) : (body.published ? 1 : 0);
    const sortOrder = body?.sort_order === undefined ? Number(current.sort_order || 0) : integer(body.sort_order, 0);
    if (title.length < 2) return fail("validation_error", "Informe o título do trabalho.", 400);
    if (!(await mediaExists(env, imageFileId))) return fail("invalid_media", "A imagem selecionada não existe.", 400);
    if (published && !imageFileId) return fail("validation_error", "Adicione uma imagem antes de publicar o trabalho.", 400);
    const now = new Date().toISOString();
    await env.DB.prepare(`UPDATE works SET title=?,description=?,category=?,image_file_id=?,published=?,sort_order=?,updated_at=? WHERE id=?`)
      .bind(title,description,category,imageFileId,published,sortOrder,now,id).run();
    return ok({ id });
  }
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM works WHERE id = ?").bind(id).run();
    return ok({ deleted: true });
  }
  return methodNotAllowed(["PATCH", "DELETE"]);
}
