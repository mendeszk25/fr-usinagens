import test from "node:test";
import assert from "node:assert/strict";
import { latheParts, activePart } from "../src/data/latheParts.js";
import { partPose, annotationReveal } from "../src/experience/animation.js";

const close = (a, b, epsilon = 1e-9) => Math.abs(a - b) <= epsilon;

test("every lathe component preserves its assembled local transform before release", () => {
  for (const part of latheParts) {
    const p = Math.max(0, part.stage[0] - 0.04);
    const pose = partPose(part, p);
    assert.ok(close(pose.x, part.position[0]));
    assert.ok(close(pose.y, part.position[1]));
    assert.ok(close(pose.z, part.position[2]));
    assert.ok(close(pose.rotationX, part.rotation[0]));
    assert.ok(close(pose.rotationY, part.rotation[1]));
    assert.ok(close(pose.rotationZ, part.rotation[2]));
  }
});

test("exploded transforms use mechanical X/Y/Z directions and reach their targets", () => {
  for (const part of latheParts) {
    const pose = partPose(part, 0.9);
    assert.ok(close(pose.x, part.explodedPosition[0]));
    assert.ok(close(pose.y, part.explodedPosition[1]));
    assert.ok(close(pose.z, part.explodedPosition[2]));
  }
  assert.equal(new Set(latheParts.map((p) => p.id)).size, latheParts.length);

  const jaws = latheParts.filter((p) => p.id.startsWith("jaw"));
  assert.ok(jaws.some((p) => p.explodedPosition[1] > p.position[1]));
  assert.ok(jaws.some((p) => p.explodedPosition[2] > p.position[2]));
  assert.ok(jaws.some((p) => p.explodedPosition[2] < p.position[2]));
});

test("scrubbing backward reproduces exactly the same transform", () => {
  for (const part of latheParts) {
    const sample = Math.min(part.stage[1] - 0.01, part.stage[0] + 0.045);
    const pose = { ...partPose(part, sample) };
    partPose(part, 0.9);
    assert.deepEqual({ ...partPose(part, sample) }, pose);
  }
});

test("inspection content remains available throughout the mechanical sequence", () => {
  for (let p = 0.15; p < 0.88; p += 0.002) {
    const part = activePart(p);
    assert.ok(part, `Missing technical annotation at ${p}`);
    assert.ok(part.title && part.eyebrow && part.description);
  }
});

test("compact mode keeps the assembled datum and only reduces exploded displacement", () => {
  for (const part of latheParts) {
    const desktop = partPose(part, 0.9, 1);
    const compact = partPose(part, 0.9, 0.72);
    const desktopDistance = Math.hypot(
      desktop.x - part.position[0],
      desktop.y - part.position[1],
      desktop.z - part.position[2],
    );
    const compactDistance = Math.hypot(
      compact.x - part.position[0],
      compact.y - part.position[1],
      compact.z - part.position[2],
    );
    assert.ok(compactDistance <= desktopDistance + 1e-9);
  }
});

test("chuck annotation draws leader before text and is deterministic", () => {
  const chuck = latheParts.find((p) => p.id === "chuck");
  const start = chuck.scrollRange[0] + 0.006;
  assert.deepEqual(annotationReveal(chuck, start), { line: 0, text: 0 });
  const leader = annotationReveal(chuck, start + 0.007);
  assert.ok(leader.line > 0);
  assert.equal(leader.text, 0);
  const later = annotationReveal(chuck, start + 0.05);
  assert.ok(later.text > 0);
  annotationReveal(chuck, 0.6);
  assert.deepEqual(annotationReveal(chuck, start + 0.007), leader);
});

import {
  chooseAdaptiveMobileTier,
  getRenderProfile,
  getViewportProfile,
  summarizeFrameSamples,
} from "../src/experience/responsive.js";

test("viewport profiles preserve the same story while tightening exploded spread on phones", () => {
  const iphone = getViewportProfile(390, 844);
  const android = getViewportProfile(412, 915);
  const landscape = getViewportProfile(844, 390);
  const desktop = getViewportProfile(1440, 900);

  assert.equal(iphone.name, "mobile-portrait");
  assert.equal(android.name, "mobile-portrait");
  assert.equal(landscape.name, "mobile-landscape");
  assert.ok(desktop.name.startsWith("desktop"));
  assert.ok(iphone.spread < desktop.spread);
  assert.ok(landscape.spread < desktop.spread);
  assert.ok(iphone.scrollScreens > 4);
});

