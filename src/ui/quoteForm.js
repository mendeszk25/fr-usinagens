const WHATSAPP_NUMBER = "5581973091369";

function clean(value) {
  return String(value || "").trim();
}

export function setupQuoteForm() {
  const form = document.querySelector("#quote-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const name = clean(data.get("name"));
    const company = clean(data.get("company"));
    const phone = clean(data.get("phone"));
    const service = clean(data.get("service"));
    const message = clean(data.get("message"));
    const deadline = clean(data.get("deadline"));

    const lines = [
      "Olá, FR Usinagens.",
      "",
      "Gostaria de solicitar um orçamento.",
      "",
      `Nome: ${name}`,
      company ? `Empresa: ${company}` : null,
      phone ? `Telefone: ${phone}` : null,
      `Serviço: ${service}`,
      "",
      "Descrição:",
      message,
      deadline ? "" : null,
      deadline ? `Prazo: ${deadline}` : null,
      "",
      "Mensagem preparada pelo site da FR Usinagens.",
    ].filter(Boolean);

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup) window.location.href = url;

    const status = document.querySelector("#form-status");
    if (status) {
      status.textContent =
        "WhatsApp aberto com a mensagem pronta. Revise as informações e envie diretamente à FR Usinagens.";
    }
  });
}
