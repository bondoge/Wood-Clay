import nodemailer from "nodemailer";
import { formatPrice } from "@/app/(shop)/catalog/catalog-utils";

// Env checked at call time, not module load — mirrors sendTelegramNotification
// in app/api/corporate-quote/route.ts, not db/client.ts's eager boot-time
// throw. Not every request needs SMTP configured.
//
// From must equal the authenticated user — mail.ru rejects a mismatched
// From address, so there's no separate EMAIL_FROM to configure.
function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host || !port || !user || !password) {
    throw new Error("SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD is not set — cannot send email.");
  }

  const transport = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: true,
    auth: { user, pass: password },
  });
  return { transport, from: user };
}

export async function sendVerificationEmail(to: string, code: string) {
  const { transport, from } = getTransport();
  await transport.sendMail({
    from,
    to,
    subject: "Код подтверждения — Wood&Clay",
    text: `Ваш код подтверждения: ${code}\n\nКод действителен 10 минут. Если вы не запрашивали код, просто проигнорируйте это письмо.`,
  });
}

export async function sendOrderConfirmationEmail(order: {
  id: number;
  contactEmail: string;
  totalRub: number;
  cdekPvzCity: string | null;
  cdekPvzAddress: string | null;
  items: { title: string; priceRub: number; quantity: number }[];
}) {
  const { transport, from } = getTransport();
  const lines = order.items
    .map((item) => `${item.title} × ${item.quantity} — ${formatPrice(item.priceRub * item.quantity)}`)
    .join("\n");
  const pickupPoint =
    order.cdekPvzCity && order.cdekPvzAddress
      ? `\n\nПункт выдачи СДЭК: ${order.cdekPvzCity}, ${order.cdekPvzAddress}`
      : "";

  await transport.sendMail({
    from,
    to: order.contactEmail,
    subject: `Заказ №${order.id} — Wood&Clay`,
    text:
      `Спасибо за заказ!\n\n${lines}\n\nИтого: ${formatPrice(order.totalRub)}${pickupPoint}\n\n` +
      `Мы свяжемся с вами, чтобы подтвердить оплату и доставку.`,
  });
}

export async function sendPaymentReceivedEmail(order: { id: number; contactEmail: string; totalRub: number }) {
  const { transport, from } = getTransport();
  await transport.sendMail({
    from,
    to: order.contactEmail,
    subject: `Оплата получена — заказ №${order.id} — Wood&Clay`,
    text: `Оплата заказа №${order.id} на сумму ${formatPrice(order.totalRub)} получена.\n\nМы начинаем подготовку заказа к отправке.`,
  });
}
