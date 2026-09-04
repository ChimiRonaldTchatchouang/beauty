"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCenter, type CreateCenterResult } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function CreateCenterForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateCenterResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await createCenter(formData);
      if (res.ok) setCreated(res);
      else setError(res.error ?? "Erreur");
    });
  }

  function onOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      setCreated(null);
      setError(null);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>+ Nouveau centre</Button>
      </DialogTrigger>
      <DialogContent>
        {created ? (
          <div>
            <div className="mb-2 text-3xl">✅</div>
            <DialogHeader>
              <DialogTitle>Centre créé</DialogTitle>
            </DialogHeader>
            <p className="mt-1 text-sm text-ink-soft">
              {created.emailSent
                ? "Les accès ont été envoyés par email au gérant."
                : "⚠️ L'email n'a pas pu être envoyé. Communiquez ces accès au gérant :"}
            </p>
            <div className="mt-4 rounded-2xl bg-sand-50 p-4 text-sm">
              <p className="mb-1">Email : <strong>{created.email}</strong></p>
              <p>Mot de passe : <strong className="select-all tracking-wide">{created.tempPassword}</strong></p>
            </div>
            {!created.emailSent && created.emailError && (
              <p className="mt-3 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">Détail : {created.emailError}</p>
            )}
            <Button className="mt-5 w-full" onClick={() => onOpenChange(false)}>Terminé</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nouveau centre</DialogTitle>
            </DialogHeader>
            <form action={submit} className="flex flex-col gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cc-name">Nom du centre</Label>
                <Input id="cc-name" name="name" placeholder="Institut Beauté…" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cc-city">Ville</Label>
                <Input id="cc-city" name="city" placeholder="Ville" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cc-email">Email du gérant</Label>
                <Input id="cc-email" name="adminEmail" type="email" placeholder="gerant@centre.com" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cc-phone">Téléphone</Label>
                <Input id="cc-phone" name="contactPhone" placeholder="Optionnel" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select name="plan" defaultValue="trial">
                  <option value="trial">Essai (10 scans)</option>
                  <option value="starter">Starter (50)</option>
                  <option value="pro">Pro (200)</option>
                  <option value="unlimited">Illimité</option>
                </Select>
                <Select name="durationMonths" defaultValue="1">
                  <option value="1">1 mois</option>
                  <option value="3">3 mois</option>
                  <option value="6">6 mois</option>
                  <option value="12">12 mois</option>
                </Select>
              </div>
              {error && <p className="text-sm text-brand-600">{error}</p>}
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button className="flex-1" disabled={pending}>
                  {pending ? "Création…" : "Créer"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
