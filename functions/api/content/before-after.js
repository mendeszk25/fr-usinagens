import { ok, fail, methodNotAllowed } from "../../_lib/http.js";
export async function onRequest(context){
  if(context.request.method!=="GET")return methodNotAllowed(["GET"]);const {env}=context;if(!env.DB)return fail("backend_not_configured","Conteúdo dinâmico não configurado.",503);
  const rows=await env.DB.prepare(`SELECT id,title,description,before_file_id,after_file_id,sort_order FROM before_after_cases WHERE published=1 ORDER BY sort_order ASC,created_at DESC`).all();
  return ok({items:(rows.results||[]).map(r=>({...r,before_url:r.before_file_id?`/api/media/${r.before_file_id}`:null,after_url:r.after_file_id?`/api/media/${r.after_file_id}`:null}))}, 200, { "cache-control": "public, max-age=60, stale-while-revalidate=300" });
}
