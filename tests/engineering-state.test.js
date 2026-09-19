import test from "node:test";
import assert from "node:assert/strict";
import {
  getPrecisionVisualState,
  getProcessStep,
  getProcessVisualState,
} from "../src/experience/engineeringState.js";

test("process study advances deterministically from raw material to final geometry", () => {
  const start = getProcessVisualState(0);
  const middle = getProcessVisualState(0.5);
  const end = getProcessVisualState(1);
  assert.equal(start.rawOpacity, 1);
  assert.equal(start.finalOpacity, 0);
  assert.ok(middle.intermediateOpacity > 0.5);
  assert.ok(end.finalOpacity > 0.99);
  assert.ok(end.rawOpacity < 0.2);
  assert.equal(getProcessStep(0), 1);
  assert.equal(getProcessStep(0.5), 3);
  assert.equal(getProcessStep(1), 5);
});

test("precision study enters and leaves wireframe without losing the solid model", () => {
  const start = getPrecisionVisualState(0);
  const wire = getPrecisionVisualState(0.55);
  const end = getPrecisionVisualState(1);
  assert.equal(start.wireOpacity, 0);
  assert.ok(wire.wireOpacity > 0.7);
  assert.ok(wire.solidOpacity >= 0.6);
  assert.ok(end.wireOpacity < 0.05);
  assert.ok(end.solidOpacity > 0.95);
});

test("Reduced Motion resolves secondary scenes to useful static states", () => {
  const processStart = getProcessVisualState(0.2, true);
  const processEnd = getProcessVisualState(0.8, true);
  const precision = getPrecisionVisualState(0, true);
  assert.equal(processStart.progress, 0);
  assert.equal(processEnd.progress, 1);
  assert.ok(precision.wireOpacity > 0);
});
