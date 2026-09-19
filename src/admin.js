import "./styles/admin.css";

const loginSection = document.querySelector("#admin-login");
const dashboard = document.querySelector("#admin-dashboard");
const loginForm = document.querySelector("#admin-login-form");
const loginStatus = document.querySelector("#admin-login-status");
const logoutButton = document.querySelector("#admin-logout");
const list = document.querySelector("#admin-list");
const listStatus = document.querySelector("#admin-list-status");
const search = document.querySelector("#admin-search");
const statusFilter = document.querySelector("#admin-status-filter");
const prev = document.querySelector("#admin-prev");
const next = document.querySelector("#admin-next");
const pageLabel = document.querySelector("#admin-page");
const dialog = document.querySelector("#admin-dialog");
const detailHost = document.querySelector("#admin-detail");

let page = 1;
let total = 0;
let perPage = 20;
let statusLabels = {};
let debounce;

function status(el, text = "", error = false) {
  el.textContent = text;
  el.classList.toggle("is-error", error);
}

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json", ...(options.headers || {}) }, ...options });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true || !body?.data) {
    const error = new Error(body?.error?.message || (response.ok ? "Backend administrativo indisponível neste ambiente." : `Erro ${response.status}`));
    error.status = response.ok ? 503 : response.status;
    throw error;
  }
  return body.data;
}

function showDashboard() {
  loginSection.hidden = true;
  dashboard.hidden = false;
  logoutButton.hidden = false;
}

function showLogin() {
  loginSection.hidden = false;
  dashboard.hidden = true;
  logoutButton.hidden = true;
}

function date(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function escapeText(value) {
  return String(value ?? "");
}

function renderStatusOptions(labels) {
  const current = statusFilter.value;
  statusFilter.replaceChildren(new Option("Todos os status", ""));
  Object.entries(labels).forEach(([value, label]) => statusFilter.add(new Option(label, value)));
  statusFilter.value = current;
}

async function loadList() {
  status(listStatus, "Carregando…");
  const params = new URLSearchParams({ page: String(page) });
  if (search.value.trim()) params.set("q", search.value.trim());
  if (statusFilter.value) params.set("status", statusFilter.value);
  try {
    const data = await api(`/api/admin/quotes?${params}`);
    total = data.total;
    perPage = data.per_page;
    statusLabels = data.status_labels || statusLabels;
    renderStatusOptions(statusLabels);
    list.replaceChildren();
    data.items.forEach((item) => {
      const row = document.createElement("tr");
      row.dataset.id = item.id;
      [item.public_code, item.customer_name, item.request_type, item.status_label, date(item.created_at)].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = escapeText(value);
        row.append(cell);
      });
      row.addEventListener("click", () => openDetail(item.id));
      list.append(row);
    });
    const pages = Math.max(1, Math.ceil(total / perPage));
    pageLabel.textContent = `PÁGINA ${page} / ${pages} · ${total} SOLICITAÇÃO${total === 1 ? "" : "ÕES"}`;
    prev.disabled = page <= 1;
    next.disabled = page >= pages;
    status(listStatus, data.items.length ? "" : "Nenhuma solicitação encontrada.");
  } catch (error) {
    if (error.status === 401) {
      showLogin();
      return;
    }
    status(listStatus, error.message, true);
  }
}

function addDefinition(dl, label, value) {
  const wrap = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = label;
  dd.textContent = value || "—";
  wrap.append(dt, dd);
  dl.append(wrap);
}

