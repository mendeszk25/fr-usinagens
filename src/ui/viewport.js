// Keep mobile browser chrome from becoming a layout input. CSS uses svh for the
// pinned 3D stage; these attributes/variables are for safe composition and
// orientation-aware UI only.
export function setupViewportEnvironment() {
  const root = document.documentElement;
  let lastWidth = window.innerWidth;
  let lastOrientation = window.innerWidth >= window.innerHeight ? "landscape" : "portrait";
  let raf = 0;

  const apply = () => {
    raf = 0;
    const vv = window.visualViewport;
    const width = Math.round(vv?.width || window.innerWidth);
    const height = Math.round(vv?.height || window.innerHeight);
    const orientation = width >= height ? "landscape" : "portrait";
    root.dataset.orientation = orientation;
    root.dataset.pointer = matchMedia("(pointer: coarse)").matches ? "coarse" : "fine";
    root.style.setProperty("--visual-viewport-height", `${height}px`);
    root.style.setProperty("--visual-viewport-width", `${width}px`);
    lastWidth = width;
    lastOrientation = orientation;
  };

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(apply);
  };

  const onVisualResize = () => {
    const vv = window.visualViewport;
    const width = Math.round(vv?.width || window.innerWidth);
    const height = Math.round(vv?.height || window.innerHeight);
    const orientation = width >= height ? "landscape" : "portrait";
    // Height-only changes are usually the Safari/Chrome address bar or virtual
    // keyboard. Do not trigger structural layout churn for those.
    if (Math.abs(width - lastWidth) > 24 || orientation !== lastOrientation) schedule();
  };

  apply();
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("resize", onVisualResize, { passive: true });
  window.visualViewport?.addEventListener("resize", onVisualResize, { passive: true });

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("orientationchange", schedule);
    window.removeEventListener("resize", onVisualResize);
    window.visualViewport?.removeEventListener("resize", onVisualResize);
  };
}
