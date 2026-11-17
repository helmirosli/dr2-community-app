/** Digits only, with a leading 0 turned into Malaysia's 60 (WhatsApp wants the country code). */
function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function whatsappHref(phone: string | null | undefined) {
  if (!phone) return null;
  const d = digits(phone).replace(/^0/, "60");
  return d ? `https://wa.me/${d}` : null;
}

export function telHref(phone: string | null | undefined) {
  if (!phone) return null;
  const d = digits(phone);
  if (!d) return null;
  return `tel:${d.startsWith("60") ? "+" : ""}${d}`;
}
