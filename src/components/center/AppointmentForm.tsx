"use client";

import { useState, useTransition } from "react";
import { createAppointment } from "@/lib/actions/center";

export function AppointmentForm({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    setError(null);
    start(async () => {
      const res = await createAppointment(fd);
      if (res.ok) setOpen(false);
      else setError(res.error ?? "Erreur");
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost w-full">
        + Planifier un rendez-vous
      </button>
    );
  }

  return (
    <form action={submit} className="card flex flex-col gap-3">
      <input type="hidden" name="patientId" value={patientId} />
      <label className="text-sm font-medium">
        Date & heure
        <input name="scheduledAt" type="datetime-local" className="field mt-1" required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Durée (min)
          <input name="durationMin" type="number" defaultValue={45} className="field mt-1" />
        </label>
        <label className="text-sm font-medium">
          Motif
          <input name="reason" className="field mt-1" placeholder="Suivi, soin…" />
        </label>
      </div>
      {error && <p className="text-sm text-brand-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">
          Annuler
        </button>
        <button className="btn-primary flex-1" disabled={pending}>
          {pending ? "…" : "Planifier"}
        </button>
      </div>
    </form>
  );
}
