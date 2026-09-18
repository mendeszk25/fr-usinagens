import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getViewportProfile } from "./responsive.js";
import { clamp01, normalizedScrollProgress } from "./scrollMath.js";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const isLocalDebug = () =>
  typeof location !== "undefined" && ["localhost", "127.0.0.1"].includes(location.hostname);

export function createMachiningScroll(stage, onProgress, onMode) {
  let staticOverride = false;
  let destroyed = false;
  let trigger;
  let structuralRaf = 0;
  let progressRaf = 0;
  let lastWidth = Math.round(window.visualViewport?.width || innerWidth);
  let lastOrientation = lastWidth >= (window.visualViewport?.height || innerHeight) ? "landscape" : "portrait";
  const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const state = { progress: 0, source: "initial" };

  const scrollLength = () => {
    const profile = getViewportProfile(stage.clientWidth || innerWidth, stage.clientHeight || innerHeight);
    return Math.max(1, Math.round(stage.clientHeight * profile.scrollScreens));
  };

  function publishDebug() {
    if (!isLocalDebug()) return;
    const span = trigger ? trigger.end - trigger.start : 0;
    window.__FR_DEBUG__ = {
      progress: state.progress,
      source: state.source,
      scrollY: window.scrollY,
      triggerStart: trigger?.start ?? null,
      triggerEnd: trigger?.end ?? null,
      triggerProgress: trigger?.progress ?? null,
      triggerActive: trigger?.isActive ?? false,
      triggerSpan: Number.isFinite(span) ? span : null,
      staticMode: reducedQuery.matches || staticOverride,
      reducedMotion: reducedQuery.matches,
      stageHeight: stage.clientHeight,
      stageTop: stage.getBoundingClientRect().top,
      visualViewportWidth: window.visualViewport?.width ?? innerWidth,
      visualViewportHeight: window.visualViewport?.height ?? innerHeight,
      pinSpacerCount: document.querySelectorAll(".pin-spacer").length,
    };
  }

  function emitProgress(value, source = "scroll") {
    if (destroyed) return;
    const next = clamp01(value);
    state.progress = next;
    state.source = source;
    onProgress(next);
    publishDebug();
  }

  function syncProgressFromNativeScroll(source = "native-scroll") {
    progressRaf = 0;
    if (destroyed || !trigger || reducedQuery.matches || staticOverride) return;
    const next = normalizedScrollProgress(window.scrollY, trigger.start, trigger.end);
    if (Math.abs(next - state.progress) > 0.0005 || source !== state.source) {
      emitProgress(next, source);
    }
  }

  function scheduleProgressSync(source = "native-scroll") {
    if (destroyed || progressRaf) return;
    progressRaf = requestAnimationFrame(() => syncProgressFromNativeScroll(source));
  }

  function killSequence() {
    trigger?.kill();
    trigger = undefined;
  }

  function createSequence() {
    trigger = ScrollTrigger.create({
      id: "machining-experience",
      trigger: stage,
      start: "top top",
      end: () => `+=${scrollLength()}`,
      pin: true,
      pinSpacing: true,
      invalidateOnRefresh: true,
      anticipatePin: 1,
      onUpdate(self) {
        // Use the scroll trigger's normalized progress directly. This avoids a
        // scrubbed object tween becoming an extra moving part on touch devices.
        emitProgress(self.progress, "scrolltrigger");
      },
      onRefresh(self) {
        // A refresh can happen after fonts/orientation changes. Immediately
        // resync to the current document scroll position instead of resetting.
        const next = normalizedScrollProgress(window.scrollY, self.start, self.end);
        emitProgress(next, "refresh");
      },
    });

    // If the 3D renderer loads after the user has already started scrolling,
    // catch up immediately. This is particularly important on slower phones.
    requestAnimationFrame(() => syncProgressFromNativeScroll("initial-sync"));
  }

  function applyMode({ keepScroll = false } = {}) {
    if (destroyed) return;
    const reduced = reducedQuery.matches;
    const isStatic = reduced || staticOverride;
    const previousProgress = state.progress;
    const previousStart = trigger?.start;
    const previousEnd = trigger?.end;
    const stageTop = stage.getBoundingClientRect().top + window.scrollY;

    killSequence();
    onMode(isStatic, reduced);

    if (isStatic) {
      emitProgress(0, "static");
      ScrollTrigger.refresh();
      if (!keepScroll) window.scrollTo({ top: stageTop, behavior: "auto" });
      return;
    }

    createSequence();
    ScrollTrigger.refresh();

    if (!keepScroll) {
      window.scrollTo({ top: stageTop, behavior: "auto" });
      emitProgress(0, "mode-reset");
      return;
    }

    // When toggling/recreating while the sequence is active, preserve the same
    // mechanical pose using the new trigger span.
    if (
      previousProgress > 0 &&
      previousProgress < 1 &&
      Number.isFinite(previousStart) &&
      Number.isFinite(previousEnd)
    ) {
      const y = trigger.start + (trigger.end - trigger.start) * previousProgress;
      window.scrollTo({ top: y, behavior: "auto" });
      emitProgress(previousProgress, "mode-preserve");
    } else {
      scheduleProgressSync("mode-sync");
    }
  }

  function preserveProgressRefresh() {
    structuralRaf = 0;
    if (destroyed || !trigger) return;
    const progress = state.progress;
    const wasInsideSequence = progress > 0 && progress < 1;

    ScrollTrigger.refresh();

    if (wasInsideSequence && trigger) {
      const y = trigger.start + (trigger.end - trigger.start) * progress;
      window.scrollTo({ top: y, behavior: "auto" });
      emitProgress(progress, "structural-refresh");
    } else {
      scheduleProgressSync("structural-sync");
    }
  }

  function scheduleStructuralRefresh() {
    if (structuralRaf || destroyed) return;
    structuralRaf = requestAnimationFrame(() => requestAnimationFrame(preserveProgressRefresh));
  }

  function onViewportResize() {
    const vv = window.visualViewport;
    const width = Math.round(vv?.width || innerWidth);
    const height = Math.round(vv?.height || innerHeight);
    const orientation = width >= height ? "landscape" : "portrait";
    const widthChanged = Math.abs(width - lastWidth) > 24;
    const orientationChanged = orientation !== lastOrientation;

    // Address bars and virtual keyboards primarily change height. Do not refresh
    // the pin/timeline for those transient mobile UI changes.
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

  // Native scroll/touch is a safety net for mobile browsers. It does not create
  // a second animation; it computes the exact same normalized scroll progress
  // from ScrollTrigger's start/end values and feeds the same deterministic pose.
  const onNativeScroll = () => scheduleProgressSync("native-scroll");
  const onNativeTouchMove = () => scheduleProgressSync("touchmove");
  window.addEventListener("scroll", onNativeScroll, { passive: true });
  window.addEventListener("touchmove", onNativeTouchMove, { passive: true });

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
    sync() {
      scheduleProgressSync("manual-sync");
    },
    get progress() {
      return state.progress;
    },
    dispose() {
      destroyed = true;
      cancelAnimationFrame(structuralRaf);
      cancelAnimationFrame(progressRaf);
      killSequence();
      window.removeEventListener("orientationchange", scheduleStructuralRefresh);
      window.removeEventListener("resize", onViewportResize);
      window.visualViewport?.removeEventListener("resize", onViewportResize);
      window.removeEventListener("scroll", onNativeScroll);
      window.removeEventListener("touchmove", onNativeTouchMove);
      reducedQuery.removeEventListener?.("change", onReducedChange);
      if (isLocalDebug() && window.__FR_DEBUG__) delete window.__FR_DEBUG__;
    },
  };
}
