export function setupMobileQuickAction() {
  const cta = document.querySelector("[data-mobile-quick-cta]");
  const services = document.querySelector("#servicos");
  const quote = document.querySelector("#orcamento");
  const footer = document.querySelector("footer");
  if (!cta || !services || !quote) return () => {};

  let contentStarted = false;
  let quoteVisible = false;
  let footerVisible = false;
  let lastScrollY = Math.max(0, window.scrollY || 0);
  let lastDirectionChange = performance.now();
  let settleTimer = 0;

  const update = () => {
    const visible = contentStarted && !quoteVisible && !footerVisible;
    cta.classList.toggle("is-visible", visible);
    if (!visible) {
      cta.classList.remove("is-scrolling-down", "is-compact");
    }
  };

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target === services) {
        contentStarted = entry.isIntersecting || entry.boundingClientRect.top < innerHeight * 0.8;
      }
      if (entry.target === quote) quoteVisible = entry.isIntersecting;
      if (entry.target === footer) footerVisible = entry.isIntersecting;
    });
    update();
  }, { rootMargin: "-8% 0px -8% 0px", threshold: [0, 0.01] });

  sectionObserver.observe(services);
  sectionObserver.observe(quote);
  if (footer) sectionObserver.observe(footer);

  const onScroll = () => {
    const nowY = Math.max(0, window.scrollY || 0);
    const delta = nowY - lastScrollY;
    const serviceTop = services.getBoundingClientRect().top;
    contentStarted = serviceTop < innerHeight * 0.78;

    if (Math.abs(delta) > 5) {
      lastDirectionChange = performance.now();
      cta.classList.toggle("is-scrolling-down", delta > 0 && nowY > innerHeight * 0.8);
      cta.classList.toggle("is-compact", delta < 0);
    }

    clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      // Once scrolling settles, bring the action back without a flashy entrance.
      if (performance.now() - lastDirectionChange >= 110) {
        cta.classList.remove("is-scrolling-down", "is-compact");
      }
    }, 130);

    lastScrollY = nowY;
    update();
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  return () => {
    clearTimeout(settleTimer);
    sectionObserver.disconnect();
    window.removeEventListener("scroll", onScroll);
  };
}
