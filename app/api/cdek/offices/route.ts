import { NextResponse } from "next/server";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { getCdekAccessToken, CDEK_API_BASE } from "@/lib/cdek";

// Staffed ПВЗ only, not postomats (locker size limits are a bad fit for
// handmade porcelain, and a staffed point means the customer can flag
// damage in person on pickup).
const isRateLimited = createRateLimiter(60 * 60 * 1000, 300);

type CdekOffice = {
  code: string;
  name: string;
  work_time: string;
  is_handout: boolean;
  status: string;
  location: { city: string; address: string; longitude: number; latitude: number };
};

export async function GET(request: Request) {
  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json({ message: "Too many requests" }, { status: 429 });
  }

  // Exact city name — CdekPvzPicker.tsx only ever sends a name it already
  // resolved through /api/dadata/suggest-cities or the popular-cities grid,
  // since СДЭК's own /location/cities has no fuzzy/substring match.
  const city = new URL(request.url).searchParams.get("city")?.trim();
  if (!city) {
    return NextResponse.json({ message: "city is required" }, { status: 400 });
  }

  let token: string;
  try {
    token = await getCdekAccessToken();
  } catch (err) {
    console.error("app/api/cdek/offices: auth failed:", err);
    return NextResponse.json({ message: "СДЭК credentials not configured" }, { status: 502 });
  }

  const cityParams = new URLSearchParams({ country_codes: "RU", city, size: "1" });
  const cityRes = await fetch(`${CDEK_API_BASE}/location/cities?${cityParams}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (!cityRes.ok) {
    return NextResponse.json({ message: "СДЭК error" }, { status: cityRes.status });
  }
  const cities: Array<{ code: number }> = await cityRes.json();
  if (cities.length === 0) {
    return NextResponse.json([]);
  }

  const officeParams = new URLSearchParams({ city_code: String(cities[0].code), type: "PVZ" });
  const officesRes = await fetch(`${CDEK_API_BASE}/deliverypoints?${officeParams}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (!officesRes.ok) {
    return NextResponse.json({ message: "СДЭК error" }, { status: officesRes.status });
  }

  const offices: CdekOffice[] = await officesRes.json();
  const result = Array.isArray(offices)
    ? offices
        .filter((o) => o.is_handout && o.status === "ACTIVE")
        .map((o) => ({
          code: o.code,
          name: o.name,
          address: o.location.address,
          city: o.location.city,
          workTime: o.work_time,
          lon: o.location.longitude,
          lat: o.location.latitude,
        }))
    : [];
  return NextResponse.json(result);
}
