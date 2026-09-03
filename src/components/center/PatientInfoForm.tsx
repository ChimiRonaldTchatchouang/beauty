"use client";

import { useState, useTransition } from "react";
import { updatePatientInfo } from "@/lib/actions/center";
import { Button } from "@/components/ui/button";

export function PatientInfoForm({
  patientId,
  name,
  email,
  phone,
}: {
  patientId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updatePatientInfo(fd);
      if (res.ok) {
        setSaved(true);
        setOpen(false);
      } else setError(res.error ?? "Erreur");
    });
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          ✏️ Modifier
        </Button>
        {saved && <span className="text-xs text-green-600">✓ Enregistré</span>}
      </div>
    );
  }

  return (
    <form action={submit} className="card flex flex-col gap-3">
      <input type="hidden" name="patientId" value={patientId} />
      <label className="text-sm font-medium">
        Nom
        <input name="name" defaultValue={name ?? ""} className="field mt-1" placeholder="Nom du patient" />
      </label>
      <label className="text-sm font-medium">
        Email
        <input name="email" type="email" defaultValue={email ?? ""} className="field mt-1" required />
      </label>
      <label className="text-sm font-medium">
        Téléphone WhatsApp
        <input name="phone" type="tel" defaultValue={phone ?? ""} className="field mt-1" placeholder="+237…" />
      </label>
      {error && <p className="text-sm text-brand-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          Annuler
        </Button>
        <Button size="sm" disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
