import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SplashScreen } from "@/components/SplashScreen";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (user) {
    if (!user.consentAt) redirect("/consent");
    if (!user.onboardingCompleted) redirect("/onboarding");
    redirect("/home");
  }
  return <SplashScreen />;
}
