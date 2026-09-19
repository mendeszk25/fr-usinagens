import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { onRequest as adminLogin } from "../functions/api/admin/login.js";
import { onRequest as adminDashboard } from "../functions/api/admin/dashboard.js";
import { onRequest as adminMedia } from "../functions/api/admin/media.js";
import { onRequest as adminWorks } from "../functions/api/admin/works.js";
import { onRequest as publicWorks } from "../functions/api/content/works.js";
import { onRequest as publicMedia } from "../functions/api/media/[id].js";
import { onRequest as adminComparisons } from "../functions/api/admin/before-after.js";
import { onRequest as publicComparisons } from "../functions/api/content/before-after.js";

class Statement {
  constructor(db, sql, values = []) { this.db = db; this.sql = sql; this.values = values; }
  bind(...values) { return new Statement(this.db, this.sql, values); }
  first() { return this.db.prepare(this.sql).get(...this.values) || null; }
  all() { return { results: this.db.prepare(this.sql).all(...this.values) }; }
  run() { return this.db.prepare(this.sql).run(...this.values); }
}
class D1Mock { constructor(db) { this.db = db; } prepare(sql) { return new Statement(this.db, sql); } async batch(statements) { return statements.map((s) => s.run()); } }
class R2Mock {
  constructor() { this.items = new Map(); }
  async put(key, body, options = {}) { this.items.set(key, { bytes: await new Response(body).arrayBuffer(), options }); }
  async get(key) { const item = this.items.get(key); return item ? { body: item.bytes, httpMetadata: item.options.httpMetadata || {} } : null; }
}
function req(url, init = {}) { return new Request(url, { ...init, headers: { "CF-Connecting-IP": "127.0.0.3", ...(init.headers || {}) } }); }
async function json(response) { return response.json(); }
async function environment() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(await readFile(new URL("../migrations/0001_quotes.sql", import.meta.url), "utf8"));
  sqlite.exec(await readFile(new URL("../migrations/0002_workshop_admin.sql", import.meta.url), "utf8"));
  return { DB: new D1Mock(sqlite), QUOTE_FILES: new R2Mock(), SITE_MEDIA: new R2Mock(), ADMIN_PASSWORD: "strong-password", ADMIN_SESSION_SECRET: "a".repeat(64), RATE_LIMIT_SALT: "b".repeat(64) };
}
async function adminCookie(env) {
  const response = await adminLogin({ request: req("https://fr.example/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: env.ADMIN_PASSWORD }) }), env });
  return response.headers.get("set-cookie").split(";")[0];
}

test("dashboard returns real zero counts without invented statistics", async () => {
  const env = await environment(); const cookie = await adminCookie(env);
  const response = await adminDashboard({ request: req("https://fr.example/api/admin/dashboard", { headers: { cookie } }), env });
  assert.equal(response.status, 200);
  const data = (await json(response)).data;
  assert.equal(data.counts.received, 0);
  assert.deepEqual(data.recent, []);
});

test("admin can upload institutional media, publish a work and expose only published media", async () => {
  const env = await environment(); const cookie = await adminCookie(env);
  const png = new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]);
  const form = new FormData(); form.set("file", new File([png], "trabalho.png", { type: "image/png" }));
  const uploaded = await adminMedia({ request: req("https://fr.example/api/admin/media", { method: "POST", headers: { cookie }, body: form }), env });
  assert.equal(uploaded.status, 201);
  const media = (await json(uploaded)).data;

  const beforePublish = await publicMedia({ request: req(`https://fr.example/api/media/${media.id}`), env, params: { id: media.id } });
  assert.equal(beforePublish.status, 404);

  const created = await adminWorks({ request: req("https://fr.example/api/admin/works", { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ title: "Trabalho real", description: "Registro cadastrado no painel.", image_file_id: media.id, published: true }) }), env });
  assert.equal(created.status, 201);

  const works = await publicWorks({ request: req("https://fr.example/api/content/works"), env });
  const worksData = (await json(works)).data;
  assert.equal(worksData.items.length, 1);
  assert.equal(worksData.items[0].title, "Trabalho real");

  const mediaResponse = await publicMedia({ request: req(`https://fr.example/api/media/${media.id}`), env, params: { id: media.id } });
  assert.equal(mediaResponse.status, 200);
  assert.equal((await mediaResponse.arrayBuffer()).byteLength, png.byteLength);
});


test("admin can publish a real before/after pair through separate site media", async () => {
  const env = await environment(); const cookie = await adminCookie(env);
  const png = new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1,2,3,4]);
  async function upload(name) {
    const form = new FormData(); form.set("file", new File([png], name, { type: "image/png" }));
    const response = await adminMedia({ request: req("https://fr.example/api/admin/media", { method: "POST", headers: { cookie }, body: form }), env });
    return (await json(response)).data.id;
  }
  const before = await upload("antes.png"); const after = await upload("depois.png");
  const created = await adminComparisons({ request: req("https://fr.example/api/admin/before-after", { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ title: "Reparo real", before_file_id: before, after_file_id: after, published: true }) }), env });
  assert.equal(created.status, 201);
  const publicResponse = await publicComparisons({ request: req("https://fr.example/api/content/before-after"), env });
  const items = (await json(publicResponse)).data.items;
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Reparo real");
  assert.match(items[0].before_url, /^\/api\/media\//);
});
