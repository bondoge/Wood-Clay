// Flat СДЭК ПВЗ-to-ПВЗ shipping rate (Phase 7) — not calculated per
// destination/weight, since we don't capture parcel dimensions. Chosen to
// roughly break even across near/far СДЭК routes for a small ~200g parcel.
// PROVISIONAL: revisit once real per-destination cost data exists. One
// place to change it — an env var, not a rebuild, since it's a business
// decision, not a code change.
export const SHIPPING_FLAT_RATE_RUB = Number(process.env.SHIPPING_FLAT_RATE_RUB) || 450;
