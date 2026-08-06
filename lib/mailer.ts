import nodemailer from "nodemailer";

// Env checked at call time, not module load — mirrors sendTelegramNotification
// in app/api/corporate-quote/route.ts, not db/client.ts's eager boot-time
// throw. Not every request needs SMTP configured.
export async function sendVerificationEmail(to: string, code: string) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host || !port || !user || !password) {
    throw new Error(
      "SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD is not set — cannot send the verification email.",
    );
  }

  // From must equal the authenticated user — mail.ru rejects a mismatched
  // From address, so there's no separate EMAIL_FROM to configure.
  const transport = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: true,
    auth: { user, pass: password },
  });

  await transport.sendMail({
    from: user,
    to,
    subject: "Код подтверждения — Wood&Clay",
    text: `Ваш код подтверждения: ${code}\n\nКод действителен 10 минут. Если вы не запрашивали код, просто проигнорируйте это письмо.`,
  });
}
