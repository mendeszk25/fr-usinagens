import { ok, fail, methodNotAllowed } from "../../_lib/http.js";
import { isAdmin } from "../../_lib/adminAuth.js";
function text(value, max=800){return String(value??"").replace(/\u0000/g,"").trim().slice(0,max)}
function integer(value,fallback=0){const n=Number(value);return Number.isInteger(n)?n:fallback}
async function mediaExists(env,id){if(!id)return true;return Boolean(await env.DB.prepare("SELECT 1 FROM site_media WHERE id=? LIMIT 1").bind(id).first())}
export async function onRequest(context){
  const {request,env}=context;
  if(!(await isAdmin(request,env))) return fail("unauthorized","Sessão administrativa inválida.",401);
  if(!env.DB) return fail("backend_not_configured","Banco de dados não configurado.",503);
  if(request.method==="GET"){
    const rows=await env.DB.prepare(`SELECT b.*, mb.original_name AS before_name, ma.original_name AS after_name FROM before_after_cases b LEFT JOIN site_media mb ON mb.id=b.before_file_id LEFT JOIN site_media ma ON ma.id=b.after_file_id ORDER BY b.sort_order ASC,b.created_at DESC`).all();
    return ok({items:(rows.results||[]).map(r=>({...r,published:Boolean(r.published),before_url:r.before_file_id?`/api/admin/media/${r.before_file_id}`:null,after_url:r.after_file_id?`/api/admin/media/${r.after_file_id}`:null}))});
  }
  if(request.method==="POST"){
    let body;try{body=await request.json()}catch{return fail("invalid_json","Dados inválidos.",400)}
    const title=text(body?.title,140);const description=text(body?.description,800)||null;const before=text(body?.before_file_id,100)||null;const after=text(body?.after_file_id,100)||null;const published=body?.published?1:0;const sortOrder=integer(body?.sort_order,0);
    if(title.length<2)return fail("validation_error","Informe o título do comparativo.",400);
    if(!(await mediaExists(env,before))||!(await mediaExists(env,after)))return fail("invalid_media","Uma das imagens não existe.",400);
    if(published&&(!before||!after))return fail("validation_error","Adicione as imagens de antes e depois antes de publicar.",400);
    const id=crypto.randomUUID();const now=new Date().toISOString();
    await env.DB.prepare(`INSERT INTO before_after_cases(id,title,description,before_file_id,after_file_id,published,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(id,title,description,before,after,published,sortOrder,now,now).run();
    return ok({id},201);
  }
  return methodNotAllowed(["GET","POST"]);
}
