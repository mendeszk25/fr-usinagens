export const FILE_RULES = Object.freeze({
  maxFiles: 4,
  maxFileSize: 8 * 1024 * 1024,
  maxTotalSize: 20 * 1024 * 1024,
  allowedTypes: new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
});

export const STATUS_LABELS = Object.freeze({
  received: "Solicitação recebida",
  reviewing: "Em análise",
  quote_sent: "Orçamento enviado",
  approved: "Aprovado",
  in_progress: "Em execução",
  checking: "Em conferência",
  ready: "Pronto",
  completed: "Finalizado",
  cancelled: "Cancelado",
});

export const ALLOWED_STATUSES = new Set(Object.keys(STATUS_LABELS));

function text(value, max = 3000) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function nullable(value, max) {
  const result = text(value, max);
  return result || null;
}

export function validateQuoteFields(source) {
  const value = (name) => source.get ? source.get(name) : source[name];
  const name = text(value("name"), 100);
  const phone = text(value("phone"), 30);
  const requestType = text(value("service") ?? value("request_type"), 120);
  const description = text(value("message") ?? value("description"), 3000);
  const quantityRaw = text(value("quantity"), 10);
  const quantity = quantityRaw ? Number(quantityRaw) : null;

  if (name.length < 2) return { error: "Informe seu nome." };
  if (phone.replace(/\D/g, "").length < 8) return { error: "Informe um telefone válido para contato." };
  if (!requestType) return { error: "Informe o que você precisa." };
  if (description.length < 10) return { error: "Explique um pouco mais sobre a peça ou necessidade." };
  if (quantity !== null && (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000)) {
    return { error: "A quantidade deve ser um número entre 1 e 10000." };
  }

  const unknownDimensions = ["1", "true", "on"].includes(text(value("unknown_dimensions"), 10).toLowerCase());
  const dimensions = unknownDimensions
    ? { unknown: true, length: null, diameter: null, width: null }
    : {
        unknown: false,
        length: nullable(value("length"), 40),
        diameter: nullable(value("diameter"), 40),
        width: nullable(value("width"), 40),
      };

  return {
    data: {
      customer_name: name,
      phone,
      company: nullable(value("company"), 140),
      request_type: requestType,
      quantity,
      material: nullable(value("material"), 80) || "Não sei informar",
      dimensions_json: JSON.stringify(dimensions),
      description,
      urgency: nullable(value("urgency"), 80) || "Normal",
    },
  };
}

export function validateFiles(files) {
  if (files.length > FILE_RULES.maxFiles) return `Envie no máximo ${FILE_RULES.maxFiles} arquivos.`;
  let total = 0;
  const extensions = {
    "image/jpeg": new Set(["jpg", "jpeg"]),
    "image/png": new Set(["png"]),
    "image/webp": new Set(["webp"]),
    "application/pdf": new Set(["pdf"]),
  };
  for (const file of files) {
    if (!FILE_RULES.allowedTypes.has(file.type)) return `${file.name}: formato não permitido.`;
    const extension = String(file.name || "").split(".").pop()?.toLowerCase() || "";
    if (!extensions[file.type]?.has(extension)) return `${file.name}: extensão incompatível com o tipo do arquivo.`;
    if (file.size <= 0) return `${file.name}: arquivo vazio.`;
    if (file.size > FILE_RULES.maxFileSize) return `${file.name}: o limite por arquivo é 8 MB.`;
    total += file.size;
  }
  if (total > FILE_RULES.maxTotalSize) return "Os arquivos juntos ultrapassam o limite de 20 MB.";
  return "";
}

export function fileSignatureMatches(type, bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (type === "image/jpeg") return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (type === "image/png") return b.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value, index) => b[index] === value);
  if (type === "image/webp") return b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP";
  if (type === "application/pdf") return b.length >= 5 && String.fromCharCode(...b.slice(0, 5)) === "%PDF-";
  return false;
}

export function safeFilename(name) {
  const base = String(name || "arquivo")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return base || "arquivo";
}

export function extensionFor(type) {
  return ({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  })[type] || "bin";
}
