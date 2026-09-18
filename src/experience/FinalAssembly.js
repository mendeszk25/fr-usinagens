// A static, assembled return to the opening object closes the narrative.
// It loads only near the result section and never owns an animation loop.
export function mountFinalAssembly(host) {
  let canvas;
  let disposed = false;
  let loading = false;

  const fallback = () => {
    canvas?.dispose();
    canvas = null;
    host.classList.add("result-fallback");
  };

  const resize = new ResizeObserver(() => {
    canvas?.resize();
    canvas?.render(0);
  });

  const observer = new IntersectionObserver(
    async (entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || loading || disposed) return;
      loading = true;
      observer.disconnect();
      try {
        const { createMachiningCanvas } = await import("./MachiningCanvas.js");
        if (disposed) return;
        canvas = createMachiningCanvas(host, {
          centered: true,
          onContextLost: () => host.classList.add("result-context-lost"),
          onContextRestored: () => {
            host.classList.remove("result-context-lost");
            canvas?.render(0);
          },
        });
        canvas.render(0);
        resize.observe(host);
      } catch {
        fallback();
      }
    },
    { rootMargin: "150px" },
  );

  observer.observe(host);

  return () => {
    disposed = true;
    observer.disconnect();
    resize.disconnect();
    canvas?.dispose();
  };
}
