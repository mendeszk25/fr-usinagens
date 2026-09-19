function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

export async function notifyNewQuote(env, quote) {
  if (!env.RESEND_API_KEY || !env.QUOTE_NOTIFICATION_TO || !env.QUOTE_NOTIFICATION_FROM) {
    return { sent: false, reason: "not_configured" };
  }

  const siteUrl = String(env.SITE_URL || "").replace(/\/$/, "");
  const adminUrl = siteUrl ? `${siteUrl}/admin.html` : null;
  const subject = `Nova solicitação ${quote.public_code} · FR Usinagens`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5">
      <h2>Nova solicitação recebida</h2>
      <p><strong>Código:</strong> ${escapeHtml(quote.public_code)}</p>
      <p><strong>Cliente:</strong> ${escapeHtml(quote.customer_name)}</p>
      <p><strong>Telefone:</strong> ${escapeHtml(quote.phone)}</p>
      <p><strong>Necessidade:</strong> ${escapeHtml(quote.request_type)}</p>
      ${quote.city ? `<p><strong>Cidade:</strong> ${escapeHtml(quote.city)}</p>` : ""}
      <p><strong>Arquivos:</strong> ${Number(quote.file_count || 0)}</p>
      ${adminUrl ? `<p><a href="${escapeHtml(adminUrl)}">Abrir painel administrativo</a></p>` : ""}
      <p style="color:#666;font-size:12px">Os arquivos permanecem privados e devem ser acessados pelo painel.</p>
    </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.QUOTE_NOTIFICATION_FROM,
      to: [env.QUOTE_NOTIFICATION_TO],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`notification_failed:${response.status}:${text.slice(0, 120)}`);
  }
  return { sent: true };
}
