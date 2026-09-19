import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const privacy = readFileSync(new URL("../privacy.html", import.meta.url), "utf8");
const mobileCss = readFileSync(new URL("../src/styles/mobile-iphone.css", import.meta.url), "utf8");
const engineering = readFileSync(new URL("../src/experience/EngineeringCanvas.js", import.meta.url), "utf8");

test("public UI uses vector arrows instead of the iOS diagonal-arrow emoji glyph", () => {
  assert.equal(html.includes("↗"), false);
  assert.equal(privacy.includes("↗"), false);
  assert.match(html, /class="ui-arrow/);
  assert.match(mobileCss, /\.ui-arrow::before/);
  assert.match(mobileCss, /\.ui-arrow::after/);
});

test("iPhone layout has an intentional hero line break and compact quick action", () => {
  assert.match(html, /hero-mobile-break/);
  assert.match(mobileCss, /height:\s*54px/);
  assert.match(mobileCss, /is-scrolling-down/);
  assert.match(mobileCss, /safe-area-inset-bottom/);
});

test("secondary mobile WebGL keeps antialiasing and quality-aware DPR", () => {
  assert.match(engineering, /antialias:\s*true/);
  assert.match(engineering, /getRenderProfile\(viewport, browserEnvironment\(\)\)/);
  assert.match(engineering, /renderQuality\.dprCap/);
});
