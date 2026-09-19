import test from "node:test";
import assert from "node:assert/strict";
import { validateQuoteFields, validateFiles, safeFilename, fileSignatureMatches } from "../functions/_lib/validation.js";

test("backend accepts a minimal customer-friendly quote", () => {
  const form = new URLSearchParams({
    name: "Cliente teste",
    phone: "(81) 99999-9999",
    service: "Avaliar uma peça",
    message: "Tenho uma peça quebrada e preciso de avaliação.",
    material: "Não sei informar",
    unknown_dimensions: "1",
  });
  const result = validateQuoteFields(form);
  assert.equal(result.error, undefined);
  assert.equal(result.data.customer_name, "Cliente teste");
  assert.equal(JSON.parse(result.data.dimensions_json).unknown, true);
});

test("backend rejects incomplete contact and short descriptions", () => {
  const form = new URLSearchParams({ name: "A", phone: "123", service: "Outro", message: "curto" });
  assert.ok(validateQuoteFields(form).error);
});

test("file validation enforces type, count and total rules", () => {
  const allowed = [{ name: "foto.webp", type: "image/webp", size: 1200 }];
  assert.equal(validateFiles(allowed), "");
  assert.match(validateFiles([{ name: "x.exe", type: "application/octet-stream", size: 10 }]), /formato não permitido/);
  assert.match(validateFiles([{ name: "x.png", type: "image/jpeg", size: 10 }]), /extensão incompatível/);
  assert.match(validateFiles(Array.from({ length: 5 }, (_, i) => ({ name: `${i}.jpg`, type: "image/jpeg", size: 10 }))), /no máximo 4/);
});

test("uploaded names are normalized before storage metadata", () => {
  assert.equal(safeFilename(" peça cliente (final).PDF "), "peca-cliente-final-.PDF");
});


test("backend checks file signatures before private storage", () => {
  assert.equal(fileSignatureMatches("application/pdf", new TextEncoder().encode("%PDF-1.7")), true);
  assert.equal(fileSignatureMatches("application/pdf", new TextEncoder().encode("not a pdf")), false);
});
