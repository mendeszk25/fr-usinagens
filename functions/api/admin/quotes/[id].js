import { ok, fail, methodNotAllowed } from "../../../_lib/http.js";
import { isAdmin } from "../../../_lib/adminAuth.js";
import { ALLOWED_STATUSES, STATUS_LABELS } from "../../../_lib/validation.js";

async function getQuote(env, id) {
  const quote = await env.DB.prepare(`
    SELECT id, public_code, customer_name, phone, company, request_type, quantity, material,
           dimensions_json, description, urgency, status, public_note, internal_note, created_at, updated_at
    FROM quote_requests WHERE id = ? LIMIT 1
  `).bind(id).first();
  if (!quote) return null;
  const [files, history] = await Promise.all([
    env.DB.prepare(`SELECT id, original_name, mime_type, size_bytes, created_at FROM quote_files WHERE quote_id = ? ORDER BY created_at ASC`).bind(id).all(),
    env.DB.prepare(`SELECT status, public_note, created_at FROM quote_status_history WHERE quote_id = ? ORDER BY created_at DESC`).bind(id).all(),
  ]);
  return {
    ...quote,
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
    try {
      body = await request.json();
    } catch {
      return fail("invalid_json", "Dados inválidos.", 400);
    }

    const status = String(body?.status || "").trim();
    const publicNote = String(body?.public_note || "").replace(/\u0000/g, "").trim().slice(0, 1000) || null;
    const internalNote = String(body?.internal_note || "").replace(/\u0000/g, "").trim().slice(0, 3000) || null;
    if (!ALLOWED_STATUSES.has(status)) return fail("invalid_status", "Status inválido.", 400);

    const existing = await env.DB.prepare("SELECT status, public_note FROM quote_requests WHERE id = ? LIMIT 1").bind(id).first();
    if (!existing) return fail("not_found", "Solicitação não encontrada.", 404);
    const now = new Date().toISOString();
    const statements = [
      env.DB.prepare(`UPDATE quote_requests SET status = ?, public_note = ?, internal_note = ?, updated_at = ? WHERE id = ?`)
        .bind(status, publicNote, internalNote, now, id),
    ];
    if (existing.status !== status || (existing.public_note || null) !== publicNote) {
      statements.push(
        env.DB.prepare(`INSERT INTO quote_status_history (id, quote_id, status, public_note, created_at) VALUES (?, ?, ?, ?, ?)`)
          .bind(crypto.randomUUID(), id, status, publicNote, now),
      );
    }
    await env.DB.batch(statements);
    const quote = await getQuote(env, id);
    return ok({ quote, status_labels: STATUS_LABELS });
  }

  return methodNotAllowed(["GET", "PATCH"]);
}
