import { mountFinalAssembly } from "./experience/FinalAssembly.js";
import { mountMachiningExperience } from "./experience/MachiningExperience.js";
import { setupNavigation } from "./ui/navigation.js";
import { setupQuoteForm } from "./ui/quoteForm.js";
import { setupViewportEnvironment } from "./ui/viewport.js";

const disposeViewport = setupViewportEnvironment();
setupNavigation();
setupQuoteForm();

document.querySelector("#year").textContent = new Date().getFullYear();

function setupReveals() {
  const targets = [...document.querySelectorAll("[data-reveal]")];
  if (!targets.length) return () => {};
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return () => {};
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  targets.forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}

function setupProductionMetadata() {
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (isLocal || !location.origin.startsWith("http")) return;

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `${location.origin}${location.pathname}`;

  const image = `${location.origin}/images/og-fr-usinagens.jpg`;
  const setMeta = (selector, value) => {
    const tag = document.querySelector(selector);
    if (tag) tag.setAttribute("content", value);
  };
  setMeta('meta[property="og:image"]', image);
  setMeta('meta[name="twitter:image"]', image);

  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement("meta");
    ogUrl.setAttribute("property", "og:url");
    document.head.appendChild(ogUrl);
  }
  ogUrl.setAttribute("content", canonical.href);
}

setupProductionMetadata();
let disposeReveal = setupReveals();

function mountScenes() {
  const primary = mountMachiningExperience(document.querySelector("#experiencia"));
  const result = mountFinalAssembly(document.querySelector("#result-canvas"));
  return () => {
    primary();
    result();
  };
}

let disposeScenes = mountScenes();
window.addEventListener("pagehide", () => {
  disposeScenes?.();
  disposeScenes = null;
  disposeReveal?.();
  disposeReveal = null;
});
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  if (!disposeScenes) disposeScenes = mountScenes();
  if (!disposeReveal) disposeReveal = setupReveals();
});
if (import.meta.hot) import.meta.hot.dispose(() => {
  disposeScenes?.();
  disposeViewport?.();
});
