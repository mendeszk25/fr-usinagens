import { ok, fail, methodNotAllowed } from "../../_lib/http.js";
import { safeEqual, sha256 } from "../../_lib/crypto.js";
import { STATUS_LABELS } from "../../_lib/validation.js";
import { rateLimit } from "../../_lib/rateLimit.js";

export async function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed(["GET"]);
  const { request, env, params } = context;
  if (!env.DB) return fail("backend_not_configured", "O acompanhamento ainda não está configurado.", 503);

  const limited = await rateLimit(env, request, "tracking", 30, 15 * 60);
  if (!limited.allowed) return fail("rate_limited", "Muitas consultas. Tente novamente em alguns minutos.", 429);

  const code = String(params.code || "").trim().toUpperCase();
  const token = request.headers.get("X-Quote-Token") || "";
  if (!/^FR-[A-Z0-9]{6}$/.test(code) || token.length < 20) {
    return fail("not_found", "Solicitação não encontrada ou chave inválida.", 404);
  }

  const row = await env.DB.prepare(`
    SELECT id, public_code, tracking_token_hash, status, public_note, created_at, updated_at
    FROM quote_requests WHERE public_code = ? LIMIT 1
  `).bind(code).first();

  if (!row) return fail("not_found", "Solicitação não encontrada ou chave inválida.", 404);
  const hash = await sha256(token);
  if (!safeEqual(hash, row.tracking_token_hash)) {
    return fail("not_found", "Solicitação não encontrada ou chave inválida.", 404);
  }

  const history = await env.DB.prepare(`
    SELECT status, public_note, created_at
    FROM quote_status_history WHERE quote_id = ? ORDER BY created_at ASC
  `).bind(row.id).all();

  return ok({
    public_code: row.public_code,
    status: row.status,
    status_label: STATUS_LABELS[row.status] || row.status,
    public_note: row.public_note || "",
    created_at: row.created_at,
    updated_at: row.updated_at,
    history: (history.results || []).map((entry) => ({
      status: entry.status,
      status_label: STATUS_LABELS[entry.status] || entry.status,
      public_note: entry.public_note || "",
      created_at: entry.created_at,
    })),
    status_labels: STATUS_LABELS,
  });
}
