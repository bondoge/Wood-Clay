import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ForgotPasswordClient from "./ForgotPasswordClient";
import "../../catalog/catalog.css";
import "../account.css";

export const metadata: Metadata = {
  title: "Восстановление пароля — Wood&Clay",
  description: "Восстановление пароля личного кабинета Wood&Clay.",
};

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/account");
  return <ForgotPasswordClient />;
}
