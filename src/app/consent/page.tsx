import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ConsentScreen } from "@/components/ConsentScreen";

export default async function ConsentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.consentAt) redirect(user.onboardingCompleted ? "/home" : "/onboarding");
  return <ConsentScreen />;
}
