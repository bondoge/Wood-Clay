// ЮKassa REST API client (https://yookassa.ru/developers/api). Plain fetch —
// no SDK dependency. Sandbox and live are the same host; "sandbox" here just
// means YUKASSA_SHOP_ID/YUKASSA_SECRET_KEY are a test shop's credentials.
// Never log these, and never persist anything from a response beyond the
// payment id/status/confirmation URL — no card data ever reaches this site.

const YOOKASSA_API_BASE = "https://api.yookassa.ru/v3";

function authHeader(): string {
  const shopId = process.env.YUKASSA_SHOP_ID;
  const secretKey = process.env.YUKASSA_SECRET_KEY;
  if (!shopId || !secretKey) {
    throw new Error("YUKASSA_SHOP_ID / YUKASSA_SECRET_KEY is not set — cannot reach ЮKassa.");
  }
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
}

export type YookassaPaymentStatus = "pending" | "waiting_for_capture" | "succeeded" | "canceled";

export type YookassaPayment = {
  id: string;
  status: YookassaPaymentStatus;
  confirmationUrl: string | null;
};

type YookassaPaymentResponse = {
  id: string;
  status: YookassaPaymentStatus;
  confirmation?: { confirmation_url?: string };
};

function toPayment(body: YookassaPaymentResponse): YookassaPayment {
  return { id: body.id, status: body.status, confirmationUrl: body.confirmation?.confirmation_url ?? null };
}

export type CreatePaymentInput = {
  amountRub: number;
  orderId: number;
  returnUrl: string;
  idempotenceKey: string;
};

export async function createPayment(input: CreatePaymentInput): Promise<YookassaPayment> {
  const res = await fetch(`${YOOKASSA_API_BASE}/payments`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "Idempotence-Key": input.idempotenceKey,
    },
    body: JSON.stringify({
      amount: { value: input.amountRub.toFixed(2), currency: "RUB" },
      confirmation: { type: "redirect", return_url: input.returnUrl },
      capture: true,
      description: `Заказ №${input.orderId} — Wood&Clay`,
      metadata: { orderId: input.orderId },
    }),
  });
  if (!res.ok) {
    throw new Error(`ЮKassa createPayment failed: ${res.status} ${await res.text()}`);
  }
  return toPayment(await res.json());
}

export async function getPayment(paymentId: string): Promise<YookassaPayment> {
  const res = await fetch(`${YOOKASSA_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) {
    throw new Error(`ЮKassa getPayment failed: ${res.status} ${await res.text()}`);
  }
  return toPayment(await res.json());
}
