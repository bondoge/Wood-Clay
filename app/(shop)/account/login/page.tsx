import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LoginClient from "./LoginClient";
import "../../catalog/catalog.css";
import "../account.css";

export const metadata: Metadata = {
  title: "Вход — Wood&Clay",
  description: "Вход в личный кабинет Wood&Clay.",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/account");
  return <LoginClient />;
}
