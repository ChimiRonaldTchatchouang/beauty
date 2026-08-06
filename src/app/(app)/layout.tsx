import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.consentAt) redirect("/consent");
  if (!user.onboardingCompleted) redirect("/onboarding");

  return <AppShell lang={user.lang}>{children}</AppShell>;
}
