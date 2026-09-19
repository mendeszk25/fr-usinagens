import { ok, fail, methodNotAllowed } from "../../_lib/http.js";
import { isAdmin } from "../../_lib/adminAuth.js";
import { STATUS_LABELS, ALLOWED_STATUSES } from "../../_lib/validation.js";

export async function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed(["GET"]);
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return fail("unauthorized", "Sessão administrativa inválida.", 401);
  if (!env.DB) return fail("backend_not_configured", "Banco de dados não configurado.", 503);

  const url = new URL(request.url);
  const page = Math.max(1, Math.min(100000, Number(url.searchParams.get("page")) || 1));
  const perPage = 20;
  const offset = (page - 1) * perPage;
  const requestedStatus = String(url.searchParams.get("status") || "").trim();
  const status = ALLOWED_STATUSES.has(requestedStatus) ? requestedStatus : "";
  const search = String(url.searchParams.get("q") || "").trim().slice(0, 80);

  const where = [];
  const binds = [];
  if (status) {
    where.push("status = ?");
    binds.push(status);
  }
  if (search) {
    where.push("(public_code LIKE ? OR customer_name LIKE ? OR phone LIKE ?)");
    const term = `%${search.replace(/[%_]/g, "")}%`;
    binds.push(term, term, term);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows, countRow] = await Promise.all([
    env.DB.prepare(`
      SELECT id, public_code, customer_name, phone, company, request_type, quantity, material,
             urgency, status, public_note, created_at, updated_at
      FROM quote_requests ${clause}
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).bind(...binds, perPage, offset).all(),
    env.DB.prepare(`SELECT COUNT(*) AS total FROM quote_requests ${clause}`).bind(...binds).first(),
  ]);

  return ok({
    items: (rows.results || []).map((row) => ({ ...row, status_label: STATUS_LABELS[row.status] || row.status })),
    page,
    per_page: perPage,
    total: Number(countRow?.total || 0),
    status_labels: STATUS_LABELS,
  });
}
