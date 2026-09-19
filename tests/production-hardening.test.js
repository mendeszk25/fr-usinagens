import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("official site contains no hidden final-assembly WebGL renderer", async () => {
  const [html, main] = await Promise.all([read("index.html"), read("src/main.js")]);
  assert.doesNotMatch(html, /id="result-canvas"/);
  assert.doesNotMatch(main, /FinalAssembly|mountFinalAssembly/);
});

test("mobile quote flow supports direct camera capture and private tracking links", async () => {
  const [html, quote] = await Promise.all([read("index.html"), read("src/ui/quoteForm.js")]);
  assert.match(html, /id="quote-camera"[^>]*capture="environment"/);
  assert.match(html, /id="copy-tracking-link"/);
  assert.match(quote, /#acompanhar\?code=/);
  assert.match(quote, /readTrackingLinkFromHash/);
});

test("production UX exposes privacy, FAQ and mobile quick action", async () => {
  const [html, privacy, css] = await Promise.all([read("index.html"), read("privacy.html"), read("src/styles/production.css")]);
  assert.match(html, /id="duvidas"/);
  assert.match(html, /data-mobile-quick-cta/);
  assert.match(html, /\/privacidade\.html/);
  assert.match(privacy, /Política de Privacidade/);
  assert.match(css, /\.mobile-quick-cta/);
});

test("new quote notification is optional and cannot block persistence", async () => {
  const [endpoint, notify] = await Promise.all([read("functions/api/quotes.js"), read("functions/_lib/notify.js")]);
  assert.match(endpoint, /quote_notification_failed/);
  assert.match(endpoint, /await notifyNewQuote/);
  assert.match(notify, /RESEND_API_KEY/);
  assert.match(notify, /QUOTE_NOTIFICATION_TO/);
});
