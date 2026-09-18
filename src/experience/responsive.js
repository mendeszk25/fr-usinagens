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
  let shadows = true;

  if (constrained) {
    tier = "low-power";
    dprCap = 1;
    shadowMapSize = 512;
    antialias = false;
    lowDetail = true;
    shadows = false;
  } else if (mobile) {
    tier = "mobile";
    // A 1.3 DPR cap still costs ~69% more fragments than 1.0. The lathe has a
    // dense metallic scene, so keep mobile close to native CSS resolution and
    // spend the budget on smooth motion instead of invisible Retina pixels.
    dprCap = viewport.mobileLandscape ? 1.0 : 1.15;
    shadowMapSize = 512;
    antialias = true;
    lowDetail = true;
    // The industrial background already grounds the machine. Dynamic shadow
    // rendering effectively redraws much of this many-mesh scene a second time
    // every frame, which is disproportionately expensive on phone GPUs.
    shadows = false;
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
    shadows,
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
