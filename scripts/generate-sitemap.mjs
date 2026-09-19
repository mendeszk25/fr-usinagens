import { readFile, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const sitemapOutput = resolve("dist/sitemap.xml");
const robotsOutput = resolve("dist/robots.txt");
const raw = process.env.SITE_URL?.trim();

if (!raw) {
  await rm(sitemapOutput, { force: true });
  console.log("[sitemap] SITE_URL não definido; sitemap não gerado para evitar URL fictícia.");
  process.exit(0);
}

const origin = new URL(raw);
origin.pathname = "/";
origin.search = "";
origin.hash = "";
const base = origin.toString().replace(/\/$/, "");
const escapeXml = (value) => value.replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char]));
const pages = [
  { path: "/", changefreq: "monthly", priority: "1.0" },
  { path: "/privacidade.html", changefreq: "yearly", priority: "0.3" },
];
const entries = pages.map(({ path, changefreq, priority }) => `  <url>\n    <loc>${escapeXml(`${base}${path}`)}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`).join("\n");
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
await writeFile(sitemapOutput, xml, "utf8");

let robots = "User-agent: *\nAllow: /\n";
try { robots = await readFile(robotsOutput, "utf8"); } catch {}
robots = robots.replace(/^Sitemap:.*$/gim, "").trimEnd();
await writeFile(robotsOutput, `${robots}\nSitemap: ${base}/sitemap.xml\n`, "utf8");
console.log(`[sitemap] gerado para ${base} (incluindo privacidade)`);
