"use client";

import { useState, useTransition } from "react";
import { createAppointment } from "@/lib/actions/center";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <Button onClick={() => setOpen(true)} variant="outline" className="w-full">
        + Planifier un rendez-vous
      </Button>
    );
  }

  return (
    <form action={submit} className="card flex flex-col gap-3">
      <input type="hidden" name="patientId" value={patientId} />
      <div className="grid gap-1.5">
        <Label htmlFor="ap-date">Date & heure</Label>
        <Input id="ap-date" name="scheduledAt" type="datetime-local" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="ap-dur">Durée (min)</Label>
          <Input id="ap-dur" name="durationMin" type="number" defaultValue={45} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ap-reason">Motif</Label>
          <Input id="ap-reason" name="reason" placeholder="Suivi, soin…" />
        </div>
      </div>
      {error && <p className="text-sm text-brand-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
          Annuler
        </Button>
        <Button className="flex-1" disabled={pending}>
          {pending ? "…" : "Planifier"}
        </Button>
      </div>
    </form>
  );
}
