// Ces espaces sont personnalisés par utilisateur : jamais de prérendu statique.
export const dynamic = "force-dynamic";

import { Shell, type NavItem } from "@/components/Shell";

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: "grid" },
  { href: "/admin/centers", label: "Centres", icon: "building" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell items={ITEMS} title="SkinScan Admin" subtitle="Console plateforme" variant="sidebar">
      {children}
    </Shell>
  );
}
