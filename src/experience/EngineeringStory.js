import { clamp01, getProcessStep } from "./engineeringState.js";
import { modelMeta } from "./MechanicalModelRegistry.js";

export function mountEngineeringStory(root = document) {
  const hosts = [...root.querySelectorAll("[data-engineering-3d]")];
  if (!hosts.length) return () => {};

  const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const processStep = root.querySelector("[data-process-step]");
  const processBar = root.querySelector("[data-process-progress]");
  const precisionOverlay = root.querySelector("[data-precision-overlay]");
  const canvases = new Map();
  const loading = new Map();
  let pointerX = 0;
  let pointerY = 0;
  let manualRotation = 0;
  let dragging = false;
  let dragX = 0;
  let dragY = 0;
  let dragStartRotation = 0;
  let dragPointerType = "";
  let frame = 0;
  let disposed = false;

  const processHost = hosts.find((host) => host.dataset.engineering3d === "process");
  const precisionHost = hosts.find((host) => host.dataset.engineering3d === "precision");
  const componentHost = hosts.find((host) => host.dataset.engineering3d === "components");

  if (componentHost) {
    const id = componentHost.dataset.modelId || "threadedPin";
    componentHost.setAttribute("aria-label", `Estudo tridimensional ilustrativo: ${modelMeta(id).displayName.toLowerCase()}`);
  }
  if (processHost) {
    const id = processHost.dataset.modelId || "gearShaft";
    processHost.setAttribute("aria-label", `Representação tridimensional ilustrativa de processo de usinagem: ${modelMeta(id).displayName.toLowerCase()}`);
  }
  if (precisionHost) {
    const id = precisionHost.dataset.modelId || "industrialAssembly";
    precisionHost.setAttribute("aria-label", `Estudo tridimensional ilustrativo para leitura técnica: ${modelMeta(id).displayName.toLowerCase()}`);
  }

  const stateFor = (host) => {
    const section = host.closest("[data-engineering-section]") || host;
    const rect = section.getBoundingClientRect();
    const viewport = Math.max(1, innerHeight);
    const travel = Math.max(1, rect.height - viewport);
    const progress = clamp01(-rect.top / travel);
    return { section, rect, progress };
  };

  const updateProcessUI = (progress) => {
    if (processBar) processBar.style.transform = `scaleX(${progress})`;
    if (processStep) processStep.textContent = String(getProcessStep(progress)).padStart(2, "0");
  };

  const updatePrecisionUI = (progress) => {
    if (!precisionOverlay) return;
    precisionOverlay.style.opacity = String(0.18 + progress * 0.82);
    precisionOverlay.classList.toggle("is-wireframe-phase", progress > 0.32 && progress < 0.82);
  };

  async function ensureCanvas(host) {
    if (disposed || canvases.has(host)) return canvases.get(host);
    if (loading.has(host)) return loading.get(host);
    const promise = import("./EngineeringCanvas.js")
      .then(({ createEngineeringCanvas }) => {
        if (disposed) return null;
        const canvas = createEngineeringCanvas(host, {
          mode: host.dataset.engineering3d || "components",
          modelId: host.dataset.modelId,
        });
        canvases.set(host, canvas);
        loading.delete(host);
        return canvas;
      })
      .catch((error) => {
        loading.delete(host);
        host.classList.add("is-webgl-unavailable");
        console.warn("Experiência 3D secundária indisponível; conteúdo editorial preservado.", error);
        return null;
      });
    loading.set(host, promise);
    return promise;
  }

  function hostNearViewport(host) {
    const rect = host.getBoundingClientRect();
    return rect.bottom > -innerHeight * 0.15 && rect.top < innerHeight * 1.15;
  }

  function renderHost(host, canvas) {
    if (!canvas || !hostNearViewport(host)) return;
    const mode = host.dataset.engineering3d || "components";
    const { progress } = stateFor(host);
    if (mode === "process") updateProcessUI(progress);
    if (mode === "precision") updatePrecisionUI(progress);
    canvas.render({
      progress,
      pointerX,
      pointerY,
      manualRotation,
      reducedMotion: reducedQuery.matches,
    });
  }

  function draw() {
    frame = 0;
    if (disposed || document.hidden) return;
    hosts.forEach((host) => {
      const canvas = canvases.get(host);
      if (canvas) renderHost(host, canvas);
      else if (hostNearViewport(host)) ensureCanvas(host).then(requestDraw);
    });
  }

  function requestDraw() {
    if (!frame && !disposed) frame = requestAnimationFrame(draw);
  }

  function onPointerMove(event) {
    const host = event.target.closest?.('[data-engineering-3d="components"]');
    if (!host) return;
    const rect = host.getBoundingClientRect();
    pointerX = clamp01((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    pointerY = clamp01((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
    if (dragging) {
      const dx = event.clientX - dragX;
      const dy = event.clientY - dragY;
      const horizontalIntent = Math.abs(dx) > Math.abs(dy) * 1.15;
      if (dragPointerType === "mouse" || horizontalIntent) {
        manualRotation = dragStartRotation + dx * (dragPointerType === "mouse" ? 0.008 : 0.0065);
      }
    }
    requestDraw();
  }

  function onPointerDown(event) {
    const host = event.target.closest?.('[data-engineering-3d="components"]');
    if (!host) return;
    dragging = true;
    dragX = event.clientX;
    dragY = event.clientY;
    dragPointerType = event.pointerType || "mouse";
    dragStartRotation = manualRotation;
    if (dragPointerType === "mouse") host.setPointerCapture?.(event.pointerId);
    host.classList.add("is-dragging");
  }

  function onPointerUp(event) {
    if (!dragging) return;
    dragging = false;
    dragPointerType = "";
    event.target.closest?.('[data-engineering-3d="components"]')?.classList.remove("is-dragging");
  }

  const resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => canvases.get(entry.target)?.resize());
    requestDraw();
  });
  hosts.forEach((host) => resizeObserver.observe(host));

  const intersection = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) ensureCanvas(entry.target).then(requestDraw);
      });
    },
    { rootMargin: "320px 0px" },
  );
  hosts.forEach((host) => intersection.observe(host));

  const onScroll = () => requestDraw();
  const onResize = () => {
    canvases.forEach((canvas) => canvas.resize());
    requestDraw();
  };
  const onVisibility = () => {
    if (!document.hidden) requestDraw();
  };
  const onReduced = () => requestDraw();

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  reducedQuery.addEventListener?.("change", onReduced);
  hosts.forEach((host) => {
    host.addEventListener("pointermove", onPointerMove, { passive: true });
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointerup", onPointerUp);
    host.addEventListener("pointercancel", onPointerUp);
  });

  requestDraw();

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    intersection.disconnect();
    resizeObserver.disconnect();
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
    reducedQuery.removeEventListener?.("change", onReduced);
    hosts.forEach((host) => {
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointercancel", onPointerUp);
    });
    canvases.forEach((canvas) => canvas.dispose());
    canvases.clear();
    loading.clear();
  };
}
