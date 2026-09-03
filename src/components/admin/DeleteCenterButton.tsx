"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCenter } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteCenterButton({ centerId, centerName }: { centerId: string; centerName: string }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function remove() {
    start(async () => {
      await deleteCenter(centerId);
      setOpen(false);
      router.push("/admin/centers");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4" /> Supprimer le centre
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer « {centerName} » ?</DialogTitle>
          <DialogDescription>
            Cette action est <strong>irréversible</strong> et supprime définitivement le centre et
            <strong> toutes ses données</strong> : patients, scans, routines, rendez-vous, licences,
            produits et comptes du centre.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-ink-soft">
          Tapez <strong>SUPPRIMER</strong> pour confirmer :
        </p>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="field"
          placeholder="SUPPRIMER"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={confirm !== "SUPPRIMER" || pending}
            onClick={remove}
          >
            {pending ? "Suppression…" : "Supprimer définitivement"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
