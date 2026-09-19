import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { onRequest as createQuote } from "../functions/api/quotes.js";
import { onRequest as trackQuote } from "../functions/api/quotes/[code].js";
import { onRequest as adminLogin } from "../functions/api/admin/login.js";
import { onRequest as adminList } from "../functions/api/admin/quotes.js";
import { onRequest as adminDetail } from "../functions/api/admin/quotes/[id].js";
import { onRequest as adminFile } from "../functions/api/admin/files/[id].js";

class Statement {
  constructor(db, sql, values = []) { this.db = db; this.sql = sql; this.values = values; }
  bind(...values) { return new Statement(this.db, this.sql, values); }
  first() { return this.db.prepare(this.sql).get(...this.values) || null; }
  all() { return { results: this.db.prepare(this.sql).all(...this.values) }; }
  run() { return this.db.prepare(this.sql).run(...this.values); }
}

class D1Mock {
  constructor(db) { this.db = db; }
  prepare(sql) { return new Statement(this.db, sql); }
  async batch(statements) { return statements.map((statement) => statement.run()); }
}

class R2Mock {
  constructor() { this.items = new Map(); }
  async put(key, body, options = {}) {
    const bytes = await new Response(body).arrayBuffer();
    this.items.set(key, { bytes, options });
  }
  async get(key) {
    const item = this.items.get(key);
    if (!item) return null;
    return { body: item.bytes, httpMetadata: item.options.httpMetadata || {} };
  }
  async delete(key) { this.items.delete(key); }
}

function req(url, init = {}) {
  return new Request(url, { ...init, headers: { "CF-Connecting-IP": "127.0.0.2", ...(init.headers || {}) } });
}

async function json(response) { return response.json(); }

test("full quote lifecycle stores privately, tracks with token and updates through authenticated admin", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(await readFile(new URL("../migrations/0001_quotes.sql", import.meta.url), "utf8"));
  const env = {
    DB: new D1Mock(sqlite),
    QUOTE_FILES: new R2Mock(),
    ADMIN_PASSWORD: "correct-horse-battery-staple",
    ADMIN_SESSION_SECRET: "a".repeat(64),
    RATE_LIMIT_SALT: "b".repeat(64),
  };

  const form = new FormData();
  form.set("name", "Cliente Teste");
  form.set("phone", "(81) 99999-9999");
  form.set("service", "Avaliar uma peça");
  form.set("material", "Não sei informar");
  form.set("message", "Tenho uma peça quebrada e gostaria de uma avaliação.");
  form.set("urgency", "Normal");
  form.set("unknown_dimensions", "1");
  const webpBytes = new Uint8Array([0x52,0x49,0x46,0x46,0x04,0x00,0x00,0x00,0x57,0x45,0x42,0x50,0x54,0x45,0x53,0x54]);
  form.append("files", new File([webpBytes], "peça.webp", { type: "image/webp" }));

  const createResponse = await createQuote({ request: req("https://fr.example/api/quotes", { method: "POST", body: form }), env });
  assert.equal(createResponse.status, 201);
  const created = (await json(createResponse)).data;
  assert.match(created.public_code, /^FR-[A-Z0-9]{6}$/);
  assert.equal(created.files_received, 1);
  assert.equal(env.QUOTE_FILES.items.size, 1);

  const denied = await trackQuote({ request: req(`https://fr.example/api/quotes/${created.public_code}`, { headers: { "X-Quote-Token": "x".repeat(48) } }), env, params: { code: created.public_code } });
  assert.equal(denied.status, 404);

  const tracked = await trackQuote({ request: req(`https://fr.example/api/quotes/${created.public_code}`, { headers: { "X-Quote-Token": created.tracking_token } }), env, params: { code: created.public_code } });
  assert.equal(tracked.status, 200);
  assert.equal((await json(tracked)).data.status, "received");

  const login = await adminLogin({ request: req("https://fr.example/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: env.ADMIN_PASSWORD }) }), env });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];

  const listed = await adminList({ request: req("https://fr.example/api/admin/quotes", { headers: { cookie } }), env });
  assert.equal(listed.status, 200);
  const listedBody = await json(listed);
  assert.equal(listedBody.data.total, 1);
  const id = listedBody.data.items[0].id;

  const update = await adminDetail({
    request: req(`https://fr.example/api/admin/quotes/${id}`, { method: "PATCH", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ status: "reviewing", public_note: "Peça em análise.", internal_note: "Contato iniciado." }) }),
    env,
    params: { id },
  });
  assert.equal(update.status, 200);

  const trackedAgain = await trackQuote({ request: req(`https://fr.example/api/quotes/${created.public_code}`, { headers: { "X-Quote-Token": created.tracking_token } }), env, params: { code: created.public_code } });
  const trackedAgainBody = await json(trackedAgain);
  assert.equal(trackedAgainBody.data.status, "reviewing");
  assert.equal(trackedAgainBody.data.public_note, "Peça em análise.");

  const fileRow = sqlite.prepare("SELECT id FROM quote_files LIMIT 1").get();
  const fileResponse = await adminFile({ request: req(`https://fr.example/api/admin/files/${fileRow.id}`, { headers: { cookie } }), env, params: { id: fileRow.id } });
  assert.equal(fileResponse.status, 200);
  assert.equal((await fileResponse.arrayBuffer()).byteLength, webpBytes.byteLength);
});
