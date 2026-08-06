"use client";

import { useI18n } from "@/lib/i18n/context";

interface Appt {
  id: string;
  scheduledAt: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  reason: string | null;
  centerName: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "À venir",
  completed: "Honoré",
  cancelled: "Annulé",
  no_show: "Manqué",
};

export function MeAppointments({ appointments }: { appointments: Appt[] }) {
  const { lang } = useI18n();
  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const now = Date.now();
  const upcoming = appointments.filter((a) => new Date(a.scheduledAt).getTime() >= now && a.status === "scheduled");
  const past = appointments.filter((a) => !(new Date(a.scheduledAt).getTime() >= now && a.status === "scheduled"));

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold">Mes rendez-vous</h1>

      {appointments.length === 0 ? (
        <div className="card text-center">
          <div className="mb-3 text-4xl">📅</div>
          <p className="font-semibold">Aucun rendez-vous</p>
          <p className="mt-1 text-sm text-ink-soft">Votre centre planifiera vos prochains rendez-vous ici.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <h2 className="mb-3 text-lg font-bold">À venir</h2>
              <div className="mb-6 flex flex-col gap-3">
                {upcoming.map((a) => (
                  <div key={a.id} className="card">
                    <p className="font-semibold">
                      {new Date(a.scheduledAt).toLocaleString(locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {a.reason ?? "Consultation"}
                      {a.centerName ? ` · ${a.centerName}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {past.length > 0 && (
            <>
              <h2 className="mb-3 text-lg font-bold">Historique</h2>
              <div className="overflow-hidden rounded-3xl bg-white shadow-soft">
                {past.map((a) => (
                  <div key={a.id} className="flex items-center justify-between border-b border-sand-100 px-4 py-3 last:border-0">
                    <div>
                      <p className="font-medium">
                        {new Date(a.scheduledAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      <p className="text-xs text-ink-faint">{a.reason ?? "Consultation"}</p>
                    </div>
                    <span className="rounded-full bg-sand-100 px-2.5 py-1 text-xs font-semibold text-ink-faint">
                      {STATUS_LABEL[a.status]}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
