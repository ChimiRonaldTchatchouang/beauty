"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { ResultsView } from "@/components/views/ResultsView";
import { RoutineView } from "@/components/views/RoutineView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ScanAnalysis, Routine } from "@/lib/db/schema";

interface LastScan {
  id: string;
  analysis: ScanAnalysis;
  routine: Routine | null;
  image: string | null;
  images: string[] | null;
  createdAt: string;
}

export function PatientHome({
  name,
  hasCenter,
  centerName,
  lastScan,
  nextAppointment,
}: {
  name: string | null;
  hasCenter: boolean;
  centerName: string | null;
  lastScan: LastScan | null;
  nextAppointment: { scheduledAt: string; reason: string | null } | null;
}) {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<"results" | "routine">("results");
  const locale = lang === "fr" ? "fr-FR" : "en-US";

  return (
    <div className="animate-fade-in">
      <div className="mb-6 overflow-hidden rounded-[26px] bg-grad-soft p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-ink-soft">{t.home.hello} 👋</p>
            <h1 className="mt-0.5 text-2xl font-bold leading-tight">{name || "Bonjour"}</h1>
            <p className="mt-1 font-serif text-lg italic text-brand-700">
              {lang === "fr" ? "Une belle peau commence ici." : "Healthy skin starts here."}
            </p>
            {centerName && <p className="mt-1 text-xs text-ink-faint">Suivi par {centerName}</p>}
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/70 text-xl shadow-card">
            ✨
          </span>
        </div>
      </div>

      {nextAppointment && (
        <Link href="/me/appointments" className="mb-4 block rounded-2xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
          📅 Prochain rendez-vous :{" "}
          {new Date(nextAppointment.scheduledAt).toLocaleString(locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
        </Link>
      )}

      {!hasCenter ? (
        <div className="card text-center">
          <div className="mb-3 text-4xl">🏥</div>
          <h2 className="font-semibold">Aucun centre ne vous suit encore</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Demandez à votre centre de beauté de vous enregistrer avec cette adresse
            email pour recevoir vos résultats et votre routine ici.
          </p>
        </div>
      ) : !lastScan ? (
        <div className="card text-center">
          <div className="mb-3 text-4xl">✨</div>
          <h2 className="font-semibold">Vos résultats arrivent bientôt</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Après votre consultation, votre analyse de peau et votre routine
            personnalisée apparaîtront ici.
          </p>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as "results" | "routine")}>
          <TabsList>
            <TabsTrigger value="results">{t.results.title}</TabsTrigger>
            <TabsTrigger value="routine">{t.routine.title}</TabsTrigger>
          </TabsList>
          <TabsContent value="results">
            <ResultsView analysis={lastScan.analysis} image={lastScan.image} images={lastScan.images} showRoutineCta={false} date={lastScan.createdAt} />
          </TabsContent>
          <TabsContent value="routine">
            <RoutineView routine={lastScan.routine} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
