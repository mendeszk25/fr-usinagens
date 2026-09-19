export function getViewportProfile(width, height, out = {}) {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  const aspect = w / h;
  const portrait = aspect < 1;
  const mobileNarrow = portrait && w < 380;
  const mobilePortrait = portrait && w < 600;
  const tabletPortrait = portrait && w >= 600 && w < 1024;
  const mobileLandscape = !portrait && h < 650 && w <= 1100;
  const desktopWide = aspect >= 1.65 && w >= 1180;
  const desktop = !portrait && !mobileLandscape && !desktopWide;

  let name = "desktop";
  let spread = 1;
  let scrollScreens = 5;

  if (mobileNarrow) {
    name = "mobile-narrow";
    spread = 0.62;
    scrollScreens = 3.25;
  } else if (mobilePortrait) {
    name = "mobile-portrait";
    spread = 0.68;
    scrollScreens = 3.35;
  } else if (tabletPortrait) {
    name = "tablet-portrait";
    spread = 0.78;
    scrollScreens = 4.0;
  } else if (mobileLandscape) {
    name = "mobile-landscape";
    spread = 0.74;
    scrollScreens = 3.2;
  } else if (desktopWide) {
    name = "desktop-wide";
    spread = 1;
    scrollScreens = 4.7;
  } else if (desktop) {
    name = "desktop";
    spread = w < 1100 ? 0.9 : 1;
    scrollScreens = 4.6;
  }

  out.name = name;
  out.width = w;
  out.height = h;
  out.aspect = aspect;
  out.portrait = portrait;
  out.compact = mobilePortrait || mobileNarrow;
  out.mobile = mobilePortrait || mobileNarrow || mobileLandscape;
  out.mobileNarrow = mobileNarrow;
  out.mobilePortrait = mobilePortrait;
  out.tabletPortrait = tabletPortrait;
  out.mobileLandscape = mobileLandscape;
  out.desktopWide = desktopWide;
  out.spread = spread;
  out.scrollScreens = scrollScreens;
  return out;
}

const MOBILE_TIERS = Object.freeze({
  "mobile-high": {
    dprCapPortrait: 1.9,
    dprCapLandscape: 1.68,
    shadowMapSize: 512,
    antialias: true,
    lowDetail: false,
    shadows: false,
    materialDetail: "high",
  },
  "mobile-balanced": {
    dprCapPortrait: 1.65,
    dprCapLandscape: 1.48,
    shadowMapSize: 512,
    antialias: true,
    lowDetail: false,
    shadows: false,
    materialDetail: "balanced",
  },
  "mobile-low": {
    dprCapPortrait: 1.22,
    dprCapLandscape: 1.12,
    shadowMapSize: 512,
    antialias: true,
    lowDetail: true,
    shadows: false,
    materialDetail: "simple",
  },
});

export function getMobileTierSettings(tier, viewport) {
  const settings = MOBILE_TIERS[tier] || MOBILE_TIERS["mobile-balanced"];
  return {
    tier: MOBILE_TIERS[tier] ? tier : "mobile-balanced",
    dprCap: viewport.mobileLandscape ? settings.dprCapLandscape : settings.dprCapPortrait,
    shadowMapSize: settings.shadowMapSize,
    antialias: settings.antialias,
    lowDetail: settings.lowDetail,
    shadows: settings.shadows,
    materialDetail: settings.materialDetail,
  };
}

// One decision per orientation/session keeps adaptive quality from visibly
// oscillating while the user scrubs the lathe. Metrics are the CPU-side cost
// of the complete update+render submission, not a synthetic device score.
export function chooseAdaptiveMobileTier(metrics = {}) {
  const samples = Number(metrics.samples) || 0;
  const average = Number(metrics.average) || 0;
  const p95 = Number(metrics.p95) || 0;
  if (samples < 36) return "mobile-balanced";
  if (average <= 9.5 && p95 <= 14.5) return "mobile-high";
  if (average >= 15.5 || p95 >= 22) return "mobile-low";
  return "mobile-balanced";
}

export function summarizeFrameSamples(samples = []) {
  if (!samples.length) return { samples: 0, average: 0, p95: 0, worst: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return {
    samples: sorted.length,
    average: total / sorted.length,
    p95: sorted[p95Index],
    worst: sorted[sorted.length - 1],
  };
}

export function getRenderProfile(viewport, env = {}) {
  const coarse = env.coarse ?? false;
  const memory = Number(env.deviceMemory) || 0;
  const cores = Number(env.hardwareConcurrency) || 0;
  const dpr = Math.max(1, Number(env.devicePixelRatio) || 1);

  // Hardware hints only select the conservative starting point. They never
  // replace the mobile 3D experience merely because the device is a phone.
  const constrained = (memory > 0 && memory <= 2) || (cores > 0 && cores <= 2);
  const mobile = viewport.mobile || coarse;

  if (mobile) {
    // Modern iPhones and comparable phones should not start from a deliberately
    // soft render. Safari does not expose deviceMemory, so core count is the
    // most useful conservative hint before the runtime frame sampler takes over.
    const capableMobile = !constrained && cores >= 6;
    const requestedTier = env.qualityTier || (constrained ? "mobile-low" : capableMobile ? "mobile-high" : "mobile-balanced");
    return {
      ...getMobileTierSettings(requestedTier, viewport),
      constrained,
    };
  }

  let tier = "high";
  let dprCap = 1.65;
  let shadowMapSize = 1024;
  let antialias = true;
  let lowDetail = false;
  let shadows = true;
  let materialDetail = "high";

  if (viewport.width < 1180 || dpr > 2) {
    tier = "medium";
    dprCap = 1.45;
    shadowMapSize = 1024;
    materialDetail = "balanced";
  }

  return {
    tier,
    dprCap,
    shadowMapSize,
    antialias,
    lowDetail,
    constrained,
    shadows,
    materialDetail,
  };
}

export function browserEnvironment() {
  const media = (query) =>
    typeof matchMedia === "function" && matchMedia(query).matches;
  return {
    coarse: media("(pointer: coarse)"),
    reducedMotion: media("(prefers-reduced-motion: reduce)"),
    deviceMemory: typeof navigator !== "undefined" ? navigator.deviceMemory : 0,
    hardwareConcurrency:
      typeof navigator !== "undefined" ? navigator.hardwareConcurrency : 0,
    devicePixelRatio:
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
  };
}
