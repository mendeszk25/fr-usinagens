import { applySiteConfig } from "./ui/siteConfig.js";

applySiteConfig();

const year = document.querySelector("#privacy-year");
if (year) year.textContent = String(new Date().getFullYear());
