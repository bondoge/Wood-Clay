import { NextResponse } from "next/server";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

// Fuzzy Russian city/settlement search for CdekPvzPicker.tsx — CDEK's own
// /location/cities only matches exact names (confirmed empirically: "Моск"
// returns nothing), so we resolve the user's partial input to a canonical
// name here first, then hand that exact name to CDEK. DaData's suggest API
// is the same role Tilda's own delivery widget fills with an in-house city
// database (see the investigation in git history/chat — not something we
// can replicate ourselves, DaData is the off-the-shelf equivalent).
const isRateLimited = createRateLimiter(60 * 60 * 1000, 600);

type DaDataAddressData = {
  city: string | null;
  city_with_type: string | null;
  settlement: string | null;
  settlement_with_type: string | null;
  region_with_type: string | null;
};

export async function GET(request: Request) {
  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json({ message: "Too many requests" }, { status: 429 });
  }

  const query = new URL(request.url).searchParams.get("query")?.trim();
  if (!query) {
    return NextResponse.json({ message: "query is required" }, { status: 400 });
  }

  const token = process.env.DADATA_API_KEY;
  if (!token) {
    console.error("app/api/dadata/suggest-cities: DADATA_API_KEY is not set");
    return NextResponse.json({ message: "DaData credentials not configured" }, { status: 502 });
  }

  const res = await fetch("https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Token ${token}` },
    body: JSON.stringify({
      query,
      count: 8,
      language: "ru",
      from_bound: { value: "city" },
      to_bound: { value: "settlement" },
      locations: [{ country_iso_code: "RU" }],
    }),
  });
  if (!res.ok) {
    return NextResponse.json({ message: "DaData error" }, { status: res.status });
  }

  const body: { suggestions: Array<{ data: DaDataAddressData }> } = await res.json();
  const seen = new Set<string>();
  const result: Array<{ name: string; label: string }> = [];
  for (const { data } of body.suggestions) {
    const name = data.city ?? data.settlement;
    const nameWithType = data.city_with_type ?? data.settlement_with_type;
    if (!name || !nameWithType || seen.has(name)) continue;
    seen.add(name);
    result.push({ name, label: [nameWithType, data.region_with_type].filter(Boolean).join(", ") });
  }

  return NextResponse.json(result);
}
