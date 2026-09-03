// Ces espaces sont personnalisés par utilisateur : jamais de prérendu statique.
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/auth";
import { PatientChrome } from "@/components/patient/PatientChrome";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "patient") redirect(homeForRole(user.role));

  return <PatientChrome lang={user.lang}>{children}</PatientChrome>;
}
