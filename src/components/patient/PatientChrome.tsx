"use client";

import { I18nProvider, useI18n } from "@/lib/i18n/context";
import type { Lang } from "@/lib/i18n/dictionaries";
import { Shell, type NavItem } from "@/components/Shell";

function Inner({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const items: NavItem[] = [
    { href: "/me", label: t.nav.home, icon: "home" },
    { href: "/me/history", label: t.nav.history, icon: "history" },
    { href: "/me/appointments", label: "RDV", icon: "calendar" },
    { href: "/me/profile", label: t.nav.profile, icon: "profile" },
  ];
  return (
    <Shell items={items} title={t.common.appName} variant="bottom">
      {children}
    </Shell>
  );
}

export function PatientChrome({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <I18nProvider initialLang={lang}>
      <Inner>{children}</Inner>
    </I18nProvider>
  );
}
