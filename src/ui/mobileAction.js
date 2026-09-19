export function setupMobileQuickAction() {
  const cta = document.querySelector("[data-mobile-quick-cta]");
  const services = document.querySelector("#servicos");
  const quote = document.querySelector("#orcamento");
  const footer = document.querySelector("footer");
  if (!cta || !services || !quote) return () => {};

  let contentStarted = false;
  let quoteVisible = false;
  let footerVisible = false;
  const update = () => cta.classList.toggle("is-visible", contentStarted && !quoteVisible && !footerVisible);

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
    const serviceTop = services.getBoundingClientRect().top;
    contentStarted = serviceTop < innerHeight * 0.78;
    update();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  return () => {
    sectionObserver.disconnect();
    window.removeEventListener("scroll", onScroll);
  };
}
