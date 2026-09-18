import { annotationReveal } from "./animation.js";

export function createTechnicalAnnotation(stage) {
  const card = stage.querySelector("#technical-annotation");
  const path = stage.querySelector("#annotation-path");
  const point = stage.querySelector("#annotation-point");
  let currentId;
  let layoutDirty = true;
  let cachedStartX = 8;
  let cachedStartY = 8;
  let cachedWidth = 1;
  let cachedHeight = 1;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function measure() {
    const box = card.getBoundingClientRect();
    const bounds = stage.getBoundingClientRect();
    cachedWidth = Math.max(1, bounds.width);
    cachedHeight = Math.max(1, bounds.height);
    cachedStartX = clamp(box.left - bounds.left, 8, Math.max(8, cachedWidth - 8));
    cachedStartY = clamp(box.top - bounds.top - 14, 8, Math.max(8, cachedHeight - 8));
    layoutDirty = false;
  }

  path.setAttribute("pathLength", "1");

  return {
    invalidate() {
      layoutDirty = true;
    },
    update(part, anchor, progress = 0) {
      const visible = Boolean(part && anchor);
      const reveal = visible
        ? annotationReveal(part, progress)
        : { line: 0, text: 0 };

      card.classList.toggle("is-visible", visible);
      card.style.opacity = reveal.text;
      path.style.opacity = reveal.line;
      path.style.strokeDasharray = "1";
      path.style.strokeDashoffset = 1 - reveal.line;
      point.style.opacity = reveal.line;

      if (!visible) {
        currentId = undefined;
        return;
      }

      if (part.id !== currentId) {
        card.querySelector("#part-number").textContent = "LEITURA DO COMPONENTE";
        card.querySelector("#part-title").textContent = part.title;
        card.querySelector("#part-eyebrow").textContent = part.eyebrow;
        card.querySelector("#part-description").textContent = part.description;
        currentId = part.id;
        layoutDirty = true;
      }

      // getBoundingClientRect() previously ran on every rendered frame, after
      // style writes in the same frame. On Android that can force synchronous
      // layout repeatedly. Measure only after a real layout/content change.
      if (layoutDirty) measure();

      const safeAnchorX = clamp(anchor.x, 8, Math.max(8, cachedWidth - 8));
      const safeAnchorY = clamp(anchor.y, 8, Math.max(8, cachedHeight - 8));
      const elbowX = clamp(
        Math.max(cachedStartX + 36, safeAnchorX),
        8,
        Math.max(8, cachedWidth - 8),
      );

      path.setAttribute(
        "d",
        `M ${cachedStartX} ${cachedStartY} H ${elbowX} V ${safeAnchorY} H ${safeAnchorX}`,
      );
      point.setAttribute("cx", safeAnchorX);
      point.setAttribute("cy", safeAnchorY);
    },
  };
}
