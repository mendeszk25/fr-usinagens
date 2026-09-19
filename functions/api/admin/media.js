import { ok, fail, methodNotAllowed } from "../../_lib/http.js";
import { isAdmin } from "../../_lib/adminAuth.js";
import { extensionFor, fileSignatureMatches, safeFilename, validateContentImage } from "../../_lib/validation.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed(["POST"]);
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return fail("unauthorized", "Sessão administrativa inválida.", 401);
  if (!env.DB || !env.SITE_MEDIA) return fail("storage_not_configured", "Armazenamento de mídia do site não configurado.", 503);
  let form;
  try { form = await request.formData(); } catch { return fail("invalid_form", "Não foi possível ler o arquivo.", 400); }
  const file = form.get("file");
  const validation = validateContentImage(file);
  if (validation) return fail("invalid_file", validation, 400);
  const bytes = await file.arrayBuffer();
  if (!fileSignatureMatches(file.type, bytes)) return fail("invalid_file", "O conteúdo da imagem não corresponde ao formato informado.", 400);
  const id = crypto.randomUUID();
  const key = `site/${id}.${extensionFor(file.type)}`;
  const now = new Date().toISOString();
  try {
    await env.SITE_MEDIA.put(key, bytes, { httpMetadata: { contentType: file.type }, customMetadata: { originalName: safeFilename(file.name) } });
    await env.DB.prepare(`INSERT INTO site_media (id, storage_key, original_name, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(id, key, safeFilename(file.name), file.type, file.size, now).run();
  } catch (error) {
    await env.SITE_MEDIA.delete?.(key).catch?.(() => {});
    console.error("site_media_upload_failed", { message: error?.message });
    return fail("upload_failed", "Não foi possível salvar a imagem agora.", 500);
  }
  return ok({ id, url: `/api/media/${id}`, original_name: safeFilename(file.name), mime_type: file.type, size_bytes: file.size }, 201);
}
