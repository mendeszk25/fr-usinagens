const EVENT_NAME = "fr:analytics";

export function trackEvent(name, detail = {}) {
  const event = { name: String(name || "event"), ...detail };
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: event }));
  if (typeof window.gtag === "function") {
    window.gtag("event", event.name, Object.fromEntries(Object.entries(detail).filter(([key]) => !/phone|name|message|file|document|description/i.test(key))));
  }
}

export function setupAnalytics() {
  const onClick = (event) => {
    const target = event.target.closest?.("[data-analytics]");
    if (!target) return;
    trackEvent(target.dataset.analytics, { section: target.closest("section")?.id || (target.closest("footer") ? "footer" : target.closest("header") ? "header" : "page") });
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}
