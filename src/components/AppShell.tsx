"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { I18nProvider, useI18n } from "@/lib/i18n/context";
import type { Lang } from "@/lib/i18n/dictionaries";
import {
  HomeIcon,
  ScanIcon,
  HistoryIcon,
  RoutineIcon,
  ProfileIcon,
  SparkleIcon,
} from "./icons";

interface NavItem {
  href: string;
  key: "home" | "scan" | "history" | "routine" | "profile";
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const ITEMS: NavItem[] = [
  { href: "/home", key: "home", Icon: HomeIcon },
  { href: "/history", key: "history", Icon: HistoryIcon },
  { href: "/scan", key: "scan", Icon: ScanIcon },
  { href: "/routine", key: "routine", Icon: RoutineIcon },
  { href: "/profile", key: "profile", Icon: ProfileIcon },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/** Sidebar desktop (>= lg) : navigation verticale, plus d'espace. */
function DesktopSidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-sand-200 lg:bg-white lg:px-4 lg:py-6">
      <Link href="/home" className="mb-8 flex items-center gap-2 px-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500 text-white">
          <SparkleIcon width={22} height={22} />
        </span>
        <span className="text-lg font-bold">{t.common.appName}</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {ITEMS.map(({ href, key, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 font-medium transition ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-soft hover:bg-sand-50"
              }`}
            >
              <Icon width={22} height={22} />
              {t.nav[key]}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/** Bottom nav mobile (< lg) : 5 items, bouton Scanner central mis en avant. */
function MobileNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 h-safe-nav border-t border-sand-200 bg-white/95 pb-safe shadow-nav backdrop-blur lg:hidden">
      <ul className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
        {ITEMS.map(({ href, key, Icon }) => {
          const active = isActive(pathname, href);
          const isScan = key === "scan";
          if (isScan) {
            return (
              <li key={href} className="flex items-center">
                <Link
                  href={href}
                  aria-label={t.nav.scan}
                  className="relative -mt-8 grid h-16 w-16 place-items-center rounded-full bg-brand-500 text-white shadow-soft ring-4 ring-sand-50 transition active:scale-95"
                >
                  <ScanIcon width={30} height={30} />
                </Link>
              </li>
            );
          }
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                  active ? "text-brand-600" : "text-ink-faint"
                }`}
              >
                <Icon width={24} height={24} />
                {t.nav[key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppShell({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return (
    <I18nProvider initialLang={lang}>
      <div className="flex min-h-dvh">
        <DesktopSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-10 lg:pt-10">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </I18nProvider>
  );
}
