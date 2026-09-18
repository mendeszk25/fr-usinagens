import { createMachiningScroll } from "./useMachiningScroll.js";
import { createTechnicalAnnotation } from "./TechnicalAnnotation.js";
import { activePart, chapters } from "../data/latheParts.js";
import { range } from "./animation.js";

export function mountMachiningExperience(section) {
  const stage = section.querySelector(".experience-stage");
  const host = section.querySelector("#canvas-host");
  const loading = section.querySelector(".scene-loading");
  const fallback = section.querySelector("#scene-fallback");
  const toggle = section.querySelector("#motion-toggle");
  const annotation = createTechnicalAnnotation(stage);
  const hero = stage.querySelector(".hero-copy");
  const narrative = stage.querySelector(".narrative");
  const bar = stage.querySelector("#scroll-progress");
  const step = stage.querySelector("#step-number");
  const label = stage.querySelector("#step-label");

  let canvas;
  let scroll;
  let progress = 0;
  let staticMode = false;
  let disposed = false;
  let frame = 0;
  let currentChapter = -1;
  let override = false;
  let failed = false;
  let contextTimer = 0;

  function draw() {
    frame = 0;
    if (disposed || failed || document.hidden) return;
    const part = staticMode || progress >= 0.88 ? undefined : activePart(progress);
    const anchor = canvas?.render(progress, part?.id);
    if (canvas) host.dataset.renderProgress = progress.toFixed(4);
    annotation.update(part, anchor, progress);
    host.style.opacity = String(staticMode ? 1 : 1 - range(progress, 0.95, 1) * 0.8);
    stage.style.setProperty("--opening", String(range(progress, 0.18, 0.32)));

    const intro = 1 - range(progress, 0.12, 0.23);
    hero.style.opacity = staticMode ? "0" : String(intro);
    hero.querySelectorAll("a").forEach((link) => {
      link.inert = staticMode || intro < 0.1;
    });
    hero.style.pointerEvents = staticMode || intro < 0.1 ? "none" : "";

    stage.classList.toggle("has-started", !staticMode && progress > 0.035);
    narrative.style.opacity = staticMode ? "1" : String(range(progress, 0.17, 0.24));
    stage.querySelector("#chapter-description").style.opacity = part ? "0" : "1";
    bar.style.transform = `scaleX(${staticMode ? 1 : progress})`;

    const chapter = staticMode ? 0 : chapters.findLastIndex((c) => progress >= c.from);
    if (chapter !== currentChapter) {
      const data = chapters[Math.max(0, chapter)];
      step.textContent = String(Math.max(0, chapter) + 1).padStart(2, "0");
      label.textContent = data.label;
      stage.querySelector("#chapter-title").textContent = data.title;
      stage.querySelector("#chapter-description").textContent = data.description;
      currentChapter = chapter;
    }
    stage.dataset.progress = progress.toFixed(4);
  }

  function requestDraw() {
    if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function permanentFallback() {
    if (disposed || failed) return;
    clearTimeout(contextTimer);
    failed = true;
    canvas?.dispose();
    canvas = null;
    scroll?.dispose();
    scroll = null;
    loading.hidden = true;
    fallback.hidden = false;
    toggle.hidden = true;
    section.classList.remove("is-context-lost");
    section.classList.add("is-fallback");
    hero.style.opacity = "1";
    hero.style.pointerEvents = "";
    hero.querySelectorAll("a").forEach((link) => {
      link.inert = false;
    });
    narrative.style.opacity = "0";
    annotation.update(null, null);
  }

  function beginContextRecovery() {
    if (disposed || failed) return;
    section.classList.add("is-context-lost");
    fallback.hidden = false;
    fallback.querySelector("p").textContent = "A visualização 3D está sendo recuperada.";
    toggle.disabled = true;
    clearTimeout(contextTimer);
    contextTimer = window.setTimeout(permanentFallback, 3000);
  }

  function finishContextRecovery() {
    if (disposed || failed) return;
    clearTimeout(contextTimer);
    section.classList.remove("is-context-lost");
    fallback.hidden = true;
    toggle.disabled = false;
    scroll?.refresh();
    requestDraw();
  }

  const observer = new ResizeObserver(() => {
    canvas?.resize();
    requestDraw();
  });
  observer.observe(host);

  function onToggle() {
    override = !override;
    scroll?.setStatic(override);
  }
  toggle.addEventListener("click", onToggle);

  // Create the scroll/pin controller immediately, before the heavy Three.js
  // renderer is imported. On slower phones this prevents the user from
  // scrolling through the hero before the mechanical timeline exists.
  scroll = createMachiningScroll(
    stage,
    (value) => {
      progress = value;
      requestDraw();
    },
    (value, reduced) => {
      staticMode = value;
      section.classList.toggle("is-static", value);
      toggle.setAttribute("aria-pressed", String(value));
      toggle.disabled = reduced;
      toggle.textContent = reduced
        ? "Movimento reduzido · vista estática"
        : value
          ? "Ativar experiência ao rolar ↗"
          : "Vista estática ↗";
      requestDraw();
    },
  );
  scroll.refresh();
  requestDraw();

  async function load() {
    try {
      const { createMachiningCanvas } = await import("./MachiningCanvas.js");
      if (disposed) return;
      canvas = createMachiningCanvas(host, {
        onContextLost: beginContextRecovery,
        onContextRestored: finishContextRecovery,
        onProfileChange: ({ viewport, quality }) => {
          stage.dataset.viewportProfile = viewport.name;
          stage.dataset.qualityTier = quality.tier;
        },
      });
      loading.hidden = true;
      // The scroll controller may already be partway through the sequence if
      // the user started swiping while Three.js was loading. Render that exact
      // pose immediately instead of restarting from the assembled state.
      scroll?.sync();
      requestDraw();

      const destination = document.getElementById(location.hash.slice(1));
      if (destination) requestAnimationFrame(() => destination.scrollIntoView());
    } catch (error) {
      console.warn("Experiência 3D indisponível; conteúdo técnico preservado.", error);
      permanentFallback();
    }
  }

  const intersection = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        intersection.disconnect();
        load();
      }
    },
    { rootMargin: "200px" },
  );
  intersection.observe(section);

  const onVisibility = () => {
    if (!document.hidden) requestDraw();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    disposed = true;
    clearTimeout(contextTimer);
    intersection.disconnect();
    observer.disconnect();
    cancelAnimationFrame(frame);
    toggle.removeEventListener("click", onToggle);
    document.removeEventListener("visibilitychange", onVisibility);
    scroll?.dispose();
    canvas?.dispose();
  };
}
