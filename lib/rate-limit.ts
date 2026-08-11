// Module-level, in-memory — adequate for a single-instance deployment, not a
// distributed solution. Resets on server restart/redeploy. Same pattern
// app/api/corporate-quote/route.ts used before this was extracted here.
export function createRateLimiter(windowMs: number, max: number) {
  const requestLog = new Map<string, number[]>();

  return function isRateLimited(key: string): boolean {
    const now = Date.now();
    const timestamps = (requestLog.get(key) ?? []).filter((t) => now - t < windowMs);
    timestamps.push(now);
    requestLog.set(key, timestamps);
    return timestamps.length > max;
  };
}

export function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// `new URL(request.url).origin` alone is not reliable behind nginx on a
// standalone Next.js build — it can resolve to the app's own bind address
// (e.g. https://0.0.0.0:3000) instead of the public host, which broke the
// ЮKassa return_url in production. nginx forwards the real Host and
// X-Forwarded-Proto, so prefer those; falling back to request.url covers
// `next dev`, which has no reverse proxy in front of it.
export function getOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto");
  if (host && proto) {
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}
