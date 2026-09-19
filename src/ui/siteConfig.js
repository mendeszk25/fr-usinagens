import { SITE_CONFIG } from "../config/site.js";

export function applySiteConfig(root = document) {
  root.querySelectorAll("[data-site-whatsapp-href]").forEach((link) => {
    link.href = `https://wa.me/${SITE_CONFIG.whatsappDigits}${link.dataset.message ? `?text=${encodeURIComponent(link.dataset.message)}` : ""}`;
  });
  root.querySelectorAll("[data-site-instagram-href]").forEach((link) => { link.href = SITE_CONFIG.instagramUrl; });
  root.querySelectorAll("[data-site-maps-href]").forEach((link) => { link.href = SITE_CONFIG.mapsUrl; });
  root.querySelectorAll("[data-site-whatsapp-label]").forEach((node) => { node.textContent = SITE_CONFIG.whatsappDisplay; });
}
