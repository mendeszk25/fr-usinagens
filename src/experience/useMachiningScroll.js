import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getViewportProfile } from "./responsive.js";
import { clamp01, normalizedScrollProgress } from "./scrollMath.js";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const isLocalDebug = () =>
  typeof location !== "undefined" && ["localhost", "127.0.0.1"].includes(location.hostname);

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function createMachiningScroll(stage, onProgress, onMode) {
  // null = follow the OS preference. true/false = explicit user choice.
  let staticOverride = null;
  let destroyed = false;
  let trigger;
  let structuralRaf = 0;
  let trackingRaf = 0;
  let trackingUntil = 0;
  let touchActive = false;
  let lastSampleY = window.scrollY;
  let stableFrames = 0;
  let lastWidth = Math.round(window.visualViewport?.width || innerWidth);
  let lastOrientation = lastWidth >= (window.visualViewport?.height || innerHeight) ? "landscape" : "portrait";
  const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const state = { progress: 0, source: "initial" };

  const scrollLength = () => {
    const profile = getViewportProfile(stage.clientWidth || innerWidth, stage.clientHeight || innerHeight);
    return Math.max(1, Math.round(stage.clientHeight * profile.scrollScreens));
  };

  const isStaticMode = () => staticOverride ?? reducedQuery.matches;

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
      staticMode: isStaticMode(),
      reducedMotion: reducedQuery.matches,
      explicitMotionOverride: staticOverride === false,
      stageHeight: stage.clientHeight,
      stageTop: stage.getBoundingClientRect().top,
      visualViewportWidth: window.visualViewport?.width ?? innerWidth,
      visualViewportHeight: window.visualViewport?.height ?? innerHeight,
      pinSpacerCount: document.querySelectorAll(".pin-spacer").length,
      tracking: Boolean(trackingRaf),
      touchActive,
    };
  }

  function emitProgress(value, source = "scroll") {
    if (destroyed) return;
    const next = clamp01(value);
    if (Math.abs(next - state.progress) < 0.00025 && source === state.source) return;
    state.progress = next;
    state.source = source;
    onProgress(next);
    publishDebug();
  }

  function progressFromDocument() {
    if (!trigger) return state.progress;
    return normalizedScrollProgress(window.scrollY, trigger.start, trigger.end);
  }

  function shouldKeepTracking(y, changed) {
    if (!trigger || isStaticMode()) return false;
    const h = Math.max(1, stage.clientHeight || innerHeight);
    const nearStory = y >= trigger.start - h * 0.35 && y <= trigger.end + h * 0.35;
    if (!nearStory) return false;
    return changed || touchActive || trigger.isActive || now() < trackingUntil || stableFrames < 4;
  }

  // Safari can throttle ScrollTrigger/touch callbacks during native momentum.
  // The scroll position itself remains the source of truth, so while the hero is
  // active we sample it once per animation frame. This also gives Android one
  // predictable progress update per frame instead of event-frequency bursts.
  function trackingTick() {
    trackingRaf = 0;
    if (destroyed || !trigger || isStaticMode()) return;

    const y = window.scrollY;
    const changed = Math.abs(y - lastSampleY) > 0.2;
    const next = progressFromDocument();

    if (changed || Math.abs(next - state.progress) > 0.00025) {
      stableFrames = 0;
      emitProgress(next, "raf-scroll");
    } else {
      stableFrames += 1;
    }

    lastSampleY = y;
    if (shouldKeepTracking(y, changed)) trackingRaf = requestAnimationFrame(trackingTick);
  }

  function ensureTracking(source = "scroll", keepAliveMs = 420) {
    if (destroyed || isStaticMode() || !trigger) return;
    trackingUntil = Math.max(trackingUntil, now() + keepAliveMs);
    if (!trackingRaf) trackingRaf = requestAnimationFrame(trackingTick);
    if (isLocalDebug()) {
      state.source = source;
      publishDebug();
    }
  }

  function killSequence() {
    if (trackingRaf) cancelAnimationFrame(trackingRaf);
    trackingRaf = 0;
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
      onEnter() {
        ensureTracking("enter", 700);
      },
      onEnterBack() {
        ensureTracking("enter-back", 700);
      },
      onLeave() {
        emitProgress(1, "leave");
      },
      onLeaveBack() {
        emitProgress(0, "leave-back");
      },
      onUpdate() {
        // Do not render here. Event rates differ across Chrome/Safari. Instead,
        // wake the single RAF sampler which derives progress from window.scrollY.
        ensureTracking("scrolltrigger", 520);
      },
      onRefresh(self) {
        // Never force-scroll during a normal refresh. Safari's address bar and
        // font/layout updates can otherwise fight native momentum scrolling.
        const next = normalizedScrollProgress(window.scrollY, self.start, self.end);
        emitProgress(next, "refresh");
        ensureTracking("refresh", 300);
      },
    });

    lastSampleY = window.scrollY;
    ensureTracking("initial-sync", 600);
  }

  function applyMode({ keepScroll = false } = {}) {
    if (destroyed) return;
    const isStatic = isStaticMode();
    const stageTop = stage.getBoundingClientRect().top + window.scrollY;

    killSequence();
    onMode(isStatic, reducedQuery.matches);

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
    } else {
      ensureTracking("mode-sync", 700);
    }
  }

  function structuralRefresh() {
    structuralRaf = 0;
    if (destroyed || !trigger || isStaticMode()) return;

    // Orientation/real width changes are rare and safe to refresh. Preserve the
    // current physical scroll position instead of writing window.scrollTo(), so
    // an iOS gesture can never be cancelled by our own refresh logic.
    ScrollTrigger.refresh();
    emitProgress(progressFromDocument(), "structural-refresh");
    ensureTracking("structural-refresh", 800);
  }

  function scheduleStructuralRefresh() {
    if (structuralRaf || destroyed) return;
    structuralRaf = requestAnimationFrame(() => requestAnimationFrame(structuralRefresh));
  }

  function onViewportResize() {
    const vv = window.visualViewport;
    const width = Math.round(vv?.width || innerWidth);
    const height = Math.round(vv?.height || innerHeight);
    const orientation = width >= height ? "landscape" : "portrait";
    const widthChanged = Math.abs(width - lastWidth) > 24;
    const orientationChanged = orientation !== lastOrientation;

    // Browser chrome and the software keyboard mostly change height. Treating
    // those as structural resizes causes refresh storms and dropped frames.
    if (!widthChanged && !orientationChanged) return;
    lastWidth = width;
    lastOrientation = orientation;
    scheduleStructuralRefresh();
  }

  const onReducedChange = () => {
    // A new OS preference should become the default again; the user can still
    // explicitly opt into the animated experience via the on-page control.
    staticOverride = null;
    applyMode({ keepScroll: true });
  };
  reducedQuery.addEventListener?.("change", onReducedChange);
  window.addEventListener("orientationchange", scheduleStructuralRefresh, { passive: true });
  window.addEventListener("resize", onViewportResize, { passive: true });
  window.visualViewport?.addEventListener("resize", onViewportResize, { passive: true });

  const onNativeScroll = () => ensureTracking("native-scroll", 900);
  const onTouchStart = () => {
    touchActive = true;
    ensureTracking("touchstart", 1200);
  };
  const onTouchMove = () => ensureTracking("touchmove", 1200);
  const onTouchEnd = () => {
    touchActive = false;
    // Keep sampling long enough to follow iOS/Android momentum after the finger
    // leaves the glass.
    ensureTracking("touchend", 1600);
  };

  window.addEventListener("scroll", onNativeScroll, { passive: true });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("touchcancel", onTouchEnd, { passive: true });

  applyMode({ keepScroll: true });
  document.fonts?.ready.then(() => {
    if (!destroyed) scheduleStructuralRefresh();
  });

  return {
    setStatic(value) {
      if (destroyed) return;
      staticOverride = Boolean(value);
      applyMode({ keepScroll: false });
    },
    followSystemMotionPreference() {
      if (destroyed) return;
      staticOverride = null;
      applyMode({ keepScroll: true });
    },
    refresh() {
      if (!destroyed) scheduleStructuralRefresh();
    },
    sync() {
      ensureTracking("manual-sync", 900);
      if (trigger && !isStaticMode()) emitProgress(progressFromDocument(), "manual-sync");
    },
    get progress() {
      return state.progress;
    },
    get staticMode() {
      return isStaticMode();
    },
    dispose() {
      destroyed = true;
      cancelAnimationFrame(structuralRaf);
      cancelAnimationFrame(trackingRaf);
      killSequence();
      window.removeEventListener("orientationchange", scheduleStructuralRefresh);
      window.removeEventListener("resize", onViewportResize);
      window.visualViewport?.removeEventListener("resize", onViewportResize);
      window.removeEventListener("scroll", onNativeScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      reducedQuery.removeEventListener?.("change", onReducedChange);
      if (isLocalDebug() && window.__FR_DEBUG__) delete window.__FR_DEBUG__;
    },
  };
}
