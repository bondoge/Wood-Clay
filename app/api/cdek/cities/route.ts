import { NextResponse } from "next/server";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { getCdekAccessToken, CDEK_API_BASE } from "@/lib/cdek";

// СДЭК's /location/cities only matches on the exact city name (confirmed
// empirically — "Моск" returns nothing, only "Москва" does), so this can't
// power live type-ahead. The picker instead offers a curated grid of major
// cities plus this exact-name lookup as a fallback for everything else.
const isRateLimited = createRateLimiter(60 * 60 * 1000, 300);

export async function GET(request: Request) {
  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json({ message: "Too many requests" }, { status: 429 });
  }

  const city = new URL(request.url).searchParams.get("city")?.trim();
  if (!city) {
    return NextResponse.json({ message: "city is required" }, { status: 400 });
  }

  let token: string;
  try {
    token = await getCdekAccessToken();
  } catch (err) {
    console.error("app/api/cdek/cities: auth failed:", err);
    return NextResponse.json({ message: "СДЭК credentials not configured" }, { status: 502 });
  }

  const params = new URLSearchParams({ country_codes: "RU", city, size: "10" });
  const res = await fetch(`${CDEK_API_BASE}/location/cities?${params}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return NextResponse.json({ message: "СДЭК error" }, { status: res.status });
  }

  const cities = await res.json();
  const result = Array.isArray(cities)
    ? cities.map((c: { code: number; city: string; region: string }) => ({ code: c.code, city: c.city, region: c.region }))
    : [];
  return NextResponse.json(result);
}
