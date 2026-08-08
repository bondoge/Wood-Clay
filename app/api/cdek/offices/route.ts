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
  location: { city: string; address: string };
};

export async function GET(request: Request) {
  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json({ message: "Too many requests" }, { status: 429 });
  }

  const cityCode = new URL(request.url).searchParams.get("city_code")?.trim();
  if (!cityCode) {
    return NextResponse.json({ message: "city_code is required" }, { status: 400 });
  }

  let token: string;
  try {
    token = await getCdekAccessToken();
  } catch (err) {
    console.error("app/api/cdek/offices: auth failed:", err);
    return NextResponse.json({ message: "СДЭК credentials not configured" }, { status: 502 });
  }

  const params = new URLSearchParams({ city_code: cityCode, type: "PVZ" });
  const res = await fetch(`${CDEK_API_BASE}/deliverypoints?${params}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return NextResponse.json({ message: "СДЭК error" }, { status: res.status });
  }

  const offices: CdekOffice[] = await res.json();
  const result = Array.isArray(offices)
    ? offices
        .filter((o) => o.is_handout && o.status === "ACTIVE")
        .map((o) => ({ code: o.code, name: o.name, address: o.location.address, city: o.location.city, workTime: o.work_time }))
    : [];
  return NextResponse.json(result);
}
