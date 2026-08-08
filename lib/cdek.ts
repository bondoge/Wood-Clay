// Shared OAuth2 client-credentials auth for СДЭК API v2, used by both
// app/api/cdek/cities and app/api/cdek/offices.
export const CDEK_API_BASE = "https://api.cdek.ru/v2";

export async function getCdekAccessToken(): Promise<string> {
  const clientId = process.env.CDEK_CLIENT_ID;
  const clientSecret = process.env.CDEK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("CDEK_CLIENT_ID / CDEK_CLIENT_SECRET is not set — cannot reach СДЭК.");
  }

  const res = await fetch(`${CDEK_API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
  });
  if (!res.ok) throw new Error(`СДЭК oauth/token failed: ${res.status} ${await res.text()}`);

  const body = await res.json();
  if (typeof body.access_token !== "string") throw new Error("СДЭК oauth/token response missing access_token");
  return body.access_token;
}
