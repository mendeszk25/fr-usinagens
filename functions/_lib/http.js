export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

export function ok(data, status = 200, headers = {}) {
  return json({ success: true, data }, status, headers);
}

export function fail(code, message, status = 400, headers = {}) {
  return json({ success: false, error: { code, message } }, status, headers);
}

export function methodNotAllowed(methods) {
  return fail("method_not_allowed", "Método não permitido.", 405, { allow: methods.join(", ") });
}
