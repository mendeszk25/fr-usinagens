import "./styles/admin.css";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const login = $("#admin-login");
const app = $("#admin-app");
const loginForm = $("#admin-login-form");
const loginStatus = $("#admin-login-status");
const dialog = $("#admin-dialog");
const detailHost = $("#admin-detail");
const confirmDialog = $("#admin-confirm");
const lightbox = $("#admin-lightbox");
let statusLabels = {};
let requestTypes = [];
let requestPage = 1;
let requestTotal = 0;
let requestPerPage = 20;
let requestMode = "list";
let debounce;

function setStatus(el, message = "", error = false) { if (!el) return; el.textContent = message; el.classList.toggle("is-error", error); el.classList.toggle("is-success", Boolean(message) && !error); }
function date(value) { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—"; }
function text(value) { return String(value ?? ""); }
function html(value) { return text(value).replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","\'":"&#39;"}[char])); }
function phoneLink(phone) { return `https://wa.me/55${String(phone || "").replace(/\D/g, "").replace(/^55/, "")}`; }

async function api(url, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  const response = await fetch(url, { credentials: "same-origin", ...options, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) {
    const error = new Error(body?.error?.message || (response.ok ? "Painel temporariamente indisponível." : `Erro ${response.status}`));
    error.status = response.status || 503;
    if (error.status === 401 && url !== "/api/admin/login") showLogin(true);
    throw error;
  }
  return body.data;
}

function showLogin(expired = false) {
  app.hidden = true; login.hidden = false;
  if (expired) setStatus(loginStatus, "Sua sessão expirou. Entre novamente para continuar.", true);
}
function showApp() { login.hidden = true; app.hidden = false; }

function switchView(name) {
  $$("[data-view-panel]").forEach((panel) => { const active = panel.dataset.viewPanel === name; panel.hidden = !active; panel.classList.toggle("is-active", active); });
  $$('[data-admin-view]').forEach((button) => button.classList.toggle("is-active", button.dataset.adminView === name));
  document.body.classList.remove("admin-nav-open");
  if (name === "overview") loadOverview();
  if (name === "requests") {
    if (matchMedia("(max-width: 820px)").matches && requestMode !== "kanban") {
      requestMode = "kanban";
      $$('[data-request-mode]').forEach((button) => button.classList.toggle("is-active", button.dataset.requestMode === "kanban"));
      $("#admin-list-view").hidden = true;
      $("#admin-kanban").hidden = false;
    }
    loadRequests();
  }
  if (name === "works") loadWorks();
  if (name === "comparisons") loadComparisons();
}

function metric(label, value, note) {
  const article = document.createElement("article");
  article.innerHTML = `<span>${label}</span><strong>${Number(value || 0)}</strong><small>${note}</small>`;
  return article;
}

async function loadOverview() {
  const host = $("#admin-metrics"); const recent = $("#admin-recent"); const activity = $("#admin-activity"); const status = $("#admin-overview-status");
  setStatus(status, "Carregando…");
  try {
    const data = await api("/api/admin/dashboard"); statusLabels = data.status_labels || statusLabels;
    host.replaceChildren(
      metric("NOVAS", data.counts.received, "solicitações recebidas"),
      metric("EM ANÁLISE", data.counts.reviewing, "aguardando decisão"),
      metric("EM EXECUÇÃO", Number(data.counts.in_progress || 0) + Number(data.counts.checking || 0), "produção + conferência"),
      metric("PRONTAS", data.counts.ready, "aguardando finalização"),
    );
    recent.replaceChildren();
    if (!data.recent.length) recent.append(empty("Nenhuma solicitação por aqui.", "Novos pedidos enviados pelo site aparecerão nesta área."));
    data.recent.forEach((item) => {
      const button = document.createElement("button"); button.className = "admin-recent__item"; button.dataset.id = item.id;
      button.innerHTML = `<span><strong>${html(item.public_code)}</strong><small>${html(item.customer_name)}</small></span><span>${html(item.status_label)}</span><span>${date(item.updated_at)}</span>`;
      button.addEventListener("click", () => openDetail(item.id)); recent.append(button);
    });
    activity.replaceChildren();
    if (!data.activity.length) activity.append(empty("Sem atividade recente.", "Mudanças de status aparecerão aqui."));
    data.activity.forEach((item) => { const row = document.createElement("div"); row.className = "admin-activity__item"; row.innerHTML = `<i></i><span><strong>${html(item.public_code)} · ${html(item.status_label)}</strong><small>${html(item.customer_name)} · ${date(item.created_at)}</small></span>`; activity.append(row); });
    setStatus(status, "");
  } catch (error) { setStatus(status, error.message, true); }
}

function empty(title, copy) { const div = document.createElement("div"); div.className = "admin-empty"; div.innerHTML = `<strong>${title}</strong><p>${copy}</p>`; return div; }
function renderStatusOptions() {
  const select = $("#admin-status-filter"); const current = select.value; select.replaceChildren(new Option("Todos os status", "")); Object.entries(statusLabels).forEach(([value,label]) => select.add(new Option(label,value))); select.value = current;
  const type = $("#admin-type-filter"); const currentType = type.value; type.replaceChildren(new Option("Todos os tipos", "")); requestTypes.forEach((value) => type.add(new Option(value,value))); type.value = currentType;
}
function requestParams() {
  const params = new URLSearchParams({ page: String(requestMode === "kanban" ? 1 : requestPage), per_page: String(requestMode === "kanban" ? 50 : 20), archived: $("#admin-archive-filter").value, order: $("#admin-order").value });
  const map = [["q", $("#admin-search").value.trim()], ["status", $("#admin-status-filter").value], ["type", $("#admin-type-filter").value], ["files", $("#admin-file-filter").value]]; map.forEach(([key,value]) => { if (value) params.set(key,value); }); return params;
}

async function loadRequests() {
  const status = $("#admin-list-status"); setStatus(status, "Carregando solicitações…");
  try {
    const data = await api(`/api/admin/quotes?${requestParams()}`); statusLabels = data.status_labels || statusLabels; requestTypes = data.request_types || requestTypes; renderStatusOptions(); requestTotal = data.total; requestPerPage = data.per_page;
    if (requestMode === "kanban") renderKanban(data.items); else renderRequestList(data.items);
    const pages = Math.max(1, Math.ceil(requestTotal / requestPerPage)); $("#admin-page").textContent = `PÁGINA ${requestPage} / ${pages} · ${requestTotal} SOLICITAÇÃO${requestTotal === 1 ? "" : "ÕES"}`; $("#admin-prev").disabled = requestPage <= 1; $("#admin-next").disabled = requestPage >= pages;
    $("#admin-pagination").hidden = requestMode === "kanban"; setStatus(status, requestMode === "kanban" && requestTotal > 50 ? `Exibindo as 50 solicitações mais relevantes do filtro atual (${requestTotal} no total).` : "");
  } catch (error) { setStatus(status, error.message, true); }
}

function renderRequestList(items) {
  const tbody = $("#admin-list"); tbody.replaceChildren();
  if (!items.length) { const tr = document.createElement("tr"); const td = document.createElement("td"); td.colSpan = 6; td.append(empty("Nenhuma solicitação por aqui.", "Ajuste os filtros ou aguarde novos pedidos.")); tr.append(td); tbody.append(tr); return; }
  items.forEach((item) => { const row = document.createElement("tr"); row.dataset.id = item.id; [item.public_code,item.customer_name,item.request_type,String(item.file_count || 0),item.status_label,date(item.updated_at)].forEach((value) => { const cell=document.createElement("td"); cell.textContent=text(value); row.append(cell); }); row.addEventListener("click",()=>openDetail(item.id)); tbody.append(row); });
}

function renderKanban(items) {
  const host = $("#admin-kanban"); host.replaceChildren();
  const usefulStatuses = Object.keys(statusLabels).filter((key) => key !== "cancelled");
  usefulStatuses.forEach((statusKey) => {
    const column=document.createElement("section");column.className="kanban-column";column.dataset.status=statusKey;
    const head=document.createElement("header");const count=items.filter(i=>i.status===statusKey).length;head.innerHTML=`<span>${html(statusLabels[statusKey])}</span><strong>${count}</strong>`;column.append(head);
    const body=document.createElement("div");body.className="kanban-column__body";body.dataset.dropStatus=statusKey;
    const cards=items.filter(i=>i.status===statusKey); if(!cards.length){const placeholder=document.createElement("p");placeholder.className="kanban-empty";placeholder.textContent="SEM SERVIÇOS";body.append(placeholder);}
    cards.forEach((item)=>{const card=document.createElement("article");card.className="kanban-card";card.draggable=true;card.dataset.id=item.id;card.dataset.status=item.status;card.innerHTML=`<span>${html(item.public_code)}</span><strong>${html(item.customer_name)}</strong><p>${html(item.request_type)}</p><small>${item.file_count?`${item.file_count} ARQ.`:"SEM ARQ."} · ${date(item.updated_at)}</small>`;card.addEventListener("click",()=>openDetail(item.id));card.addEventListener("dragstart",(event)=>{event.dataTransfer.setData("text/plain",item.id);event.dataTransfer.effectAllowed="move";card.classList.add("is-dragging")});card.addEventListener("dragend",()=>card.classList.remove("is-dragging"));body.append(card)});
    body.addEventListener("dragover",(event)=>{event.preventDefault();body.classList.add("is-over")});body.addEventListener("dragleave",()=>body.classList.remove("is-over"));body.addEventListener("drop",async(event)=>{event.preventDefault();body.classList.remove("is-over");const id=event.dataTransfer.getData("text/plain");const item=items.find(i=>i.id===id);if(!item||item.status===statusKey)return;const accepted=await askConfirm("Alterar status?",`${item.public_code} passará de “${item.status_label}” para “${statusLabels[statusKey]}”.`);if(!accepted)return;try{await api(`/api/admin/quotes/${encodeURIComponent(id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:statusKey})});await Promise.all([loadRequests(),loadOverview()])}catch(error){setStatus($("#admin-list-status"),error.message,true)}});
    column.append(body);host.append(column);
  });
}

function addDefinition(dl,label,value){const wrap=document.createElement("div");const dt=document.createElement("dt");const dd=document.createElement("dd");dt.textContent=label;dd.textContent=value||"—";wrap.append(dt,dd);dl.append(wrap)}
function buildFileGallery(files){const wrap=document.createElement("div");wrap.className="admin-file-gallery";if(!files.length){wrap.append(empty("Nenhum arquivo anexado.","O cliente enviou a solicitação sem fotos ou desenhos."));return wrap}files.forEach((file)=>{const item=document.createElement("article");const url=`/api/admin/files/${encodeURIComponent(file.id)}`;if(file.mime_type?.startsWith("image/")){const img=document.createElement("img");img.src=url;img.alt=file.original_name;img.loading="lazy";img.addEventListener("click",()=>openLightbox(url));item.append(img)}else{const pdf=document.createElement("a");pdf.href=url;pdf.target="_blank";pdf.rel="noopener";pdf.className="admin-pdf";pdf.innerHTML="<strong>PDF</strong><span>ABRIR ↗</span>";item.append(pdf)}const meta=document.createElement("div");meta.innerHTML=`<strong>${html(file.original_name)}</strong><small>${Math.max(1,Math.round(file.size_bytes/1024))} KB</small>`;item.append(meta);wrap.append(item)});return wrap}

async function openDetail(id) {
  try {
    const data=await api(`/api/admin/quotes/${encodeURIComponent(id)}`);statusLabels=data.status_labels||statusLabels;const q=data.quote;detailHost.replaceChildren();const root=document.createElement("div");root.className="admin-detail";
    const hero=document.createElement("div");hero.className="admin-detail__hero";hero.innerHTML=`<div><span>${q.archived?"ARQUIVADO":"SOLICITAÇÃO ATIVA"}</span><h2>${html(q.public_code)}</h2><p>${html(q.customer_name)} · ${html(q.phone)}</p></div><strong>${html(q.status_label)}</strong>`;
    const actions=document.createElement("div");actions.className="admin-detail__actions";const wa=document.createElement("a");wa.href=`${phoneLink(q.phone)}?text=${encodeURIComponent(`Olá, tudo bem? Estamos entrando em contato sobre sua solicitação ${q.public_code} na FR Usinagens.`)}`;wa.target="_blank";wa.rel="noopener";wa.className="admin-button";wa.textContent="FALAR COM O CLIENTE ↗";actions.append(wa);
    const dl=document.createElement("dl");dl.className="admin-detail__grid";addDefinition(dl,"Empresa",q.company);addDefinition(dl,"Cidade",q.city);addDefinition(dl,"Necessidade",q.request_type);addDefinition(dl,"Quantidade",q.quantity?String(q.quantity):"Não informada");addDefinition(dl,"Material",q.material);addDefinition(dl,"Urgência",q.urgency);addDefinition(dl,"Entrada",date(q.created_at));addDefinition(dl,"Atualização",date(q.updated_at));const dims=q.dimensions?.unknown?"Não informadas":[q.dimensions?.length&&`Comp.: ${q.dimensions.length}`,q.dimensions?.diameter&&`Ø: ${q.dimensions.diameter}`,q.dimensions?.width&&`Outra: ${q.dimensions.width}`].filter(Boolean).join(" · ")||"Não informadas";addDefinition(dl,"Medidas",dims);
    const desc=document.createElement("section");desc.className="admin-block";desc.innerHTML="<h3>DESCRIÇÃO DO CLIENTE</h3>";const p=document.createElement("p");p.textContent=q.description;desc.append(p);
    const files=document.createElement("section");files.className="admin-block";files.innerHTML=`<h3>ARQUIVOS (${q.files.length})</h3>`;files.append(buildFileGallery(q.files));
    const edit=document.createElement("form");edit.className="admin-edit";const selectLabel=document.createElement("label");selectLabel.textContent="Status";const select=document.createElement("select");Object.entries(statusLabels).forEach(([value,label])=>select.add(new Option(label,value)));select.value=q.status;selectLabel.append(select);const publicLabel=document.createElement("label");publicLabel.textContent="Atualização para o cliente";const publicText=document.createElement("textarea");publicText.maxLength=1000;publicText.value=q.public_note||"";publicText.placeholder="Ex.: estamos analisando as medidas da peça.";publicLabel.append(publicText);const internalLabel=document.createElement("label");internalLabel.textContent="Nota interna (somente oficina)";const internalText=document.createElement("textarea");internalText.maxLength=3000;internalText.value=q.internal_note||"";internalText.placeholder="Ex.: aguardar cliente trazer peça original.";internalLabel.append(internalText);const archiveLabel=document.createElement("label");archiveLabel.className="admin-check";const archive=document.createElement("input");archive.type="checkbox";archive.checked=q.archived;archiveLabel.append(archive,document.createTextNode(" Arquivar esta solicitação"));const save=document.createElement("button");save.className="admin-button";save.type="submit";save.textContent="SALVAR ALTERAÇÕES ↗";const editStatus=document.createElement("p");editStatus.className="admin-status";edit.append(selectLabel,publicLabel,internalLabel,archiveLabel,save,editStatus);
    edit.addEventListener("submit",async(event)=>{event.preventDefault();save.disabled=true;setStatus(editStatus,"Salvando…");try{await api(`/api/admin/quotes/${encodeURIComponent(id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:select.value,public_note:publicText.value,internal_note:internalText.value,archived:archive.checked,expected_updated_at:q.updated_at})});setStatus(editStatus,"Alterações salvas.");dialog.close();await Promise.all([loadRequests(),loadOverview()])}catch(error){setStatus(editStatus,error.message,true)}finally{save.disabled=false}});
    const history=document.createElement("section");history.className="admin-block";history.innerHTML="<h3>HISTÓRICO</h3>";const hist=document.createElement("div");hist.className="admin-history";q.history.forEach((entry)=>{const row=document.createElement("div");row.innerHTML=`<span>${date(entry.created_at)}</span><strong>${html(entry.status_label)}</strong><span>${html(entry.public_note||"—")}</span>`;hist.append(row)});history.append(hist);
    root.append(hero,actions,dl,desc,files,edit,history);detailHost.append(root);dialog.showModal();
  } catch(error){setStatus($("#admin-list-status"),error.message,true)}
}

function askConfirm(title,copy){return new Promise((resolve)=>{$("#admin-confirm-title").textContent=title;$("#admin-confirm-copy").textContent=copy;const ok=$("#admin-confirm-ok");const cancel=$("#admin-confirm-cancel");const finish=(value)=>{ok.removeEventListener("click",yes);cancel.removeEventListener("click",no);confirmDialog.removeEventListener("cancel",no);confirmDialog.close();resolve(value)};const yes=()=>finish(true);const no=()=>finish(false);ok.addEventListener("click",yes);cancel.addEventListener("click",no);confirmDialog.addEventListener("cancel",no,{once:true});confirmDialog.showModal()})}
function openLightbox(url){$("#admin-lightbox-image").src=url;lightbox.showModal()}

async function optimizePublicImage(file) {
  if (!file?.type?.startsWith("image/") || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1800;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", .84));
    if (!blob || (scale === 1 && blob.size >= file.size)) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "imagem";
    return new File([blob], `${base}.webp`, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  }
}
async function uploadMedia(file){const optimized=await optimizePublicImage(file);const form=new FormData();form.set("file",optimized,optimized.name);return api("/api/admin/media",{method:"POST",body:form})}
function previewImage(host,url,label="Imagem atual"){host.replaceChildren();if(!url)return;const figure=document.createElement("figure");const img=document.createElement("img");img.src=url;img.alt=label;const cap=document.createElement("figcaption");cap.textContent=label;figure.append(img,cap);host.append(figure)}
function resetWorkForm(){const form=$("#work-form");form.reset();form.elements.id.value="";form.elements.image_file_id.value="";$("#work-form-title").textContent="NOVO TRABALHO";$("#work-preview").replaceChildren();setStatus($("#work-status"),"")}
async function loadWorks(){const host=$("#work-list");const status=$("#work-status");try{const data=await api("/api/admin/works");host.replaceChildren();if(!data.items.length){host.append(empty("Nenhum trabalho cadastrado.","Cadastre apenas trabalhos reais da oficina."));return}data.items.forEach((item)=>{const row=document.createElement("article");row.className="admin-content-item";if(item.image_url){const img=document.createElement("img");img.src=item.image_url;img.alt="";row.append(img)}const copy=document.createElement("div");copy.innerHTML=`<span>${item.published?"PUBLICADO":"RASCUNHO"}${item.category?` · ${html(item.category)}`:""}</span><strong>${html(item.title)}</strong><p>${html(item.description||"")}</p>`;const actions=document.createElement("div");const edit=document.createElement("button");edit.type="button";edit.textContent="EDITAR";edit.addEventListener("click",()=>{const form=$("#work-form");form.elements.id.value=item.id;form.elements.title.value=item.title||"";form.elements.category.value=item.category||"";form.elements.description.value=item.description||"";form.elements.sort_order.value=item.sort_order||0;form.elements.published.checked=item.published;form.elements.image_file_id.value=item.image_file_id||"";$("#work-form-title").textContent="EDITAR TRABALHO";previewImage($("#work-preview"),item.image_url,"Imagem atual");form.scrollIntoView({behavior:"smooth",block:"start"})});const del=document.createElement("button");del.type="button";del.textContent="EXCLUIR";del.addEventListener("click",async()=>{if(!(await askConfirm("Excluir trabalho?",`“${item.title}” será removido do painel e do site se estiver publicado.`)))return;try{await api(`/api/admin/works/${item.id}`,{method:"DELETE"});await loadWorks()}catch(error){setStatus(status,error.message,true)}});actions.append(edit,del);row.append(copy,actions);host.append(row)})}catch(error){setStatus(status,error.message,true)}}

async function saveWork(event){event.preventDefault();const form=event.currentTarget;const status=$("#work-status");const button=form.querySelector('button[type="submit"]');button.disabled=true;setStatus(status,"Salvando…");try{let mediaId=form.elements.image_file_id.value;if(form.elements.image.files[0]){setStatus(status,"Enviando imagem…");mediaId=(await uploadMedia(form.elements.image.files[0])).id}const payload={title:form.elements.title.value,category:form.elements.category.value,description:form.elements.description.value,sort_order:Number(form.elements.sort_order.value||0),published:form.elements.published.checked,image_file_id:mediaId||null};const id=form.elements.id.value;await api(id?`/api/admin/works/${id}`:"/api/admin/works",{method:id?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});setStatus(status,"Trabalho salvo.");resetWorkForm();await loadWorks()}catch(error){setStatus(status,error.message,true)}finally{button.disabled=false}}

function resetComparisonForm(){const form=$("#comparison-form");form.reset();form.elements.id.value="";form.elements.before_file_id.value="";form.elements.after_file_id.value="";$("#comparison-form-title").textContent="NOVO COMPARATIVO";$("#comparison-preview").replaceChildren();setStatus($("#comparison-status"),"")}
function previewPair(host,before,after){host.replaceChildren();[[before,"Antes"],[after,"Depois"]].forEach(([url,label])=>{if(!url)return;const fig=document.createElement("figure");const img=document.createElement("img");img.src=url;img.alt=label;const cap=document.createElement("figcaption");cap.textContent=label;fig.append(img,cap);host.append(fig)})}
async function loadComparisons(){const host=$("#comparison-list");const status=$("#comparison-status");try{const data=await api("/api/admin/before-after");host.replaceChildren();if(!data.items.length){host.append(empty("Nenhum comparativo cadastrado.","Cadastre pares reais de antes e depois."));return}data.items.forEach((item)=>{const row=document.createElement("article");row.className="admin-content-item admin-content-item--pair";const media=document.createElement("div");media.className="admin-content-pair";[item.before_url,item.after_url].forEach((url)=>{if(url){const img=document.createElement("img");img.src=url;img.alt="";media.append(img)}});row.append(media);const copy=document.createElement("div");copy.innerHTML=`<span>${item.published?"PUBLICADO":"RASCUNHO"}</span><strong>${html(item.title)}</strong><p>${html(item.description||"")}</p>`;const actions=document.createElement("div");const edit=document.createElement("button");edit.type="button";edit.textContent="EDITAR";edit.addEventListener("click",()=>{const form=$("#comparison-form");form.elements.id.value=item.id;form.elements.title.value=item.title||"";form.elements.description.value=item.description||"";form.elements.sort_order.value=item.sort_order||0;form.elements.published.checked=item.published;form.elements.before_file_id.value=item.before_file_id||"";form.elements.after_file_id.value=item.after_file_id||"";$("#comparison-form-title").textContent="EDITAR COMPARATIVO";previewPair($("#comparison-preview"),item.before_url,item.after_url);form.scrollIntoView({behavior:"smooth",block:"start"})});const del=document.createElement("button");del.type="button";del.textContent="EXCLUIR";del.addEventListener("click",async()=>{if(!(await askConfirm("Excluir comparativo?",`“${item.title}” será removido do painel e do site se estiver publicado.`)))return;try{await api(`/api/admin/before-after/${item.id}`,{method:"DELETE"});await loadComparisons()}catch(error){setStatus(status,error.message,true)}});actions.append(edit,del);row.append(copy,actions);host.append(row)})}catch(error){setStatus(status,error.message,true)}}
async function saveComparison(event){event.preventDefault();const form=event.currentTarget;const status=$("#comparison-status");const button=form.querySelector('button[type="submit"]');button.disabled=true;setStatus(status,"Salvando…");try{let before=form.elements.before_file_id.value;let after=form.elements.after_file_id.value;if(form.elements.before_image.files[0]){setStatus(status,"Enviando imagem de antes…");before=(await uploadMedia(form.elements.before_image.files[0])).id}if(form.elements.after_image.files[0]){setStatus(status,"Enviando imagem de depois…");after=(await uploadMedia(form.elements.after_image.files[0])).id}const payload={title:form.elements.title.value,description:form.elements.description.value,sort_order:Number(form.elements.sort_order.value||0),published:form.elements.published.checked,before_file_id:before||null,after_file_id:after||null};const id=form.elements.id.value;await api(id?`/api/admin/before-after/${id}`:"/api/admin/before-after",{method:id?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});setStatus(status,"Comparativo salvo.");resetComparisonForm();await loadComparisons()}catch(error){setStatus(status,error.message,true)}finally{button.disabled=false}}

loginForm.addEventListener("submit",async(event)=>{event.preventDefault();const button=loginForm.querySelector("button");button.disabled=true;setStatus(loginStatus,"Entrando…");try{await api("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:$("#admin-password").value})});$("#admin-password").value="";setStatus(loginStatus,"");showApp();switchView("overview")}catch(error){setStatus(loginStatus,error.message,true)}finally{button.disabled=false}});
async function logout(){try{await api("/api/admin/logout",{method:"POST"})}catch{/* session can already be expired */}showLogin()}
$("#admin-logout").addEventListener("click",logout);$("#admin-mobile-logout").addEventListener("click",logout);$("#admin-menu").addEventListener("click",()=>document.body.classList.toggle("admin-nav-open"));
$$('[data-admin-view]').forEach((button)=>button.addEventListener("click",()=>switchView(button.dataset.adminView)));$$('[data-go-view]').forEach((button)=>button.addEventListener("click",()=>switchView(button.dataset.goView)));
$$('[data-request-mode]').forEach((button)=>button.addEventListener("click",()=>{requestMode=button.dataset.requestMode;$$('[data-request-mode]').forEach(b=>b.classList.toggle("is-active",b===button));$("#admin-list-view").hidden=requestMode!=="list";$("#admin-kanban").hidden=requestMode!=="kanban";requestPage=1;loadRequests()}));
$("#admin-prev").addEventListener("click",()=>{if(requestPage>1){requestPage-=1;loadRequests()}});$("#admin-next").addEventListener("click",()=>{if(requestPage*requestPerPage<requestTotal){requestPage+=1;loadRequests()}});
["#admin-status-filter","#admin-type-filter","#admin-file-filter","#admin-archive-filter","#admin-order"].forEach((selector)=>$(selector).addEventListener("change",()=>{requestPage=1;loadRequests()}));$("#admin-search").addEventListener("input",()=>{clearTimeout(debounce);debounce=setTimeout(()=>{requestPage=1;loadRequests()},260)});
$("#work-form").addEventListener("submit",saveWork);$("#comparison-form").addEventListener("submit",saveComparison);$('[data-reset-form="work"]').addEventListener("click",resetWorkForm);$('[data-reset-form="comparison"]').addEventListener("click",resetComparisonForm);
$("#admin-lightbox-close").addEventListener("click",()=>lightbox.close());lightbox.addEventListener("click",(event)=>{if(event.target===lightbox)lightbox.close()});

(async function boot(){try{await api("/api/admin/session");showApp();switchView("overview")}catch{showLogin()}})();
