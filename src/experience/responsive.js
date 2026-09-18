export function getViewportProfile(width, height) {
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
    spread = 0.58;
    scrollScreens = 4.55;
  } else if (mobilePortrait) {
    name = "mobile-portrait";
    spread = 0.64;
    scrollScreens = 4.65;
  } else if (tabletPortrait) {
    name = "tablet-portrait";
    spread = 0.76;
    scrollScreens = 4.8;
  } else if (mobileLandscape) {
    name = "mobile-landscape";
    spread = 0.72;
    scrollScreens = 4.35;
  } else if (desktopWide) {
    name = "desktop-wide";
    spread = 1;
    scrollScreens = 5.05;
  } else if (desktop) {
    name = "desktop";
    spread = w < 1100 ? 0.9 : 1;
    scrollScreens = 5;
  }

  return {
    name,
    width: w,
    height: h,
    aspect,
    portrait,
    compact: mobilePortrait || mobileNarrow,
    mobile: mobilePortrait || mobileNarrow || mobileLandscape,
    mobileNarrow,
    mobilePortrait,
    tabletPortrait,
    mobileLandscape,
    desktopWide,
    spread,
    scrollScreens,
  };
}

export function getRenderProfile(viewport, env = {}) {
  const coarse = env.coarse ?? false;
  const reducedMotion = env.reducedMotion ?? false;
  const memory = Number(env.deviceMemory) || 0;
  const cores = Number(env.hardwareConcurrency) || 0;
  const dpr = Math.max(1, Number(env.devicePixelRatio) || 1);

  // Hardware hints are deliberately conservative. They lower render cost, but
  // never replace the 3D experience merely because the device is a phone.
  const constrained = (memory > 0 && memory <= 2) || (cores > 0 && cores <= 2);
  const mobile = viewport.mobile || coarse;
  let tier = "high";
  let dprCap = 1.65;
  let shadowMapSize = 1024;
  let antialias = true;
  let lowDetail = false;

  if (constrained) {
    tier = "low-power";
    dprCap = 1;
    shadowMapSize = 512;
    antialias = false;
    lowDetail = true;
  } else if (mobile) {
    tier = "mobile";
    dprCap = viewport.mobileLandscape ? 1.2 : 1.3;
    shadowMapSize = 512;
    antialias = true;
    lowDetail = false;
  } else if (viewport.width < 1180 || dpr > 2) {
    tier = "medium";
    dprCap = 1.45;
    shadowMapSize = 1024;
  }

  if (reducedMotion) dprCap = Math.min(dprCap, mobile ? 1.2 : 1.4);

  return {
    tier,
    dprCap,
    shadowMapSize,
    antialias,
    lowDetail,
    constrained,
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
