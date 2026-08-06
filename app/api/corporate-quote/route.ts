import { NextResponse } from "next/server";
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { z } from "zod";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

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

// Sole anti-spam measure for this form (no honeypot field — kept
// deliberately explicit/visible, no hidden inputs).
const isRateLimited = createRateLimiter(10 * 60 * 1000, 5);

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
  // this one call is routed through a local proxy when configured. Uses
  // undici's own fetch (not the global one) because a ProxyAgent must come
  // from the same undici instance as the fetch that dispatches it — mixing
  // Node's built-in undici with the npm package's breaks at runtime.
  const proxyUrl = process.env.TELEGRAM_PROXY_URL;

  const res = await undiciFetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: lines.join("\n") }),
    dispatcher: proxyUrl ? new ProxyAgent(proxyUrl) : undefined,
  });

  const body = (await res.json()) as { ok?: boolean };
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
