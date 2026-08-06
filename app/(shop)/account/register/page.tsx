import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import RegisterClient from "./RegisterClient";
import "../../catalog/catalog.css";
import "../account.css";

export const metadata: Metadata = {
  title: "Регистрация — Wood&Clay",
  description: "Создать аккаунт в личном кабинете Wood&Clay.",
};

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/account");
  return <RegisterClient />;
}
