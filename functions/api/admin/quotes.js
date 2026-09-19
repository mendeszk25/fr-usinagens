import { ok, fail, methodNotAllowed } from "../../_lib/http.js";
import { isAdmin } from "../../_lib/adminAuth.js";
import { STATUS_LABELS, ALLOWED_STATUSES } from "../../_lib/validation.js";

const ORDERS = new Map([
  ["recent", "q.created_at DESC"],
  ["oldest", "q.created_at ASC"],
  ["updated", "q.updated_at DESC"],
]);

export async function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed(["GET"]);
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return fail("unauthorized", "Sessão administrativa inválida.", 401);
  if (!env.DB) return fail("backend_not_configured", "Banco de dados não configurado.", 503);

  const url = new URL(request.url);
  const page = Math.max(1, Math.min(100000, Number(url.searchParams.get("page")) || 1));
  const perPage = Math.max(10, Math.min(50, Number(url.searchParams.get("per_page")) || 20));
  const offset = (page - 1) * perPage;
  const requestedStatus = String(url.searchParams.get("status") || "").trim();
  const status = ALLOWED_STATUSES.has(requestedStatus) ? requestedStatus : "";
  const search = String(url.searchParams.get("q") || "").trim().slice(0, 120);
  const requestType = String(url.searchParams.get("type") || "").trim().slice(0, 120);
  const fileFilter = String(url.searchParams.get("files") || "").trim();
  const archived = String(url.searchParams.get("archived") || "active").trim();
  const order = ORDERS.get(String(url.searchParams.get("order") || "recent")) || ORDERS.get("recent");
  const dateFrom = String(url.searchParams.get("from") || "").trim().slice(0, 10);
  const dateTo = String(url.searchParams.get("to") || "").trim().slice(0, 10);

  const where = [];
  const binds = [];
  if (archived === "archived") where.push("q.archived = 1");
  else if (archived !== "all") where.push("q.archived = 0");
  if (status) { where.push("q.status = ?"); binds.push(status); }
  if (requestType) { where.push("q.request_type = ?"); binds.push(requestType); }
  if (search) {
    where.push("(q.public_code LIKE ? OR q.customer_name LIKE ? OR q.phone LIKE ? OR q.description LIKE ?)");
    const term = `%${search.replace(/[%_]/g, "")}%`;
    binds.push(term, term, term, term);
  }
  if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) { where.push("q.created_at >= ?"); binds.push(`${dateFrom}T00:00:00.000Z`); }
  if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) { where.push("q.created_at <= ?"); binds.push(`${dateTo}T23:59:59.999Z`); }
  if (fileFilter === "with") where.push("EXISTS (SELECT 1 FROM quote_files f2 WHERE f2.quote_id = q.id)");
  if (fileFilter === "without") where.push("NOT EXISTS (SELECT 1 FROM quote_files f2 WHERE f2.quote_id = q.id)");
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows, countRow, typeRows] = await Promise.all([
    env.DB.prepare(`
      SELECT q.id, q.public_code, q.customer_name, q.phone, q.company, q.city, q.request_type, q.quantity, q.material,
             q.urgency, q.status, q.public_note, q.archived, q.created_at, q.updated_at,
             (SELECT COUNT(*) FROM quote_files f WHERE f.quote_id = q.id) AS file_count
      FROM quote_requests q ${clause}
      ORDER BY ${order} LIMIT ? OFFSET ?
    `).bind(...binds, perPage, offset).all(),
    env.DB.prepare(`SELECT COUNT(*) AS total FROM quote_requests q ${clause}`).bind(...binds).first(),
    env.DB.prepare("SELECT DISTINCT request_type FROM quote_requests WHERE request_type IS NOT NULL AND request_type <> '' ORDER BY request_type ASC").all(),
  ]);

  return ok({
    items: (rows.results || []).map((row) => ({ ...row, file_count: Number(row.file_count || 0), archived: Boolean(row.archived), status_label: STATUS_LABELS[row.status] || row.status })),
    page,
    per_page: perPage,
    total: Number(countRow?.total || 0),
    status_labels: STATUS_LABELS,
    request_types: (typeRows.results || []).map((row) => row.request_type),
  });
}
