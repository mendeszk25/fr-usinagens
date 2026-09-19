import { ok, fail, methodNotAllowed } from "../../_lib/http.js";
import { isAdmin } from "../../_lib/adminAuth.js";
import { STATUS_LABELS } from "../../_lib/validation.js";

export async function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed(["GET"]);
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return fail("unauthorized", "Sessão administrativa inválida.", 401);
  if (!env.DB) return fail("backend_not_configured", "Banco de dados não configurado.", 503);

  const [counts, recent, activity] = await Promise.all([
    env.DB.prepare(`SELECT status, COUNT(*) AS total FROM quote_requests WHERE archived = 0 GROUP BY status`).all(),
    env.DB.prepare(`
      SELECT q.id, q.public_code, q.customer_name, q.request_type, q.status, q.updated_at,
             (SELECT COUNT(*) FROM quote_files f WHERE f.quote_id = q.id) AS file_count
      FROM quote_requests q WHERE q.archived = 0 ORDER BY q.created_at DESC LIMIT 6
    `).all(),
    env.DB.prepare(`
      SELECT h.status, h.public_note, h.created_at, q.public_code, q.customer_name
      FROM quote_status_history h
      JOIN quote_requests q ON q.id = h.quote_id
      ORDER BY h.created_at DESC LIMIT 8
    `).all(),
  ]);

  const byStatus = Object.fromEntries(Object.keys(STATUS_LABELS).map((key) => [key, 0]));
  for (const row of counts.results || []) byStatus[row.status] = Number(row.total || 0);
  return ok({
    counts: byStatus,
    status_labels: STATUS_LABELS,
    recent: (recent.results || []).map((row) => ({ ...row, file_count: Number(row.file_count || 0), status_label: STATUS_LABELS[row.status] || row.status })),
    activity: (activity.results || []).map((row) => ({ ...row, status_label: STATUS_LABELS[row.status] || row.status })),
  });
}
