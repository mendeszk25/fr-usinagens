import { test, expect } from "@playwright/test";

async function ready(page) {
  await page.goto("/");
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.locator(".pin-spacer")).toHaveCount(1);
}

async function scrollToProgress(page, progress) {
  await page.evaluate((progress) => {
    const stage = document.querySelector(".experience-stage");
    const spacer = stage.closest(".pin-spacer");
    const profile = stage.dataset.viewportProfile || "desktop";
    const screens = {
      "mobile-narrow": 4.55,
      "mobile-portrait": 4.65,
      "tablet-portrait": 4.8,
      "mobile-landscape": 4.35,
      "desktop-wide": 5.05,
      desktop: 5,
    }[profile] || 5;
    const start = spacer ? spacer.offsetTop : stage.getBoundingClientRect().top + scrollY;
    window.scrollTo(0, start + stage.clientHeight * screens * progress);
  }, progress);
  await expect
    .poll(async () => Number(await page.locator(".experience-stage").getAttribute("data-progress")))
    .toBeCloseTo(progress, 1);
  await page.waitForTimeout(100);
}

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
}

test("desktop: exploded sequence remains deterministic and navigation reaches real content", async ({ page }) => {
  const errors = [];
  page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await noOverflow(page);
  await scrollToProgress(page, 0.25);
  await expect(page.locator("#part-title")).toHaveText("Placa universal de 3 castanhas");
  await scrollToProgress(page, 0.38);
  await expect(page.locator("#part-title")).toHaveText("Porta-ferramentas");
  await scrollToProgress(page, 0.605);
  await expect(page.locator("#part-title")).toHaveText("Carro transversal");
  const paused = await page.locator("#canvas-host canvas").screenshot();
  await page.waitForTimeout(250);
  expect(await page.locator("#canvas-host canvas").screenshot()).toEqual(paused);
  await scrollToProgress(page, 0.82);
  await expect(page.locator("#part-title")).toHaveText("Fuso e barra de avanço");
  await scrollToProgress(page, 0.605);
  expect(await page.locator("#canvas-host canvas").screenshot()).toEqual(paused);
  await page.evaluate(() => document.querySelector("#servicos").scrollIntoView());
  await expect(page.locator("#servicos h2")).toBeInViewport();
  await page.locator('.site-header a[href="#trabalhos"]').click();
  await expect(page.locator("#trabalhos h2")).toBeInViewport();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("responsive layout preserves one pin and mobile navigation", async ({ page }) => {
  await ready(page);
  await scrollToProgress(page, 0.58);
  for (const width of [390, 1024, 360, 1440, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(260);
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
    await noOverflow(page);
  }
  await scrollToProgress(page, 0);
  await page.locator(".menu-toggle").click();
  await expect(page.locator(".menu-toggle")).toHaveAttribute("aria-expanded", "true");
  await page.locator('#navigation a[href="#servicos"]').click();
  await expect(page.locator("#servicos h2")).toBeInViewport();
  await expect(page.locator(".menu-toggle")).toHaveAttribute("aria-expanded", "false");
});

test("reduced motion keeps the user-controlled 3D sequence pinned and available", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".experience")).not.toHaveClass(/is-static/);
  await expect(page.locator(".experience")).toHaveClass(/is-reduced-motion/);
  await expect(page.locator(".experience-stage")).toHaveAttribute("data-motion-mode", "reduced");
  await expect(page.locator(".pin-spacer")).toHaveCount(1);
  await expect(page.locator("#motion-toggle")).toBeEnabled();
  await expect(page.locator("#motion-toggle")).toHaveText(/Vista estática/);
  await expect(page.locator(".capability-card")).toHaveCount(6);
  await expect(page.locator(".work-item")).toHaveCount(6);
  await noOverflow(page);
});

test("WebGL context loss exposes recovery UI and can restore the same canvas", async ({ page }) => {
  await ready(page);
  await page.evaluate(() =>
    document.querySelector("#canvas-host canvas").dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
  );
  await expect(page.locator("#scene-fallback")).toBeVisible();
  await expect(page.locator("#canvas-host canvas")).toHaveCount(1);
  await page.evaluate(() =>
    document.querySelector("#canvas-host canvas").dispatchEvent(new Event("webglcontextrestored")),
  );
  await expect(page.locator("#scene-fallback")).toBeHidden();
  await expect(page.locator(".pin-spacer")).toHaveCount(1);
  await noOverflow(page);
});

