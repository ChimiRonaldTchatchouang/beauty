import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/auth";

export default async function RootPage() {
  // Source de vérité = la base (le rôle peut avoir changé après la connexion).
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
  redirect("/login");
}
