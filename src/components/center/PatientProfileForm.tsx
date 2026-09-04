"use client";

import { useState, useTransition } from "react";
import { updatePatientProfile } from "@/lib/actions/center";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function PatientProfileForm({
  patientId,
  profile,
}: {
  patientId: string;
  profile: { skinType: string; ageRange: string; concerns: string; allergies: string; notes: string };
}) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function submit(fd: FormData) {
    setSaved(false);
    start(async () => {
      const res = await updatePatientProfile(fd);
      if (res.ok) setSaved(true);
    });
  }

  return (
    <form action={submit} className="card flex flex-col gap-3">
      <input type="hidden" name="patientId" value={patientId} />
        <div className="grid gap-1.5">
          <Label htmlFor="pp-skin">Type de peau</Label>
          <Select id="pp-skin" name="skinType" defaultValue={profile.skinType}>
            <option value="">—</option>
            <option value="oily">Grasse</option>
            <option value="dry">Sèche</option>
            <option value="combination">Mixte</option>
            <option value="sensitive">Sensible</option>
            <option value="unknown">Inconnu</option>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pp-age">Tranche d'âge</Label>
          <Select id="pp-age" name="ageRange" defaultValue={profile.ageRange}>
            <option value="">—</option>
            {["<18", "18-24", "25-34", "35-44", "45-54", "55+"].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pp-concerns">Préoccupations (séparées par des virgules)</Label>
          <Input id="pp-concerns" name="concerns" defaultValue={profile.concerns} placeholder="acne, dark_spots, wrinkles" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pp-allergies">Allergies / à éviter</Label>
          <Input id="pp-allergies" name="allergies" defaultValue={profile.allergies} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pp-notes">Notes internes (non visibles par le patient)</Label>
          <textarea
            id="pp-notes"
            name="notes"
            defaultValue={profile.notes}
            className="min-h-20 w-full resize-none rounded-2xl border border-sand-200 bg-white px-4 py-3 text-ink outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button disabled={pending}>{pending ? "…" : "Enregistrer"}</Button>
          {saved && <span className="text-sm text-green-600">✓ Enregistré</span>}
        </div>
    </form>
  );
}
