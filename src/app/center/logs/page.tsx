import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { scans, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { DiagnosticsPanel } from "@/components/center/DiagnosticsPanel";

export default async function CenterLogsPage() {
  const session = await getSession();
  if (!session?.centerId) redirect("/login");

  const rows = await db
    .select({
      id: scans.id,
      status: scans.status,
      error: scans.errorMessage,
      createdAt: scans.createdAt,
      patientEmail: users.email,
      patientName: users.name,
    })
    .from(scans)
    .leftJoin(users, eq(users.id, scans.patientId))
    .where(eq(scans.centerId, session.centerId))
    .orderBy(desc(scans.createdAt))
    .limit(25);

  return (
    <div className="animate-fade-in">
      <h1 className="mb-2 text-2xl font-bold">Diagnostic</h1>
      <p className="mb-5 text-sm text-ink-soft">
        Vérifiez l'état des services et l'historique des scans (utile pour comprendre un échec).
      </p>

      <DiagnosticsPanel />

      <h2 className="mb-3 mt-8 text-lg font-bold">Journal des scans</h2>
      <div className="overflow-hidden rounded-3xl bg-white shadow-card">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-ink-soft">Aucun scan pour le moment.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="border-b border-sand-100 px-4 py-3 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {r.patientName ?? r.patientEmail ?? "Patient"}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.status === "analyzed"
                      ? "bg-green-100 text-green-700"
                      : r.status === "failed"
                        ? "bg-brand-100 text-brand-700"
                        : "bg-sand-100 text-ink-faint"
                  }`}
                >
                  {r.status === "analyzed" ? "réussi" : r.status === "failed" ? "échec" : "en cours"}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-xs text-ink-faint">
                  {new Date(r.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {r.status === "failed" && r.error && (
                <p className="mt-2 rounded-xl bg-brand-50 p-2 text-xs text-brand-700">{r.error}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
