"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPatient } from "@/lib/actions/center";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

export function CreatePatientForm({ redirectToScan = false }: { redirectToScan?: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await createPatient(formData);
      if (res.ok) {
        setOpen(false);
        if (redirectToScan && res.id) router.push(`/center/scan?patient=${res.id}`);
        else if (res.id) router.push(`/center/patients/${res.id}`);
      } else {
        setError(res.error ?? "Erreur");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Nouveau patient</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau patient</DialogTitle>
          <DialogDescription>L'email Google du patient lui permettra de retrouver ses résultats.</DialogDescription>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cp-name">Nom</Label>
            <Input id="cp-name" name="name" placeholder="Nom du patient" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-email">Email</Label>
            <Input id="cp-email" name="email" type="email" placeholder="patient@email.com" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-phone">Téléphone WhatsApp</Label>
            <Input id="cp-phone" name="phone" type="tel" placeholder="+237…" />
          </div>
          {error && <p className="text-sm text-brand-600">{error}</p>}
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button className="flex-1" disabled={pending}>
              {pending ? "…" : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
