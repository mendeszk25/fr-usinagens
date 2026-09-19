import { ok, fail, methodNotAllowed } from "../_lib/http.js";
import { randomToken, sha256 } from "../_lib/crypto.js";
import { rateLimit } from "../_lib/rateLimit.js";
import { extensionFor, fileSignatureMatches, safeFilename, validateFiles, validateQuoteFields } from "../_lib/validation.js";
import { notifyNewQuote } from "../_lib/notify.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "FR-";
  for (const byte of bytes) out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return out;
}

async function uniqueCode(db) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomCode();
    const exists = await db.prepare("SELECT 1 FROM quote_requests WHERE public_code = ? LIMIT 1").bind(code).first();
    if (!exists) return code;
  }
  throw new Error("Não foi possível gerar um código único");
}

function extractFiles(form) {
  return form.getAll("files").filter((value) => value instanceof File && value.size > 0);
}

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed(["POST"]);
  const { request, env } = context;

  if (!env.DB) return fail("service_unavailable", "O serviço de solicitação está temporariamente indisponível.", 503);

  const limited = await rateLimit(env, request, "quote", 8, 60 * 60);
  if (!limited.allowed) {
    return fail("rate_limited", "Muitas solicitações foram enviadas deste acesso. Tente novamente mais tarde.", 429, {
      "retry-after": String(limited.retryAfter),
    });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return fail("invalid_content_type", "Envie o formulário no formato multipart/form-data.", 415);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail("invalid_form", "Não foi possível ler os dados enviados.", 400);
  }

  const validated = validateQuoteFields(form);
  if (validated.error) return fail("validation_error", validated.error, 400);

  const files = extractFiles(form);
  const fileError = validateFiles(files);
  if (fileError) return fail("invalid_files", fileError, 400);
  if (files.length && !env.QUOTE_FILES) {
    return fail("storage_unavailable", "O envio de arquivos está temporariamente indisponível. Tente sem anexos ou continue pelo WhatsApp.", 503);
  }

  const id = crypto.randomUUID();
  const publicCode = await uniqueCode(env.DB);
  const trackingToken = randomToken(24);
  const trackingHash = await sha256(trackingToken);
  const now = new Date().toISOString();
  const uploaded = [];

  try {
    if (files.length) {
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        if (!fileSignatureMatches(file.type, bytes)) {
          throw Object.assign(new Error(`${file.name}: o conteúdo não corresponde ao formato informado.`), { publicCode: "invalid_file_signature" });
        }
        const fileId = crypto.randomUUID();
        const key = `quotes/${id}/${fileId}.${extensionFor(file.type)}`;
        await env.QUOTE_FILES.put(key, bytes, {
          httpMetadata: { contentType: file.type },
          customMetadata: { originalName: safeFilename(file.name) },
        });
        uploaded.push({ id: fileId, key, name: safeFilename(file.name), type: file.type, size: file.size });
      }
    }

    const quote = validated.data;
    const statements = [
      env.DB.prepare(`
        INSERT INTO quote_requests (
          id, public_code, tracking_token_hash, customer_name, phone, company, city,
          request_type, quantity, material, dimensions_json, description, urgency,
          status, public_note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', NULL, ?, ?)
      `).bind(
        id,
        publicCode,
        trackingHash,
        quote.customer_name,
        quote.phone,
        quote.company,
        quote.city,
        quote.request_type,
        quote.quantity,
        quote.material,
        quote.dimensions_json,
        quote.description,
        quote.urgency,
        now,
        now,
      ),
      env.DB.prepare(
        "INSERT INTO quote_status_history (id, quote_id, status, public_note, created_at) VALUES (?, ?, 'received', NULL, ?)",
      ).bind(crypto.randomUUID(), id, now),
      ...uploaded.map((file) => env.DB.prepare(`
        INSERT INTO quote_files (id, quote_id, storage_key, original_name, mime_type, size_bytes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(file.id, id, file.key, file.name, file.type, file.size, now)),
    ];

    await env.DB.batch(statements);
  } catch (error) {
    if (env.QUOTE_FILES) {
      await Promise.allSettled(uploaded.map((file) => env.QUOTE_FILES.delete(file.key)));
    }
    if (error?.publicCode === "invalid_file_signature") {
      return fail("invalid_files", error.message, 400);
    }
    console.error("quote_create_failed", { message: error?.message, publicCode });
    return fail("quote_create_failed", "Não foi possível registrar a solicitação agora. Tente novamente.", 500);
  }

  try {
    await notifyNewQuote(env, {
      public_code: publicCode,
      customer_name: validated.data.customer_name,
      phone: validated.data.phone,
      city: validated.data.city,
      request_type: validated.data.request_type,
      file_count: uploaded.length,
    });
  } catch (error) {
    console.error("quote_notification_failed", { message: error?.message, publicCode });
  }

  return ok({
    public_code: publicCode,
    tracking_token: trackingToken,
    status: "received",
    created_at: now,
    files_received: uploaded.length,
  }, 201);
}
