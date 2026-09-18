import { test, expect } from "@playwright/test";

async function waitForPinnedStory(page) {
  await page.goto("/");
  await expect(page.locator(".pin-spacer")).toHaveCount(1);
  await expect(page.locator(".experience")).not.toHaveClass(/is-static/);
  await expect(page.locator("#motion-toggle")).toHaveAttribute("aria-pressed", "false");
}

async function progress(page) {
  return Number(await page.locator(".experience-stage").getAttribute("data-progress")) || 0;
}

async function nativeTouchSwipe(page, direction = "up", distance = 520) {
  const viewport = page.viewportSize();
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });

  const x = Math.round(viewport.width * 0.55);
  const high = Math.round(viewport.height * 0.78);
  const low = Math.round(Math.max(90, high - distance));
  const startY = direction === "up" ? high : low;
  const endY = direction === "up" ? low : high;

  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y: startY, radiusX: 4, radiusY: 4, force: 1 }],
  });

  const steps = 10;
  for (let index = 1; index <= steps; index += 1) {
    const y = Math.round(startY + ((endY - startY) * index) / steps);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y, radiusX: 4, radiusY: 4, force: 1 }],
    });
    await page.waitForTimeout(22);
  }

  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(180);
}

test.describe("native mobile touch drives the mechanical timeline", () => {
  test("real touch scrolling advances and reverses 3D progress", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile", "CDP touch injection runs in the mobile Chromium project");
    await waitForPinnedStory(page);
    await expect(page.locator("#canvas-host canvas")).toBeVisible();

    const initial = await progress(page);
    expect(initial).toBeLessThan(0.03);
    const initialShot = await page.locator("#canvas-host canvas").screenshot();

    for (let i = 0; i < 3 && (await progress(page)) < 0.2; i += 1) {
      await nativeTouchSwipe(page, "up");
    }
    await expect.poll(() => progress(page)).toBeGreaterThan(0.2);

    for (let i = 0; i < 5 && (await progress(page)) < 0.55; i += 1) {
      await nativeTouchSwipe(page, "up");
    }
    await expect.poll(() => progress(page)).toBeGreaterThan(0.5);
    await expect.poll(async () => Number(await page.locator("#canvas-host").getAttribute("data-render-progress"))).toBeGreaterThan(0.5);

    const middleShot = await page.locator("#canvas-host canvas").screenshot();
    expect(middleShot).not.toEqual(initialShot);
    await expect(page.locator("#step-number")).not.toHaveText("01");

    const beforeReverse = await progress(page);
    await nativeTouchSwipe(page, "down", 420);
    await expect.poll(() => progress(page)).toBeLessThan(beforeReverse - 0.03);

    const debug = await page.evaluate(() => window.__FR_DEBUG__ ?? null);
    expect(debug).not.toBeNull();
    expect(debug.pinSpacerCount).toBe(1);
    expect(debug.staticMode).toBe(false);
    expect(debug.triggerSpan).toBeGreaterThan(1000);
  });

  test("pin exists before the heavy Three.js module finishes loading", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile", "CDP touch injection runs in the mobile Chromium project");

    await page.route("**/src/experience/MachiningCanvas.js*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 900));
      await route.continue();
    });

    await page.goto("/");
    await expect(page.locator(".pin-spacer")).toHaveCount(1);

    await nativeTouchSwipe(page, "up", 460);
    await nativeTouchSwipe(page, "up", 460);
    await expect.poll(() => progress(page)).toBeGreaterThan(0.08);

    await expect(page.locator("#canvas-host canvas")).toBeVisible({ timeout: 10000 });
    const current = await progress(page);
    await expect.poll(async () => Number(await page.locator("#canvas-host").getAttribute("data-render-progress"))).toBeGreaterThanOrEqual(current - 0.03);
  });
});

// WebKit cannot receive trusted native swipe gestures through Playwright's
// public API. This still guards the iOS-specific mode/pin invariants; the
// physical-swipe acceptance check remains a real-device validation item.
test("iPhone/WebKit keeps the full animated mode enabled", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "webkit-mobile", "WebKit mobile project only");
  await waitForPinnedStory(page);
  await expect(page.locator("#canvas-host canvas")).toBeVisible();
  await expect(page.locator(".experience-stage")).toHaveAttribute("data-viewport-profile", /mobile/);
  await expect(page.locator(".experience")).not.toHaveClass(/is-fallback/);
  await expect(page.locator(".pin-spacer")).toHaveCount(1);
});

test.describe("iOS Reduced Motion keeps essential scroll mechanics", () => {
  test("native touch still advances progress when Reduced Motion is enabled", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile", "Trusted CDP touch is available in Chromium mobile only");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await waitForPinnedStory(page);

    await expect(page.locator(".experience")).toHaveClass(/is-reduced-motion/);
    await expect(page.locator(".experience-stage")).toHaveAttribute("data-motion-mode", "reduced");
    await expect(page.locator("#motion-toggle")).toHaveText(/Vista estática/);
    await expect(page.locator(".pin-spacer")).toHaveCount(1);

    for (let i = 0; i < 4 && (await progress(page)) < 0.3; i += 1) {
      await nativeTouchSwipe(page, "up", 500);
    }
    await expect.poll(() => progress(page)).toBeGreaterThan(0.25);

    const beforeReverse = await progress(page);
    await nativeTouchSwipe(page, "down", 380);
    await expect.poll(() => progress(page)).toBeLessThan(beforeReverse - 0.02);

    const debug = await page.evaluate(() => window.__FR_DEBUG__ ?? null);
    expect(debug).not.toBeNull();
    expect(debug.reducedMotion).toBe(true);
    expect(debug.motionMode).toBe("reduced");
    expect(debug.staticExplicit).toBe(false);
    expect(debug.staticMode).toBe(false);
    expect(debug.pinSpacerCount).toBe(1);
  });

  test("WebKit reduced-motion preference keeps ScrollTrigger pinned instead of entering static mode", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "webkit-mobile", "WebKit mobile project only");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.locator(".experience")).not.toHaveClass(/is-static/);
    await expect(page.locator(".experience")).toHaveClass(/is-reduced-motion/);
    await expect(page.locator(".experience-stage")).toHaveAttribute("data-motion-mode", "reduced");
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
    await expect(page.locator("#motion-toggle")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#motion-toggle")).toHaveText(/Vista estática/);
  });

  test("static mode is only entered after the user explicitly requests it", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".pin-spacer")).toHaveCount(1);

    await page.locator("#motion-toggle").click();
    await expect(page.locator(".experience")).toHaveClass(/is-static/);
    await expect(page.locator(".experience-stage")).toHaveAttribute("data-motion-mode", "static");
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    await expect(page.locator("#motion-toggle")).toHaveText(/Retomar experiência 3D/);

    await page.locator("#motion-toggle").click();
    await expect(page.locator(".experience")).not.toHaveClass(/is-static/);
    await expect(page.locator(".experience-stage")).toHaveAttribute("data-motion-mode", "reduced");
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
  });
});
