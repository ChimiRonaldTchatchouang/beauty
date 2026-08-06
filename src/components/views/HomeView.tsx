"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { ScoreRing } from "@/components/Score";
import { ScanIcon, ChevronRight, SparkleIcon } from "@/components/icons";

interface LastScan {
  id: string;
  overallScore: number | null;
  thumbnailData: string | null;
  createdAt: string | Date;
}

export function HomeView({
  name,
  plan,
  usage,
  lastScan,
}: {
  name: string | null;
  plan: "free" | "premium";
  usage: { used: number; limit: number | null; remaining: number | null };
  lastScan: LastScan | null;
}) {
  const { t, lang } = useI18n();

  return (
    <div className="animate-fade-in">
      {/* En-tête */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-ink-faint">{t.home.hello}</p>
          <h1 className="text-2xl font-bold">{name || "👋"}</h1>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500 text-white">
          <SparkleIcon width={22} height={22} />
        </span>
      </div>

      {/* Quota */}
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3 text-sm">
        <span className="font-medium text-brand-700">
          {plan === "premium" || usage.remaining === null
            ? `⭐ ${t.home.unlimited}`
            : `${usage.remaining} ${t.home.scansLeft}`}
        </span>
        {plan !== "premium" && usage.limit !== null && (
          <span className="text-brand-400">
            {usage.used}/{usage.limit}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* CTA scan principal */}
        <Link
          href="/scan"
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 p-6 text-white shadow-soft"
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative">
            <ScanIcon width={40} height={40} />
            <h2 className="mt-4 text-xl font-bold">{t.home.cta}</h2>
            <p className="mt-1 text-sm text-white/80">{t.scan.title}</p>
          </div>
          <span className="relative mt-6 inline-flex items-center gap-1 font-semibold">
            {t.splash.start} <ChevronRight width={18} height={18} />
          </span>
        </Link>

        {/* Dernier scan / état vide */}
        {lastScan ? (
          <Link
            href={`/history/${lastScan.id}`}
            className="card flex items-center gap-4 transition hover:shadow-md"
          >
            <ScoreRing score={lastScan.overallScore ?? 0} size={92} stroke={9} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink-faint">{t.home.lastScan}</p>
              <p className="font-semibold">
                {new Date(lastScan.createdAt).toLocaleDateString(
                  lang === "fr" ? "fr-FR" : "en-US",
                  { day: "numeric", month: "long" },
                )}
              </p>
              <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
                {t.results.title} <ChevronRight width={16} height={16} />
              </span>
            </div>
          </Link>
        ) : (
          <div className="card flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 text-4xl">🪞</div>
            <h3 className="font-semibold">{t.home.noScanTitle}</h3>
            <p className="mt-1 text-sm text-ink-soft">{t.home.noScanBody}</p>
          </div>
        )}
      </div>

      {/* Raccourcis */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Link href="/routine" className="card flex flex-col gap-1">
          <span className="text-2xl">🧴</span>
          <span className="font-semibold">{t.nav.routine}</span>
          <span className="text-sm text-ink-faint">{t.routine.title}</span>
        </Link>
        <Link href="/history" className="card flex flex-col gap-1">
          <span className="text-2xl">📈</span>
          <span className="font-semibold">{t.nav.history}</span>
          <span className="text-sm text-ink-faint">{t.history.progress}</span>
        </Link>
      </div>
    </div>
  );
}
