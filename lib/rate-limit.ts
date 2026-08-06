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
