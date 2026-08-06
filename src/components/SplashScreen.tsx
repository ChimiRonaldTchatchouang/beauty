"use client";

import Link from "next/link";
import { useState } from "react";
import { I18nProvider, useI18n } from "@/lib/i18n/context";
import { SparkleIcon } from "./icons";

function Splash() {
  const { t, lang, setLang } = useI18n();
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-brand-50 via-sand-50 to-sand-50">
      {/* décor */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-100/50 blur-3xl" />

      <header className="flex items-center justify-between px-6 pt-6">
        <span className="font-bold">{t.common.appName}</span>
        <button
          onClick={() => setLang(lang === "fr" ? "en" : "fr")}
          className="rounded-full border border-sand-200 bg-white/70 px-3 py-1 text-sm font-medium"
        >
          {lang === "fr" ? "EN" : "FR"}
        </button>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-8 grid h-24 w-24 animate-fade-in place-items-center rounded-[28px] bg-brand-500 text-white shadow-soft">
          <SparkleIcon width={48} height={48} />
        </div>
        <h1 className="max-w-md animate-fade-in text-3xl font-bold leading-tight sm:text-4xl">
          {t.splash.tagline}
        </h1>
        <p className="mt-4 max-w-sm animate-fade-in text-ink-soft">
          {t.splash.subtitle}
        </p>

        <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
          <Link href="/register" className="btn-primary w-full">
            {t.splash.start}
          </Link>
          <Link href="/login" className="btn-ghost w-full">
            {t.splash.haveAccount}
          </Link>
        </div>
      </main>

      <footer className="px-6 pb-8 text-center text-xs text-ink-faint">
        Analyse cosmétique — aucun diagnostic médical.
      </footer>
    </div>
  );
}

export function SplashScreen() {
  return (
    <I18nProvider>
      <Splash />
    </I18nProvider>
  );
}
