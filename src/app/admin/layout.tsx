// Ces espaces sont personnalisés par utilisateur : jamais de prérendu statique.
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/auth";
import { Shell, type NavItem } from "@/components/Shell";

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: "grid" },
  { href: "/admin/centers", label: "Centres", icon: "building" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect(homeForRole(user.role));
  return (
    <Shell items={ITEMS} title="SkinScan Admin" subtitle="Console plateforme" variant="sidebar">
      {children}
    </Shell>
  );
}
