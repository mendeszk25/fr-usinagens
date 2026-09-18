import { writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve("dist/sitemap.xml");
const raw = process.env.SITE_URL?.trim();

if (!raw) {
  await rm(output, { force: true });
  console.log("[sitemap] SITE_URL não definido; sitemap não gerado para evitar URL fictícia.");
  process.exit(0);
}

const origin = new URL(raw);
origin.pathname = "/";
origin.search = "";
origin.hash = "";
const loc = origin.toString();
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${loc}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`;
await writeFile(output, xml, "utf8");
console.log(`[sitemap] gerado para ${loc}`);
