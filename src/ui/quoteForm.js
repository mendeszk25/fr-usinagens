const WHATSAPP_NUMBER = "5581973091369";
const MAX_FILES = 4;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_TOTAL_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const TOKEN_STORAGE_KEY = "fr-usinagens.quote-tokens.v1";

function clean(value) {
  return String(value || "").trim();
}

function setStatus(element, message = "", kind = "") {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", kind === "error");
  element.classList.toggle("is-success", kind === "success");
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".0", "")} MB`;
}

function getStoredTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function saveTrackingToken(code, token) {
  if (!code || !token) return;
  try {
    const tokens = getStoredTokens();
    tokens[code.toUpperCase()] = token;
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // Tracking still works for the current response even if local storage is blocked.
  }
}

function buildDimensions(data) {
  if (data.get("unknown_dimensions")) return "Não sei informar";
  const parts = [
    ["Comprimento", clean(data.get("length"))],
    ["Diâmetro", clean(data.get("diameter"))],
    ["Outra medida", clean(data.get("width"))],
  ].filter(([, value]) => value);
  return parts.length ? parts.map(([label, value]) => `${label}: ${value}`).join(" · ") : "Não informadas";
}

function buildWhatsAppMessage(data, code, fileCount, registered) {
  const lines = [
    "Olá, FR Usinagens.",
    "",
    registered ? "Acabei de registrar uma solicitação pelo site." : "Gostaria de solicitar uma análise.",
    code ? `Código: ${code}` : null,
    "",
    `Nome: ${clean(data.get("name"))}`,
    clean(data.get("company")) ? `Empresa: ${clean(data.get("company"))}` : null,
    `Telefone: ${clean(data.get("phone"))}`,
    `Necessidade: ${clean(data.get("service"))}`,
    clean(data.get("quantity")) ? `Quantidade: ${clean(data.get("quantity"))}` : null,
    `Material: ${clean(data.get("material")) || "Não sei informar"}`,
    `Medidas: ${buildDimensions(data)}`,
    `Urgência: ${clean(data.get("urgency")) || "Normal"}`,
    "",
    "Descrição:",
    clean(data.get("message")),
    fileCount ? "" : null,
    fileCount ? `Tenho ${fileCount} arquivo(s) para enviar aqui no WhatsApp.` : null,
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
  if (total > MAX_TOTAL_SIZE) return "Os arquivos juntos ultrapassam o limite de 20 MB.";
  return "";
}

function setupFiles(form, updateSummary) {
  const input = form.querySelector("#quote-files");
  const zone = form.querySelector("[data-upload-zone]");
  const list = form.querySelector("#quote-file-list");
  let selectedFiles = [];

  const syncInput = () => {
    if (typeof DataTransfer === "undefined") return;
    const transfer = new DataTransfer();
    selectedFiles.forEach((file) => transfer.items.add(file));
    input.files = transfer.files;
  };

  const render = () => {
    list.replaceChildren();
    selectedFiles.forEach((file, index) => {
      const item = document.createElement("li");
      const name = document.createElement("strong");
      name.textContent = file.name;
      const size = document.createElement("span");
      size.textContent = formatBytes(file.size);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "quote-upload__remove";
      remove.textContent = "REMOVER";
      remove.setAttribute("aria-label", `Remover ${file.name}`);
      remove.addEventListener("click", () => {
        selectedFiles.splice(index, 1);
        syncInput();
        render();
      });
      item.append(name, size, remove);
      list.append(item);
    });
    updateSummary(selectedFiles);
  };

  const accept = (incoming) => {
    const unique = [...selectedFiles];
    for (const file of incoming) {
      if (!unique.some((current) => current.name === file.name && current.size === file.size && current.lastModified === file.lastModified)) {
        unique.push(file);
      }
    }
    const error = validateFiles(unique);
    if (error) {
      input.setCustomValidity(error);
      input.reportValidity();
      input.setCustomValidity("");
      return;
    }
    selectedFiles = unique;
    syncInput();
    render();
  };

  input.addEventListener("change", () => accept([...input.files]));
  ["dragenter", "dragover"].forEach((type) => zone.addEventListener(type, (event) => {
    event.preventDefault();
    zone.classList.add("is-dragging");
  }));
  ["dragleave", "drop"].forEach((type) => zone.addEventListener(type, (event) => {
    event.preventDefault();
    zone.classList.remove("is-dragging");
  }));
  zone.addEventListener("drop", (event) => accept([...event.dataTransfer.files]));

  return {
    getFiles: () => [...selectedFiles],
    reset() {
      selectedFiles = [];
      input.value = "";
      render();
    },
  };
}

function setupSummary(form) {
  const fields = Object.fromEntries(
    [...form.querySelectorAll("[data-summary]")].map((element) => [element.dataset.summary, element]),
  );
  const unknown = form.querySelector("#unknown-dimensions");
  const dimensions = ["#length", "#diameter", "#width"].map((selector) => form.querySelector(selector));

  const update = (files = [...form.querySelector("#quote-files").files]) => {
    const data = new FormData(form);
    if (fields.service) fields.service.textContent = clean(data.get("service")) || "—";
    if (fields.quantity) fields.quantity.textContent = clean(data.get("quantity")) || "Não informada";
    if (fields.material) fields.material.textContent = clean(data.get("material")) || "Não sei informar";
    if (fields.dimensions) fields.dimensions.textContent = buildDimensions(data);
    if (fields.files) fields.files.textContent = files.length ? `${files.length} arquivo${files.length > 1 ? "s" : ""}` : "Nenhum";
    if (fields.urgency) fields.urgency.textContent = clean(data.get("urgency")) || "Normal";
  };

  unknown.addEventListener("change", () => {
    dimensions.forEach((input) => {
      input.disabled = unknown.checked;
      if (unknown.checked) input.value = "";
    });
    update();
  });
  form.addEventListener("input", () => update());
  form.addEventListener("change", () => update());
  update();
  return update;
}

async function registerQuote(form, files) {
  const payload = new FormData(form);
  payload.delete("files");
  files.forEach((file) => payload.append("files", file, file.name));

  const response = await fetch("/api/quotes", {
    method: "POST",
    body: payload,
    headers: { Accept: "application/json" },
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || body?.success !== true || !body?.data) {
    const error = new Error(body?.error?.message || (response.ok ? "Backend de orçamento indisponível neste ambiente." : `Falha ao registrar (${response.status}).`));
    error.status = response.ok ? 503 : response.status;
    error.code = body?.error?.code || (response.ok ? "backend_unavailable" : "request_failed");
    throw error;
  }
  return body.data;
}

function openWhatsApp(url, popup) {
  if (popup && !popup.closed && popup.location) {
    try {
      popup.location.href = url;
      return;
    } catch {
      // Fall through and open a new tab if the pre-opened window is not writable.
    }
  }
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) window.location.href = url;
}

export function setupQuoteForm() {
  const form = document.querySelector("#quote-form");
  if (!form) return;

  const status = document.querySelector("#form-status");
  const submit = document.querySelector("#quote-submit");
  const success = document.querySelector("#quote-success");
  const successCode = document.querySelector("#quote-success-code");
  const copyCode = document.querySelector("#copy-quote-code");
  const updateSummary = setupSummary(form);
  const fileState = setupFiles(form, updateSummary);

  copyCode?.addEventListener("click", async () => {
    const code = clean(successCode?.textContent);
    if (!code || code === "—") return;
    try {
      await navigator.clipboard.writeText(code);
      copyCode.textContent = "CÓDIGO COPIADO";
    } catch {
      copyCode.textContent = code;
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(status);
    if (!form.reportValidity()) return;

    const files = fileState.getFiles();
    const fileError = validateFiles(files);
    if (fileError) {
      setStatus(status, fileError, "error");
      return;
    }

    const data = new FormData(form);
    const popup = window.open("about:blank", "_blank");
    if (popup) {
      try { popup.opener = null; } catch { /* ignored */ }
      popup.document?.write?.("<!doctype html><title>FR Usinagens</title><body style='font-family:system-ui;background:#0a0d0f;color:#eee;padding:24px'>Preparando sua conversa com a FR Usinagens…</body>");
    }

    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
    setStatus(status, "Registrando sua solicitação com segurança…");

    let registered = false;
    let code = "";
    try {
      const result = await registerQuote(form, files);
      registered = true;
      code = clean(result?.public_code).toUpperCase();
      const token = clean(result?.tracking_token);
      saveTrackingToken(code, token);
      if (code) {
        successCode.textContent = code;
        success.hidden = false;
        const trackingCode = document.querySelector("#tracking-code");
        if (trackingCode) trackingCode.value = code;
      }
      setStatus(status, `Solicitação ${code || ""} registrada. Abrindo o WhatsApp para continuar a conversa.`, "success");
    } catch (error) {
      const backendUnavailable = [404, 405, 501, 502, 503].includes(error.status) || error instanceof TypeError;
      if (!backendUnavailable) {
        popup?.close?.();
        setStatus(status, error.message || "Não foi possível registrar a solicitação. Revise os dados e tente novamente.", "error");
        submit.disabled = false;
        submit.removeAttribute("aria-busy");
        return;
      }
      setStatus(
        status,
        "O registro online não está configurado neste ambiente. Nenhum dado foi salvo no site; vamos continuar somente pelo WhatsApp.",
        "error",
      );
    }

    const whatsapp = buildWhatsAppMessage(data, code, files.length, registered);
    openWhatsApp(whatsapp, popup);
    submit.disabled = false;
    submit.removeAttribute("aria-busy");
  });

  setupTracking();
}

function setupTracking() {
  const form = document.querySelector("#tracking-form");
  if (!form) return;
  const status = document.querySelector("#tracking-status");
  const result = document.querySelector("#tracking-result");
  const codeInput = form.querySelector("#tracking-code");

  const fill = (data) => {
    result.querySelector('[data-track="code"]').textContent = data.public_code || "—";
    result.querySelector('[data-track="status"]').textContent = data.status_label || data.status || "—";
    result.querySelector('[data-track="updated"]').textContent = data.updated_at
      ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(data.updated_at))
      : "—";
    result.querySelector('[data-track="note"]').textContent = data.public_note || "Sem observação pública no momento.";
    result.hidden = false;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    result.hidden = true;
    setStatus(status);
    const code = clean(codeInput.value).toUpperCase();
    if (!code) return;
    codeInput.value = code;
    const token = getStoredTokens()[code];
    if (!token) {
      setStatus(status, "A chave privada desta solicitação não está salva neste navegador. Use o dispositivo que registrou o pedido ou fale com a FR.", "error");
      return;
    }

    const button = form.querySelector("button");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    setStatus(status, "Consultando…");
    try {
      const response = await fetch(`/api/quotes/${encodeURIComponent(code)}`, {
        headers: { Accept: "application/json", "X-Quote-Token": token },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.success !== true || !body?.data) {
        throw new Error(body?.error?.message || (response.ok ? "O acompanhamento online não está configurado neste ambiente." : "Não foi possível consultar esta solicitação."));
      }
      fill(body.data);
      setStatus(status, "Status atualizado.", "success");
    } catch (error) {
      setStatus(status, error.message || "Não foi possível consultar agora.", "error");
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  });
}
