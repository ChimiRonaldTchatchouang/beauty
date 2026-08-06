"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  ScanIcon,
  HistoryIcon,
  CalendarIcon,
  ProfileIcon,
  UsersIcon,
  GridIcon,
  BuildingIcon,
  SettingsIcon,
  SparkleIcon,
  LogoutIcon,
} from "./icons";

export type IconKey =
  | "home"
  | "scan"
  | "history"
  | "calendar"
  | "profile"
  | "users"
  | "grid"
  | "building"
  | "settings";

const ICONS: Record<IconKey, (p: React.SVGProps<SVGSVGElement>) => React.JSX.Element> = {
  home: HomeIcon,
  scan: ScanIcon,
  history: HistoryIcon,
  calendar: CalendarIcon,
  profile: ProfileIcon,
  users: UsersIcon,
  grid: GridIcon,
  building: BuildingIcon,
  settings: SettingsIcon,
};

export interface NavItem {
  href: string;
  label: string;
  icon: IconKey;
  highlight?: boolean; // bouton central mis en avant (mobile)
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
}

/**
 * Coquille de navigation :
 *  - `variant="bottom"` : bottom nav mobile + sidebar desktop (espace patient).
 *  - `variant="sidebar"` : sidebar desktop + barre mobile en haut (espaces pros).
 */
export function Shell({
  items,
  title,
  subtitle,
  variant,
  children,
}: {
  items: NavItem[];
  title: string;
  subtitle?: string;
  variant: "bottom" | "sidebar";
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const sidebar = (
    <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-sand-200 lg:bg-white lg:px-4 lg:py-6">
      <div className="mb-8 flex items-center gap-2 px-2">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500 text-white">
          <SparkleIcon width={22} height={22} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight">{title}</p>
          {subtitle && <p className="truncate text-xs text-ink-faint">{subtitle}</p>}
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((it) => {
          const Icon = ICONS[it.icon];
          const active = isActive(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 font-medium transition ${
                active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-sand-50"
              }`}
            >
              <Icon width={22} height={22} />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={logout}
        className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-3 font-medium text-ink-faint transition hover:bg-sand-50"
      >
        <LogoutIcon width={22} height={22} />
        Déconnexion
      </button>
    </aside>
  );

  const mobileTop = variant === "sidebar" && (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-sand-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500 text-white">
          <SparkleIcon width={18} height={18} />
        </span>
        <span className="truncate text-sm font-bold">{title}</span>
      </div>
      <button onClick={logout} className="text-ink-faint">
        <LogoutIcon width={20} height={20} />
      </button>
    </header>
  );

  // Barre d'onglets mobile pour les espaces pros (scrollable si besoin).
  const mobileTabs = variant === "sidebar" && (
    <nav className="sticky top-[49px] z-20 flex gap-1 overflow-x-auto border-b border-sand-200 bg-white px-2 py-2 lg:hidden">
      {items.map((it) => {
        const Icon = ICONS[it.icon];
        const active = isActive(pathname, it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium ${
              active ? "bg-brand-50 text-brand-700" : "text-ink-faint"
            }`}
          >
            <Icon width={18} height={18} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );

  const bottomNav = variant === "bottom" && (
    <nav className="fixed inset-x-0 bottom-0 z-40 h-safe-nav border-t border-sand-200 bg-white/95 pb-safe shadow-nav backdrop-blur lg:hidden">
      <ul className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
        {items.map((it) => {
          const Icon = ICONS[it.icon];
          const active = isActive(pathname, it.href);
          if (it.highlight) {
            return (
              <li key={it.href} className="flex items-center">
                <Link
                  href={it.href}
                  aria-label={it.label}
                  className="relative -mt-8 grid h-16 w-16 place-items-center rounded-full bg-brand-500 text-white shadow-soft ring-4 ring-sand-50 transition active:scale-95"
                >
                  <Icon width={30} height={30} />
                </Link>
              </li>
            );
          }
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  active ? "text-brand-600" : "text-ink-faint"
                }`}
              >
                <Icon width={24} height={24} />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <div className="flex min-h-dvh">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        {mobileTop}
        {mobileTabs}
        <main
          className={`mx-auto w-full max-w-5xl flex-1 px-4 pt-6 lg:px-8 lg:pt-10 ${
            variant === "bottom" ? "pb-28 lg:pb-10" : "pb-10"
          }`}
        >
          {children}
        </main>
      </div>
      {bottomNav}
    </div>
  );
}
