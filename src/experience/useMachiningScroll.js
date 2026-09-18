import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getViewportProfile } from "./responsive.js";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

export function createMachiningScroll(stage, onProgress, onMode) {
  let staticOverride = false;
  let destroyed = false;
  let tween;
  let trigger;
  let raf = 0;
  let lastWidth = Math.round(window.visualViewport?.width || innerWidth);
  let lastOrientation = lastWidth >= (window.visualViewport?.height || innerHeight) ? "landscape" : "portrait";
  const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const state = { progress: 0 };

  const scrollLength = () => {
    const profile = getViewportProfile(stage.clientWidth || innerWidth, stage.clientHeight || innerHeight);
    return Math.max(1, Math.round(stage.clientHeight * profile.scrollScreens));
  };

  function killSequence() {
    tween?.kill();
    trigger?.kill();
    tween = undefined;
    trigger = undefined;
  }

  function createSequence(initialProgress = 0) {
    state.progress = initialProgress;
    tween = gsap.to(state, {
      progress: 1,
      ease: "none",
      paused: false,
      onUpdate: () => onProgress(state.progress),
      scrollTrigger: {
        id: "machining-experience",
        trigger: stage,
        start: "top top",
        end: () => `+=${scrollLength()}`,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });
    trigger = tween.scrollTrigger;
  }

  function applyMode({ keepScroll = false } = {}) {
    if (destroyed) return;
    const reduced = reducedQuery.matches;
    const isStatic = reduced || staticOverride;
    const activeProgress = trigger?.progress ?? state.progress ?? 0;
    const stageTop = stage.getBoundingClientRect().top + window.scrollY;

    killSequence();
    onMode(isStatic, reduced);

    if (isStatic) {
      state.progress = 0;
      onProgress(0);
      ScrollTrigger.refresh();
      if (!keepScroll) window.scrollTo({ top: stageTop, behavior: "auto" });
      return;
    }

    createSequence(keepScroll ? activeProgress : 0);
    ScrollTrigger.refresh();
    if (!keepScroll) window.scrollTo({ top: stageTop, behavior: "auto" });
  }

  function preserveProgressRefresh() {
    if (destroyed || !trigger) return;
    const wasActive = trigger.isActive;
    const progress = trigger.progress;
    ScrollTrigger.refresh();
    if (wasActive && progress > 0 && progress < 1) {
      const y = trigger.start + (trigger.end - trigger.start) * progress;
      window.scrollTo({ top: y, behavior: "auto" });
      state.progress = progress;
      onProgress(progress);
    }
  }

  function scheduleStructuralRefresh() {
    if (raf || destroyed) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      requestAnimationFrame(preserveProgressRefresh);
    });
  }

  function onViewportResize() {
    const vv = window.visualViewport;
    const width = Math.round(vv?.width || innerWidth);
    const height = Math.round(vv?.height || innerHeight);
    const orientation = width >= height ? "landscape" : "portrait";
    const widthChanged = Math.abs(width - lastWidth) > 24;
    const orientationChanged = orientation !== lastOrientation;

    // Mobile address bars and virtual keyboards mostly change height. Those
    // changes must not rebuild the scroll span or jump the mechanical timeline.
    if (!widthChanged && !orientationChanged) return;
    lastWidth = width;
    lastOrientation = orientation;
    scheduleStructuralRefresh();
  }

  const onReducedChange = () => applyMode({ keepScroll: true });
  reducedQuery.addEventListener?.("change", onReducedChange);
  window.addEventListener("orientationchange", scheduleStructuralRefresh, { passive: true });
  window.addEventListener("resize", onViewportResize, { passive: true });
  window.visualViewport?.addEventListener("resize", onViewportResize, { passive: true });

  applyMode({ keepScroll: true });
  document.fonts?.ready.then(() => {
    if (!destroyed) scheduleStructuralRefresh();
  });

  return {
    setStatic(value) {
      if (destroyed) return;
      staticOverride = value;
      applyMode({ keepScroll: false });
    },
    refresh() {
      if (!destroyed) scheduleStructuralRefresh();
    },
    dispose() {
      destroyed = true;
      cancelAnimationFrame(raf);
      killSequence();
      window.removeEventListener("orientationchange", scheduleStructuralRefresh);
      window.removeEventListener("resize", onViewportResize);
      window.visualViewport?.removeEventListener("resize", onViewportResize);
      reducedQuery.removeEventListener?.("change", onReducedChange);
    },
  };
}
