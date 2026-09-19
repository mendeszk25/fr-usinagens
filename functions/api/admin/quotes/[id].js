import { ok, fail, methodNotAllowed } from "../../../_lib/http.js";
import { isAdmin } from "../../../_lib/adminAuth.js";
import { STATUS_LABELS, ALLOWED_STATUSES } from "../../../_lib/validation.js";

async function getQuote(env, id) {
  const quote = await env.DB.prepare(`
    SELECT id, public_code, customer_name, phone, company, city, request_type, quantity, material,
           dimensions_json, description, urgency, status, public_note, internal_note, archived, created_at, updated_at
    FROM quote_requests WHERE id = ? LIMIT 1
  `).bind(id).first();
  if (!quote) return null;
  const [files, history] = await Promise.all([
    env.DB.prepare(`SELECT id, original_name, mime_type, size_bytes, created_at FROM quote_files WHERE quote_id = ? ORDER BY created_at ASC`).bind(id).all(),
    env.DB.prepare(`SELECT status, public_note, created_at FROM quote_status_history WHERE quote_id = ? ORDER BY created_at DESC`).bind(id).all(),
  ]);
  return {
    ...quote,
    archived: Boolean(quote.archived),
    dimensions: JSON.parse(quote.dimensions_json || "{}"),
    dimensions_json: undefined,
    status_label: STATUS_LABELS[quote.status] || quote.status,
    files: files.results || [],
    history: (history.results || []).map((item) => ({ ...item, status_label: STATUS_LABELS[item.status] || item.status })),
  };
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (!(await isAdmin(request, env))) return fail("unauthorized", "Sessão administrativa inválida.", 401);
  if (!env.DB) return fail("backend_not_configured", "Banco de dados não configurado.", 503);
  const id = String(params.id || "");

  if (request.method === "GET") {
    const quote = await getQuote(env, id);
    if (!quote) return fail("not_found", "Solicitação não encontrada.", 404);
    return ok({ quote, status_labels: STATUS_LABELS });
  }

  if (request.method === "PATCH") {
    let body;
    try { body = await request.json(); } catch { return fail("invalid_json", "Dados inválidos.", 400); }

    const existing = await env.DB.prepare("SELECT status, public_note, internal_note, archived, updated_at FROM quote_requests WHERE id = ? LIMIT 1").bind(id).first();
    if (!existing) return fail("not_found", "Solicitação não encontrada.", 404);

    const requestedStatus = body?.status === undefined ? existing.status : String(body.status || "").trim();
    if (!ALLOWED_STATUSES.has(requestedStatus)) return fail("invalid_status", "Status inválido.", 400);
    const publicNote = body?.public_note === undefined ? existing.public_note : (String(body.public_note || "").replace(/\u0000/g, "").trim().slice(0, 1000) || null);
    const internalNote = body?.internal_note === undefined ? existing.internal_note : (String(body.internal_note || "").replace(/\u0000/g, "").trim().slice(0, 3000) || null);
    const archived = body?.archived === undefined ? Number(existing.archived || 0) : (body.archived ? 1 : 0);
    const expectedUpdatedAt = String(body?.expected_updated_at || "").trim();
    if (expectedUpdatedAt && expectedUpdatedAt !== existing.updated_at) {
      return fail("conflict", "Esta solicitação foi alterada em outra janela. Recarregue antes de salvar.", 409);
    }

    const now = new Date().toISOString();
    const statements = [
      env.DB.prepare(`UPDATE quote_requests SET status = ?, public_note = ?, internal_note = ?, archived = ?, updated_at = ? WHERE id = ?`)
        .bind(requestedStatus, publicNote, internalNote, archived, now, id),
    ];
    if (existing.status !== requestedStatus || (existing.public_note || null) !== publicNote) {
      statements.push(env.DB.prepare(`INSERT INTO quote_status_history (id, quote_id, status, public_note, created_at) VALUES (?, ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), id, requestedStatus, publicNote, now));
    }
    await env.DB.batch(statements);
    const quote = await getQuote(env, id);
    return ok({ quote, status_labels: STATUS_LABELS });
  }

  return methodNotAllowed(["GET", "PATCH"]);
}