test("constrained hardware keeps the 3D story at a lower quality tier and quote opens WhatsApp", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 2 });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 2 });
    window.__openedUrl = "";
    window.open = (url) => {
      window.__openedUrl = String(url);
      return {};
    };
  });
  await page.goto("/");
  await expect(page.locator("#canvas-host canvas")).toBeVisible();
  await expect(page.locator(".experience-stage")).toHaveAttribute("data-quality-tier", "mobile-low");
  await expect(page.locator(".pin-spacer")).toHaveCount(1);
  await page.locator("#name").fill("Teste de projeto");
  await page.locator("#company").fill("Oficina teste");
  await page.locator("#phone").fill("(81) 99999-9999");
  await page.locator("#service").selectOption("Recuperar uma peça");
  await page.locator("#message").fill("Preciso avaliar a recuperação de um eixo.");
  await page.locator("#quote-form button").click();
  const opened = await page.evaluate(() => window.__openedUrl);
  expect(opened).toContain("https://wa.me/5581973091369");
  expect(decodeURIComponent(opened)).toContain("Recuperar uma peça");
  await expect(page.locator("#form-status")).toContainText("Nenhum dado foi salvo");
  await noOverflow(page);
});

test("real workshop imagery loads locally and service links preselect quote type", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".capability-card")).toHaveCount(6);
  await expect(page.locator(".work-item")).toHaveCount(6);
  await page.locator("#servicos").scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".capability-image img, .work-item img")].every(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
  const mappedServices = {
    "Torneamento": "Fabricar uma peça",
    "Rosqueamento": "Fabricar uma peça",
    "Adaptação mecânica": "Ajustar ou modificar uma peça",
  };
  for (const [service, expected] of Object.entries(mappedServices)) {
    await page.locator(`[data-service="${service}"]`).click();
    await expect(page.locator("#service")).toHaveValue(expected);
  }
  await expect(page.locator(".quality-visual img")).toHaveAttribute("src", /real\/gears\.webp/);
  await noOverflow(page);
});

test("mounted result stays static and quote section is reachable", async ({ page }) => {
  await ready(page);
  await page.locator("#orcamento").scrollIntoViewIfNeeded();
  await expect(page.locator("#quote-form")).toBeInViewport();
  await noOverflow(page);
});


test("Android/iOS viewport matrix keeps the same 3D sequence, safe layout and no horizontal overflow", async ({ page }) => {
  await ready(page);
  const matrix = [
    { width: 360, height: 800, profile: /mobile/ },
    { width: 390, height: 844, profile: /mobile/ },
    { width: 430, height: 932, profile: /mobile/ },
    { width: 768, height: 1024, profile: /tablet/ },
    { width: 844, height: 390, profile: /mobile-landscape/ },
    { width: 1366, height: 768, profile: /desktop/ },
  ];

  for (const item of matrix) {
    await page.setViewportSize({ width: item.width, height: item.height });
    await page.waitForTimeout(220);
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
    await expect(page.locator(".experience-stage")).toHaveAttribute("data-viewport-profile", item.profile);
    await expect(page.locator("#canvas-host canvas")).toBeVisible();
    await noOverflow(page);
    const bottom = await page.locator(".experience-bottom").boundingBox();
    expect(bottom).not.toBeNull();
    expect(bottom.y + bottom.height).toBeLessThanOrEqual(item.height + 2);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".hero-description-mobile")).toBeVisible();
  await expect(page.locator(".hero-description-desktop")).toBeHidden();
  const primaryCta = await page.locator(".hero-actions .button-primary").boundingBox();
  expect(primaryCta).not.toBeNull();
  expect(primaryCta.height).toBeGreaterThanOrEqual(44);
  expect(primaryCta.width).toBeGreaterThan(280);
  const secondaryCta = await page.locator(".hero-actions .hero-link").boundingBox();
  expect(secondaryCta).not.toBeNull();
  expect(secondaryCta.height).toBeGreaterThanOrEqual(40);
  await scrollToProgress(page, 0.58);
  const before = Number(await page.locator(".experience-stage").getAttribute("data-progress"));
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(300);
  const after = Number(await page.locator(".experience-stage").getAttribute("data-progress"));
  expect(Math.abs(after - before)).toBeLessThan(0.12);
  await noOverflow(page);
});

test("WCAG automated checks pass on commercial content", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto("/");
  await page.locator("#servicos").scrollIntoViewIfNeeded();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations,
    JSON.stringify(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))),
  ).toEqual([]);
});
