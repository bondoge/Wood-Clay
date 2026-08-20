export function formatPrice(price: number) {
  return `${new Intl.NumberFormat("ru-RU").format(price)} ₽`;
}

// Grams under 1kg read as "150 г"; at or past 1kg, as "1,2 кг" — a porcelain
// figurine's box is usually well under 1kg, but interior pieces can be more.
export function formatWeight(weightG: number) {
  if (weightG < 1000) return `${weightG} г`;
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(weightG / 1000)} кг`;
}

export function pluralizeProducts(count: number) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 19) return "изделий";
  if (mod10 === 1) return "изделие";
  if (mod10 >= 2 && mod10 <= 4) return "изделия";
  return "изделий";
}
