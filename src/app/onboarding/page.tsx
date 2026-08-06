import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingQuiz } from "@/components/OnboardingQuiz";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.consentAt) redirect("/consent");
  return <OnboardingQuiz />;
}
