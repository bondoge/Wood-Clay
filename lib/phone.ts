// Russian phone numbers only — a leading 8 (the domestic trunk prefix) is
// rewritten to 7 (the country code), matching every RU bank/telecom form.

function toSevenLedDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = "7" + digits.slice(1);
  else if (digits.length > 0 && !digits.startsWith("7")) digits = "7" + digits;
  return digits.slice(0, 11);
}

// Live onChange formatter — progressively renders "+7 900 000-00-00" as the
// user types, whatever they type (raw digits, pasted +7..., a leading 8…).
export function formatRuPhoneInput(raw: string): string {
  const digits = toSevenLedDigits(raw);
  if (digits.length === 0) return "";

  const rest = digits.slice(1);
  let out = "+7";
  if (rest.length > 0) out += ` ${rest.slice(0, 3)}`;
  if (rest.length > 3) out += ` ${rest.slice(3, 6)}`;
  if (rest.length > 6) out += `-${rest.slice(6, 8)}`;
  if (rest.length > 8) out += `-${rest.slice(8, 10)}`;
  return out;
}

// Server-side validation/storage form: canonical +7XXXXXXXXXX, or null if
// the input isn't a complete 11-digit RU number.
export function normalizeRuPhone(raw: string): string | null {
  const digits = toSevenLedDigits(raw);
  if (digits.length !== 11) return null;
  return `+${digits}`;
}