async function openDetail(id) {
  try {
    const data = await api(`/api/admin/quotes/${encodeURIComponent(id)}`);
    statusLabels = data.status_labels || statusLabels;
    const q = data.quote;
    detailHost.replaceChildren();
    const root = document.createElement("div");
    root.className = "admin-detail";

    const hero = document.createElement("div");
    hero.className = "admin-detail__hero";
    const heroCopy = document.createElement("div");
    const h2 = document.createElement("h2"); h2.textContent = q.public_code;
    const hp = document.createElement("p"); hp.textContent = `${q.customer_name} · ${q.phone}`;
    heroCopy.append(h2, hp);
    const badge = document.createElement("p"); badge.textContent = q.status_label;
    hero.append(heroCopy, badge);

    const dl = document.createElement("dl"); dl.className = "admin-detail__grid";
    addDefinition(dl, "Empresa", q.company);
    addDefinition(dl, "Necessidade", q.request_type);
    addDefinition(dl, "Quantidade", q.quantity ? String(q.quantity) : "Não informada");
    addDefinition(dl, "Material", q.material);
    addDefinition(dl, "Urgência", q.urgency);
    addDefinition(dl, "Entrada", date(q.created_at));
    const dims = q.dimensions?.unknown ? "Não informadas" : [q.dimensions?.length && `Comp.: ${q.dimensions.length}`, q.dimensions?.diameter && `Ø: ${q.dimensions.diameter}`, q.dimensions?.width && `Outra: ${q.dimensions.width}`].filter(Boolean).join(" · ") || "Não informadas";
    addDefinition(dl, "Medidas", dims);
    addDefinition(dl, "Atualização", date(q.updated_at));

    const desc = document.createElement("section"); desc.className = "admin-block";
    const descTitle = document.createElement("h3"); descTitle.textContent = "DESCRIÇÃO";
    const descText = document.createElement("p"); descText.textContent = q.description;
    desc.append(descTitle, descText);

    const files = document.createElement("section"); files.className = "admin-block";
    const filesTitle = document.createElement("h3"); filesTitle.textContent = `ARQUIVOS (${q.files.length})`;
    const filesList = document.createElement("div"); filesList.className = "admin-files";
    if (q.files.length) q.files.forEach((file) => {
      const a = document.createElement("a");
      a.href = `/api/admin/files/${encodeURIComponent(file.id)}`;
      a.textContent = `${file.original_name} · ${Math.max(1, Math.round(file.size_bytes / 1024))} KB ↗`;
      a.target = "_blank"; a.rel = "noopener";
      filesList.append(a);
    });
    else filesList.textContent = "Nenhum arquivo anexado.";
    files.append(filesTitle, filesList);

    const edit = document.createElement("form"); edit.className = "admin-edit";
    const selectLabel = document.createElement("label"); selectLabel.textContent = "Status";
    const select = document.createElement("select");
    Object.entries(statusLabels).forEach(([value, label]) => select.add(new Option(label, value)));
    select.value = q.status;
    selectLabel.append(select);
    const publicLabel = document.createElement("label"); publicLabel.textContent = "Observação pública";
    const publicText = document.createElement("textarea"); publicText.maxLength = 1000; publicText.value = q.public_note || ""; publicLabel.append(publicText);
    const internalLabel = document.createElement("label"); internalLabel.textContent = "Observação interna";
    const internalText = document.createElement("textarea"); internalText.maxLength = 3000; internalText.value = q.internal_note || ""; internalLabel.append(internalText);
    const save = document.createElement("button"); save.className = "admin-button"; save.type = "submit"; save.innerHTML = "SALVAR ALTERAÇÕES <span>↗</span>";
    const editStatus = document.createElement("p"); editStatus.className = "admin-status";
    edit.append(selectLabel, publicLabel, internalLabel, save, editStatus);
    edit.addEventListener("submit", async (event) => {
      event.preventDefault();
      save.disabled = true; status(editStatus, "Salvando…");
      try {
        await api(`/api/admin/quotes/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: select.value, public_note: publicText.value, internal_note: internalText.value }) });
        status(editStatus, "Alterações salvas.");
        await loadList();
      } catch (error) { status(editStatus, error.message, true); }
      finally { save.disabled = false; }
    });

    const history = document.createElement("section"); history.className = "admin-block";
    const histTitle = document.createElement("h3"); histTitle.textContent = "HISTÓRICO";
    const histList = document.createElement("div"); histList.className = "admin-history";
    q.history.forEach((entry) => {
      const row = document.createElement("div");
      const time = document.createElement("span"); time.textContent = date(entry.created_at);
      const state = document.createElement("strong"); state.textContent = entry.status_label;
      const note = document.createElement("span"); note.textContent = entry.public_note || "—";
      row.append(time, state, note); histList.append(row);
    });
    history.append(histTitle, histList);

    root.append(hero, dl, desc, files, edit, history);
    detailHost.append(root);
    dialog.showModal();
  } catch (error) {
    status(listStatus, error.message, true);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  status(loginStatus, "Entrando…");
  const button = loginForm.querySelector("button"); button.disabled = true;
  try {
    await api("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: document.querySelector("#admin-password").value }) });
    document.querySelector("#admin-password").value = "";
    showDashboard(); await loadList();
  } catch (error) { status(loginStatus, error.message, true); }
  finally { button.disabled = false; }
});

logoutButton.addEventListener("click", async () => { try { await api("/api/admin/logout", { method: "POST" }); } finally { showLogin(); } });
prev.addEventListener("click", () => { if (page > 1) { page -= 1; loadList(); } });
next.addEventListener("click", () => { if (page * perPage < total) { page += 1; loadList(); } });
statusFilter.addEventListener("change", () => { page = 1; loadList(); });
search.addEventListener("input", () => { clearTimeout(debounce); debounce = setTimeout(() => { page = 1; loadList(); }, 260); });

(async function boot() {
  try {
    await api("/api/admin/session");
    showDashboard();
    await loadList();
  } catch { showLogin(); }
})();
