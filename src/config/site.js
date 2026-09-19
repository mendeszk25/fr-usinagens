export const SITE_CONFIG = Object.freeze({
  name: "FR Usinagens",
  city: "Gravatá",
  region: "PE",
  addressLine: "Rua Prefeito Roberto Avelino",
  addressNote: "Próximo à Ponte Nova",
  whatsappDigits: "5581973091369",
  whatsappDisplay: "(81) 97309-1369",
  instagramHandle: "@fr.usinagens",
  instagramUrl: "https://www.instagram.com/fr.usinagens/",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Rua+Prefeito+Roberto+Avelino%2C+Gravat%C3%A1%2C+PE",
});

export function whatsappUrl(message = "") {
  const base = `https://wa.me/${SITE_CONFIG.whatsappDigits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
