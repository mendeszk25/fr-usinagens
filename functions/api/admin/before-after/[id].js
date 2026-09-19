import { ok, fail, methodNotAllowed } from "../../../_lib/http.js";
import { isAdmin } from "../../../_lib/adminAuth.js";
function text(value,max=800){return String(value??"").replace(/\u0000/g,"").trim().slice(0,max)}
function integer(value,fallback=0){const n=Number(value);return Number.isInteger(n)?n:fallback}
async function mediaExists(env,id){if(!id)return true;return Boolean(await env.DB.prepare("SELECT 1 FROM site_media WHERE id=? LIMIT 1").bind(id).first())}
export async function onRequest(context){
  const {request,env,params}=context;
  if(!(await isAdmin(request,env)))return fail("unauthorized","Sessão administrativa inválida.",401);
  if(!env.DB)return fail("backend_not_configured","Banco de dados não configurado.",503);
  const id=String(params.id||"");const cur=await env.DB.prepare("SELECT * FROM before_after_cases WHERE id=? LIMIT 1").bind(id).first();if(!cur)return fail("not_found","Comparativo não encontrado.",404);
  if(request.method==="PATCH"){
    let body;try{body=await request.json()}catch{return fail("invalid_json","Dados inválidos.",400)}
    const title=body?.title===undefined?cur.title:text(body.title,140);const description=body?.description===undefined?cur.description:(text(body.description,800)||null);const before=body?.before_file_id===undefined?cur.before_file_id:(text(body.before_file_id,100)||null);const after=body?.after_file_id===undefined?cur.after_file_id:(text(body.after_file_id,100)||null);const published=body?.published===undefined?Number(cur.published):(body.published?1:0);const sortOrder=body?.sort_order===undefined?Number(cur.sort_order||0):integer(body.sort_order,0);
    if(title.length<2)return fail("validation_error","Informe o título do comparativo.",400);if(!(await mediaExists(env,before))||!(await mediaExists(env,after)))return fail("invalid_media","Uma das imagens não existe.",400);if(published&&(!before||!after))return fail("validation_error","Adicione as imagens antes de publicar.",400);
    await env.DB.prepare(`UPDATE before_after_cases SET title=?,description=?,before_file_id=?,after_file_id=?,published=?,sort_order=?,updated_at=? WHERE id=?`).bind(title,description,before,after,published,sortOrder,new Date().toISOString(),id).run();return ok({id});
  }
  if(request.method==="DELETE"){await env.DB.prepare("DELETE FROM before_after_cases WHERE id=?").bind(id).run();return ok({deleted:true});}
  return methodNotAllowed(["PATCH","DELETE"]);
}
