const WHATSAPP_NUMBER = "5581973091369";
const MAX_FILES = 4;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_TOTAL_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const TOKEN_STORAGE_KEY = "fr-usinagens.quote-tokens.v1";
const DRAFT_STORAGE_KEY = "fr-usinagens.quote-draft.v2";
const STEP_TITLES = ["O que você precisa?", "Sobre a peça", "Fotos ou desenho", "Seus dados", "Confira sua solicitação"];

function clean(value) { return String(value || "").trim(); }
function setStatus(element, message = "", kind = "") {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", kind === "error");
  element.classList.toggle("is-success", kind === "success");
}
function formatBytes(bytes) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1).replace(".0", "")} MB`; }
function formatDate(value) { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—"; }

function getStoredTokens() { try { return JSON.parse(localStorage.getItem(TOKEN_STORAGE_KEY) || "{}") || {}; } catch { return {}; } }
function saveTrackingToken(code, token) {
  if (!code || !token) return;
  try { const tokens = getStoredTokens(); tokens[code.toUpperCase()] = token; localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens)); } catch { /* storage may be blocked */ }
}

function buildDimensions(data) {
  if (data.get("unknown_dimensions")) return "Não sei informar";
  const parts = [["Comprimento", clean(data.get("length"))], ["Diâmetro", clean(data.get("diameter"))], ["Outra medida", clean(data.get("width"))]].filter(([, value]) => value);
  return parts.length ? parts.map(([label, value]) => `${label}: ${value}`).join(" · ") : "Não informadas";
}

function buildWhatsAppMessage(data, code, fileCount, registered) {
  const lines = [
    "Olá, FR Usinagens.", "", registered ? "Acabei de registrar uma solicitação pelo site." : "Gostaria de solicitar uma análise.",
    code ? `Código: ${code}` : null, "", `Nome: ${clean(data.get("name"))}`,
    clean(data.get("company")) ? `Empresa: ${clean(data.get("company"))}` : null,
    clean(data.get("city")) ? `Cidade: ${clean(data.get("city"))}` : null,
    `Telefone: ${clean(data.get("phone"))}`, `Necessidade: ${clean(data.get("service"))}`,
    clean(data.get("quantity")) ? `Quantidade: ${clean(data.get("quantity"))}` : null,
    `Material: ${clean(data.get("material")) || "Não sei informar"}`, `Medidas: ${buildDimensions(data)}`,
    `Urgência: ${clean(data.get("urgency")) || "Normal"}`, "", "Descrição:", clean(data.get("message")),
    fileCount ? "" : null, fileCount ? `Tenho ${fileCount} arquivo(s) para enviar aqui no WhatsApp.` : null,
  ].filter(Boolean);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function validateFiles(files) {
  if (files.length > MAX_FILES) return `Envie no máximo ${MAX_FILES} arquivos.`;
  let total = 0;
  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) return `${file.name}: formato não permitido.`;
    if (file.size > MAX_FILE_SIZE) return `${file.name}: o limite por arquivo é 8 MB.`;
    total += file.size;
  }
  return total > MAX_TOTAL_SIZE ? "Os arquivos juntos ultrapassam o limite de 20 MB." : "";
}

function setupDraft(form, getStep, setStep) {
  const save = () => {
    try {
      const fields = {};
      for (const element of form.elements) {
        if (!element.name || element.type === "file" || element.type === "submit" || element.type === "button") continue;
        if (element.type === "radio") { if (element.checked) fields[element.name] = element.value; continue; }
        if (element.type === "checkbox") { fields[element.name] = element.checked; continue; }
        fields[element.name] = element.value;
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ fields, step: getStep(), saved_at: Date.now() }));
    } catch { /* non-critical */ }
  };
  const restore = () => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || "null");
      if (!draft?.fields || Date.now() - Number(draft.saved_at || 0) > 7 * 24 * 60 * 60 * 1000) return false;
      Object.entries(draft.fields).forEach(([name, value]) => {
        const controls = [...form.querySelectorAll(`[name="${CSS.escape(name)}"]`)];
        controls.forEach((control) => {
          if (control.type === "radio") control.checked = control.value === value;
          else if (control.type === "checkbox") control.checked = Boolean(value);
          else control.value = value ?? "";
        });
      });
      setStep(Math.max(0, Math.min(4, Number(draft.step) || 0)), false);
      return true;
    } catch { return false; }
  };
  const clear = () => { try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* ignored */ } };
  form.addEventListener("input", save);
  form.addEventListener("change", save);
  return { save, restore, clear };
}

function setupFiles(form, updateSummary) {
  const input = form.querySelector("#quote-files");
  const zone = form.querySelector("[data-upload-zone]");
  const list = form.querySelector("#quote-file-list");
  let selectedFiles = [];
  let previewUrls = [];

  const syncInput = () => {
    if (typeof DataTransfer === "undefined") return;
    const transfer = new DataTransfer(); selectedFiles.forEach((file) => transfer.items.add(file)); input.files = transfer.files;
  };
  const render = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url)); previewUrls = []; list.replaceChildren();
    selectedFiles.forEach((file, index) => {
      const item = document.createElement("li");
      if (file.type.startsWith("image/")) { const img = document.createElement("img"); const url = URL.createObjectURL(file); previewUrls.push(url); img.src = url; img.alt = ""; item.append(img); }
      else { const icon = document.createElement("span"); icon.className = "quote-file-icon"; icon.textContent = "PDF"; item.append(icon); }
      const copy = document.createElement("span"); copy.className = "quote-file-copy";
      const name = document.createElement("strong"); name.textContent = file.name;
      const size = document.createElement("small"); size.textContent = formatBytes(file.size); copy.append(name, size);
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "quote-upload__remove"; remove.textContent = "REMOVER"; remove.setAttribute("aria-label", `Remover ${file.name}`);
      remove.addEventListener("click", () => { selectedFiles.splice(index, 1); syncInput(); render(); });
      item.append(copy, remove); list.append(item);
    });
    updateSummary(selectedFiles);
  };
  const accept = (incoming) => {
    const unique = [...selectedFiles];
    for (const file of incoming) if (!unique.some((current) => current.name === file.name && current.size === file.size && current.lastModified === file.lastModified)) unique.push(file);
    const error = validateFiles(unique);
    if (error) { input.setCustomValidity(error); input.reportValidity(); input.setCustomValidity(""); return; }
    selectedFiles = unique; syncInput(); render();
  };
  input.addEventListener("change", () => accept([...input.files]));
  ["dragenter", "dragover"].forEach((type) => zone.addEventListener(type, (event) => { event.preventDefault(); zone.classList.add("is-dragging"); }));
  ["dragleave", "drop"].forEach((type) => zone.addEventListener(type, (event) => { event.preventDefault(); zone.classList.remove("is-dragging"); }));
  zone.addEventListener("drop", (event) => accept([...event.dataTransfer.files]));
  return { getFiles: () => [...selectedFiles], reset() { selectedFiles = []; input.value = ""; render(); } };
}

function setupSummary(form) {
  const fields = Object.fromEntries([...form.querySelectorAll("[data-summary]")].map((el) => [el.dataset.summary, el]));
  const unknown = form.querySelector("#unknown-dimensions");
  const dimensions = ["#length", "#diameter", "#width"].map((selector) => form.querySelector(selector));
  const update = (files = []) => {
    const data = new FormData(form);
    if (fields.service) fields.service.textContent = clean(data.get("service")) || "—";
    if (fields.quantity) fields.quantity.textContent = clean(data.get("quantity")) || "Não informada";
    if (fields.material) fields.material.textContent = clean(data.get("material")) || "Não sei informar";
    if (fields.dimensions) fields.dimensions.textContent = buildDimensions(data);
    if (fields.files) fields.files.textContent = files.length ? `${files.length} arquivo${files.length > 1 ? "s" : ""}` : "Nenhum";
    if (fields.urgency) fields.urgency.textContent = clean(data.get("urgency")) || "Normal";
    if (fields.contact) fields.contact.textContent = [clean(data.get("name")), clean(data.get("phone"))].filter(Boolean).join(" · ") || "—";
    if (fields.city) fields.city.textContent = clean(data.get("city")) || "Não informada";
    if (fields.description) fields.description.textContent = clean(data.get("message")) || "—";
  };
  unknown.addEventListener("change", () => { dimensions.forEach((input) => { input.disabled = unknown.checked; if (unknown.checked) input.value = ""; }); update(); });
  form.addEventListener("input", () => update()); form.addEventListener("change", () => update()); update(); return update;
}

async function registerQuote(form, files) {
  const payload = new FormData(form); payload.delete("files"); files.forEach((file) => payload.append("files", file, file.name));
  const response = await fetch("/api/quotes", { method: "POST", body: payload, headers: { Accept: "application/json" } });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true || !body?.data) {
    const error = new Error(body?.error?.message || (response.ok ? "Backend de orçamento indisponível neste ambiente." : `Falha ao registrar (${response.status}).`));
    error.status = response.ok ? 503 : response.status; error.code = body?.error?.code || "request_failed"; throw error;
  }
  return body.data;
}

function validateStep(step) {
  const controls = [...step.querySelectorAll("input,select,textarea")].filter((el) => !el.disabled && el.type !== "file");
  for (const control of controls) {
    if (!control.checkValidity()) { control.reportValidity(); control.focus({ preventScroll: true }); control.scrollIntoView({ behavior: "smooth", block: "center" }); return false; }
  }
  return true;
}

function setupWizard(form, updateSummary, getFiles) {
  const steps = [...form.querySelectorAll("[data-quote-step]")];
  const progress = form.querySelector(".quote-progress i");
  const progressLabel = form.querySelector("#quote-progress-label");
  const progressTitle = form.querySelector("#quote-progress-title");
  let current = 0;
  let draft;
  const setStep = (index, focus = true) => {
    current = Math.max(0, Math.min(steps.length - 1, index));
    steps.forEach((step, i) => { const active = i === current; step.hidden = !active; step.classList.toggle("is-active", active); });
    progress.style.setProperty("--progress", `${((current + 1) / steps.length) * 100}%`);
    progressLabel.textContent = `ETAPA ${current + 1} DE ${steps.length}`; progressTitle.textContent = STEP_TITLES[current];
    updateSummary(getFiles()); draft?.save();
    if (focus) { const heading = steps[current].querySelector("h4"); heading?.focus?.({ preventScroll: true }); steps[current].scrollIntoView({ behavior: "smooth", block: "start" }); }
  };
  draft = setupDraft(form, () => current, setStep);
  form.addEventListener("click", (event) => {
    const next = event.target.closest("[data-quote-next]"); const prev = event.target.closest("[data-quote-prev]");
    if (next) { if (validateStep(steps[current])) setStep(current + 1); }
    if (prev) setStep(current - 1);
  });
  draft.restore(); setStep(current, false);
  return { getCurrent: () => current, setStep, clearDraft: draft.clear, reset() { setStep(0, false); } };
}

export function setupQuoteForm() {
  const form = document.querySelector("#quote-form"); if (!form) return;
  const status = document.querySelector("#form-status"); const submit = document.querySelector("#quote-submit"); const success = document.querySelector("#quote-success"); const successCode = document.querySelector("#quote-success-code"); const copyCode = document.querySelector("#copy-quote-code"); const successWhatsApp = document.querySelector("#success-whatsapp"); const fallbackWhatsApp = document.querySelector("#fallback-whatsapp");
  const updateSummary = setupSummary(form); let fileState; const wizard = setupWizard(form, updateSummary, () => fileState?.getFiles?.() || []); fileState = setupFiles(form, updateSummary); form.querySelector("#unknown-dimensions")?.dispatchEvent(new Event("change")); updateSummary(fileState.getFiles());

  copyCode?.addEventListener("click", async () => { const code = clean(successCode?.textContent); if (!code || code === "—") return; try { await navigator.clipboard.writeText(code); copyCode.textContent = "CÓDIGO COPIADO"; } catch { copyCode.textContent = code; } });
  document.querySelector("#new-quote-request")?.addEventListener("click", () => { form.reset(); fileState.reset(); wizard.clearDraft(); success.hidden = true; form.querySelector(".quote-wizard-head").hidden = false; fallbackWhatsApp.hidden = true; copyCode.textContent = "COPIAR CÓDIGO"; [...form.querySelectorAll("[data-quote-step]")].forEach((step) => { step.hidden = true; }); wizard.reset(); updateSummary([]); form.querySelector("#unknown-dimensions")?.dispatchEvent(new Event("change")); });

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); setStatus(status);
    if (!validateStep(form.querySelector('[data-quote-step="4"]')) || !form.reportValidity()) return;
    const files = fileState.getFiles(); const fileError = validateFiles(files); if (fileError) { setStatus(status, fileError, "error"); return; }
    const data = new FormData(form); fallbackWhatsApp.hidden = true; submit.disabled = true; submit.setAttribute("aria-busy", "true"); setStatus(status, "Registrando sua solicitação com segurança…");
    try {
      const result = await registerQuote(form, files); const code = clean(result?.public_code).toUpperCase(); const token = clean(result?.tracking_token); saveTrackingToken(code, token);
      successCode.textContent = code || "—"; successWhatsApp.href = buildWhatsAppMessage(data, code, files.length, true); const trackingCode = document.querySelector("#tracking-code"); if (trackingCode) trackingCode.value = code;
      wizard.clearDraft(); [...form.querySelectorAll("[data-quote-step]")].forEach((step) => { step.hidden = true; }); form.querySelector(".quote-wizard-head").hidden = true; success.hidden = false; setStatus(status, ""); success.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      const unavailable = [404,405,501,502,503].includes(error.status) || error instanceof TypeError;
      if (unavailable) { setStatus(status, "O registro online não está disponível neste ambiente. Nenhum dado foi salvo; você ainda pode continuar somente pelo WhatsApp.", "error"); fallbackWhatsApp.href = buildWhatsAppMessage(data, "", files.length, false); fallbackWhatsApp.hidden = false; }
      else setStatus(status, error.message || "Não foi possível registrar a solicitação. Revise os dados e tente novamente.", "error");
    } finally { submit.disabled = false; submit.removeAttribute("aria-busy"); }
  });

  setupTracking();
}

function setupTracking() {
  const form = document.querySelector("#tracking-form"); if (!form) return;
  const status = document.querySelector("#tracking-status"); const result = document.querySelector("#tracking-result"); const codeInput = form.querySelector("#tracking-code");
  const fill = (data) => {
    result.querySelector('[data-track="code"]').textContent = data.public_code || "—"; result.querySelector('[data-track="status"]').textContent = data.status_label || data.status || "—";
    result.querySelector('[data-track="created"]').textContent = formatDate(data.created_at); result.querySelector('[data-track="updated"]').textContent = formatDate(data.updated_at); result.querySelector('[data-track="note"]').textContent = data.public_note || "Sem observação pública no momento.";
    const host = result.querySelector('[data-track="timeline"]'); host.replaceChildren(); const entries = data.history || [];
    entries.forEach((entry, index) => { const item = document.createElement("div"); item.className = `tracking-timeline__item ${index === entries.length - 1 ? "is-current" : "is-done"}`; const dot = document.createElement("i"); const copy = document.createElement("span"); const strong = document.createElement("strong"); strong.textContent = entry.status_label || entry.status; const time = document.createElement("small"); time.textContent = formatDate(entry.created_at); copy.append(strong, time); if (entry.public_note) { const note = document.createElement("p"); note.textContent = entry.public_note; copy.append(note); } item.append(dot, copy); host.append(item); });
    result.hidden = false;
  };
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); result.hidden = true; setStatus(status); const code = clean(codeInput.value).toUpperCase(); if (!code) return; codeInput.value = code; const token = getStoredTokens()[code];
    if (!token) { setStatus(status, "A chave privada desta solicitação não está salva neste navegador. Use o dispositivo que registrou o pedido ou fale com a FR.", "error"); return; }
    const button = form.querySelector("button"); button.disabled = true; button.setAttribute("aria-busy", "true"); setStatus(status, "Consultando…");
    try { const response = await fetch(`/api/quotes/${encodeURIComponent(code)}`, { headers: { Accept: "application/json", "X-Quote-Token": token } }); const body = await response.json().catch(() => null); if (!response.ok || body?.success !== true || !body?.data) throw new Error(body?.error?.message || "Não foi possível consultar esta solicitação."); fill(body.data); setStatus(status, "Status atualizado.", "success"); }
    catch (error) { setStatus(status, error.message || "Não foi possível consultar agora.", "error"); }
    finally { button.disabled = false; button.removeAttribute("aria-busy"); }
  });
}