test("high-DPR and constrained devices lower render cost without forcing a fallback", () => {
  const mobile = getViewportProfile(390, 844);
  const desktop = getViewportProfile(1440, 900);
  const iphoneQuality = getRenderProfile(mobile, {
    coarse: true,
    devicePixelRatio: 3,
    hardwareConcurrency: 6,
  });
  const constrainedQuality = getRenderProfile(mobile, {
    coarse: true,
    devicePixelRatio: 3,
    deviceMemory: 2,
    hardwareConcurrency: 2,
  });
  const desktopQuality = getRenderProfile(desktop, {
    coarse: false,
    devicePixelRatio: 1,
    hardwareConcurrency: 8,
  });

  assert.equal(iphoneQuality.tier, "mobile-balanced");
  assert.ok(iphoneQuality.dprCap >= 1.3 && iphoneQuality.dprCap <= 1.45);
  assert.equal(iphoneQuality.lowDetail, false);
  assert.equal(iphoneQuality.shadows, false);
  assert.equal(constrainedQuality.tier, "mobile-low");
  assert.equal(constrainedQuality.lowDetail, true);
  assert.equal(constrainedQuality.shadows, false);
  assert.ok(desktopQuality.dprCap > iphoneQuality.dprCap);
  assert.equal(desktopQuality.shadows, true);
});

test("adaptive mobile quality upgrades or downgrades only after a stable sample window", () => {
  assert.equal(chooseAdaptiveMobileTier({ samples: 20, average: 4, p95: 6 }), "mobile-balanced");
  assert.equal(chooseAdaptiveMobileTier({ samples: 48, average: 7.5, p95: 11 }), "mobile-high");
  assert.equal(chooseAdaptiveMobileTier({ samples: 48, average: 12.5, p95: 17 }), "mobile-balanced");
  assert.equal(chooseAdaptiveMobileTier({ samples: 48, average: 17, p95: 24 }), "mobile-low");

  const summary = summarizeFrameSamples([4, 5, 6, 10, 12]);
  assert.equal(summary.samples, 5);
  assert.ok(close(summary.average, 7.4));
  assert.equal(summary.worst, 12);
});

import { normalizedScrollProgress } from "../src/experience/scrollMath.js";

test("native mobile scroll maps directly to the same normalized mechanical progress", () => {
  assert.equal(normalizedScrollProgress(100, 100, 1100), 0);
  assert.ok(close(normalizedScrollProgress(350, 100, 1100), 0.25));
  assert.ok(close(normalizedScrollProgress(600, 100, 1100), 0.5));
  assert.ok(close(normalizedScrollProgress(850, 100, 1100), 0.75));
  assert.equal(normalizedScrollProgress(1100, 100, 1100), 1);
  assert.equal(normalizedScrollProgress(50, 100, 1100), 0);
  assert.equal(normalizedScrollProgress(1400, 100, 1100), 1);
});


test("viewport classification can reuse a preallocated object in the render hot path", () => {
  const out = {};
  const first = getViewportProfile(390, 844, out);
  const second = getViewportProfile(412, 915, out);
  assert.equal(first, out);
  assert.equal(second, out);
  assert.equal(out.name, "mobile-portrait");
  assert.equal(out.width, 412);
});

import { MotionMode, resolveMotionMode } from "../src/experience/motionMode.js";

test("Reduced Motion is not treated as explicit static mode", () => {
  assert.equal(resolveMotionMode({ reducedMotion: false, staticExplicit: false }), MotionMode.FULL);
  assert.equal(resolveMotionMode({ reducedMotion: true, staticExplicit: false }), MotionMode.REDUCED);
  assert.equal(resolveMotionMode({ reducedMotion: false, staticExplicit: true }), MotionMode.STATIC);
  assert.equal(resolveMotionMode({ reducedMotion: true, staticExplicit: true }), MotionMode.STATIC);
});
