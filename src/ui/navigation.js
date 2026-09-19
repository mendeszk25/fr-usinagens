export function setupNavigation() {
  const button = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#navigation");
  const close = () => {
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Abrir menu");
    nav.classList.remove("is-open");
  };
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    nav.classList.toggle("is-open", open);
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
      if (document.activeElement.closest("#navigation")) button.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-header")) close();
  });
  const desktopQuery = matchMedia("(min-width: 760px)");
  desktopQuery.addEventListener?.("change", () => close());
  const quoteTypeMap = {
    "Torneamento": "Fabricar uma peça",
    "Peças sob medida": "Fabricar uma peça",
    "Rosqueamento": "Fabricar uma peça",
    "Reparo e recuperação": "Recuperar uma peça",
    "Componentes e engrenagens": "Fabricar uma peça",
    "Adaptação mecânica": "Ajustar ou modificar uma peça",
  };
  document.querySelectorAll("[data-service]").forEach((link) =>
    link.addEventListener("click", () => {
      const select = document.querySelector("#service");
      if (!select) return;
      select.value = quoteTypeMap[link.dataset.service] || "Outro serviço";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }),
  );
}
