"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { ResultsView } from "@/components/views/ResultsView";
import { RoutineView } from "@/components/views/RoutineView";
import type { ScanAnalysis, Routine } from "@/lib/db/schema";

interface LastScan {
  id: string;
  analysis: ScanAnalysis;
  routine: Routine | null;
  image: string | null;
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
      <div className="mb-6">
        <p className="text-ink-faint">{t.home.hello}</p>
        <h1 className="text-2xl font-bold">{name || "👋"}</h1>
        {centerName && <p className="mt-1 text-sm text-ink-faint">Suivi par {centerName}</p>}
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
        <>
          <div className="mb-5 inline-flex rounded-2xl bg-sand-100 p-1">
            {(["results", "routine"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${tab === k ? "bg-white shadow-soft" : "text-ink-faint"}`}
              >
                {k === "results" ? t.results.title : t.routine.title}
              </button>
            ))}
          </div>

          {tab === "results" ? (
            <ResultsView analysis={lastScan.analysis} image={lastScan.image} showRoutineCta={false} date={lastScan.createdAt} />
          ) : (
            <RoutineView routine={lastScan.routine} />
          )}
        </>
      )}
    </div>
  );
}
