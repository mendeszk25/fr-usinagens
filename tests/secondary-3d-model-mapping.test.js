import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const canvasSource = await readFile(new URL("../src/experience/EngineeringCanvas.js", import.meta.url), "utf8");

test("each top-level 3D topic is explicitly bound to its own reference model", () => {
  assert.match(html, /data-engineering-3d="process"\s+data-model-id="gearShaft"/);
  assert.match(html, /data-engineering-3d="components"\s+data-model-id="threadedPin"/);
  assert.match(html, /data-engineering-3d="precision"\s+data-model-id="industrialAssembly"/);
});

test("engineering canvas honors the host model id instead of a shared selected model", () => {
  assert.match(canvasSource, /const modelId = suppliedModelId \|\| host\.dataset\.modelId/);
  assert.doesNotMatch(canvasSource, /selectedPart/);
  assert.doesNotMatch(canvasSource, /plan\.components/);
});
