function escapeAttr(value) { return String(value || "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","\'":"&#39;"}[char])); }

function makeWork(item, index) {
  const article = document.createElement("article");
  article.className = "dynamic-work-card";
  const figure = document.createElement("figure");
  const img = document.createElement("img");
  img.src = item.image_url;
  img.alt = item.title || "Trabalho publicado pela FR Usinagens";
  img.loading = "lazy";
  img.decoding = "async";
  figure.append(img);
  const meta = document.createElement("div");
  meta.className = "dynamic-work-card__meta";
  const tag = document.createElement("span");
  tag.textContent = `${item.category || "TRABALHO"} / ${String(index + 1).padStart(2, "0")}`.toUpperCase();
  const title = document.createElement("h3");
  title.textContent = item.title;
  const copy = document.createElement("p");
  copy.textContent = item.description || "Registro publicado pela FR Usinagens.";
  meta.append(tag, title, copy);
  article.append(figure, meta);
  return article;
}

function setupCompare(node) {
  const range = node.querySelector(".compare-range");
  if (!range) return;
  const update = () => {
    const value = Math.max(0, Math.min(100, Number(range.value)));
    node.style.setProperty("--compare-position", `${value}%`);
    range.setAttribute("aria-valuetext", `${value} por cento da imagem antes e ${100 - value} por cento da imagem depois`);
  };
  range.addEventListener("input", update);
  update();
}

function makeComparison(item) {
  const article = document.createElement("article");
  article.className = "dynamic-comparison-card";
  const heading = document.createElement("header");
  const eyebrow = document.createElement("span");
  eyebrow.textContent = "ANTES × DEPOIS / PUBLICADO";
  const title = document.createElement("h3");
  title.textContent = item.title;
  const copy = document.createElement("p");
  copy.textContent = item.description || "Comparativo publicado pela FR Usinagens.";
  heading.append(eyebrow, title, copy);

  const comparison = document.createElement("div");
  comparison.className = "repair-comparison dynamic-repair-comparison";
  comparison.dataset.beforeAfter = "";
  comparison.style.setProperty("--compare-position", "50%");
  comparison.innerHTML = `
    <div class="compare-stage">
      <img class="compare-image compare-image--before" src="${item.before_url}" alt="${item.title} antes do serviço" loading="lazy" decoding="async" />
      <div class="compare-after" aria-hidden="true"><img class="compare-image compare-image--after" src="${item.after_url}" alt="" loading="lazy" decoding="async" /></div>
      <span class="compare-label compare-label--before">ANTES</span>
      <span class="compare-label compare-label--after">DEPOIS</span>
      <div class="compare-divider" aria-hidden="true"><span class="compare-handle"><span>‹</span><span>›</span></span></div>
      <input class="compare-range" type="range" min="0" max="100" value="50" step="1" aria-label="Comparar ${escapeAttr(item.title)} antes e depois" />
      <span class="compare-hint" aria-hidden="true"><span class="compare-hint__hand">↔</span> ARRASTE PARA COMPARAR</span>
    </div>`;
  setupCompare(comparison);
  article.append(heading, comparison);
  return article;
}

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true || !body?.data) throw new Error("dynamic_content_unavailable");
  return body.data;
}

export async function setupDynamicContent() {
  const worksHost = document.querySelector("#dynamic-works");
  const comparisonsHost = document.querySelector("#dynamic-comparisons");
  const jobs = [];

  if (worksHost) jobs.push(getJson("/api/content/works").then((data) => {
    if (!data.items?.length) return;
    worksHost.replaceChildren(...data.items.filter((item) => item.image_url).map(makeWork));
    worksHost.hidden = !worksHost.children.length;
  }).catch(() => {}));

  if (comparisonsHost) jobs.push(getJson("/api/content/before-after").then((data) => {
    if (!data.items?.length) return;
    comparisonsHost.replaceChildren(...data.items.filter((item) => item.before_url && item.after_url).map(makeComparison));
    comparisonsHost.hidden = !comparisonsHost.children.length;
  }).catch(() => {}));

  await Promise.allSettled(jobs);
}
