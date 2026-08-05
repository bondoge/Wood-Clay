import { NextResponse } from "next/server";
import { ProxyAgent } from "undici";
import { z } from "zod";

const CONTACT_METHOD_LABELS: Record<string, string> = {
  email: "Email",
  telegram: "Telegram",
  phone: "Телефон",
};

const quoteSchema = z.object({
  name: z.string().trim().min(1),
  company: z.string().optional(),
  contactMethod: z.enum(["email", "telegram", "phone"]),
  contact: z.string().trim().min(1),
  message: z.string().optional(),
  consent: z.union([z.literal("true"), z.literal(true)]),
});

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

// Module-level, in-memory — adequate for a single-instance deployment, not a
// distributed solution. Resets on server restart/redeploy. Sole anti-spam
// measure for this form (no honeypot field — kept deliberately explicit/
// visible, no hidden inputs).
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function sendTelegramNotification(fields: {
  name: string;
  company?: string;
  contactMethod: string;
  contact: string;
  message?: string;
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID is not set — cannot send the corporate quote-form notification.",
    );
  }

  const lines = [
    "Новая заявка — Wood&Clay",
    "",
    `Имя: ${fields.name}`,
    ...(fields.company?.trim() ? [`Компания: ${fields.company}`] : []),
    `Способ связи: ${CONTACT_METHOD_LABELS[fields.contactMethod] ?? fields.contactMethod}`,
    `Контакт: ${fields.contact}`,
    ...(fields.message?.trim() ? [`Комментарий: ${fields.message}`] : []),
  ];

  // api.telegram.org is unreachable from the production server's network
  // path (connection times out — infrastructure-level, not app config), so
  // this one call is routed through a local proxy when configured. Nothing
  // else in the app needs this.
  const proxyUrl = process.env.TELEGRAM_PROXY_URL;
  const init: RequestInit & { dispatcher?: ProxyAgent } = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: lines.join("\n") }),
  };
  if (proxyUrl) {
    init.dispatcher = new ProxyAgent(proxyUrl);
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, init);

  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(`Telegram sendMessage failed: ${JSON.stringify(body)}`);
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = quoteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { name, company, contactMethod, contact, message } = parsed.data;

  try {
    await sendTelegramNotification({ name, company, contactMethod, contact, message });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
