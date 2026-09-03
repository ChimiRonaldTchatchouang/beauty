// Ces espaces sont personnalisés par utilisateur : jamais de prérendu statique.
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { centers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Shell, type NavItem } from "@/components/Shell";

const ITEMS: NavItem[] = [
  { href: "/center", label: "Tableau de bord", icon: "grid" },
  { href: "/center/patients", label: "Patients", icon: "users" },
  { href: "/center/scan", label: "Scanner", icon: "scan" },
  { href: "/center/appointments", label: "Rendez-vous", icon: "calendar" },
  { href: "/center/logs", label: "Diagnostic", icon: "history" },
  { href: "/center/settings", label: "Réglages", icon: "settings" },
];

export default async function CenterLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "center_admin" && user.role !== "staff") redirect(homeForRole(user.role));

  let centerName = "Mon centre";
  if (user.centerId) {
    const [c] = await db.select({ name: centers.name }).from(centers).where(eq(centers.id, user.centerId)).limit(1);
    if (c) centerName = c.name;
  }

  return (
    <Shell items={ITEMS} title={centerName} subtitle="Espace centre" variant="sidebar">
      {children}
    </Shell>
  );
}
