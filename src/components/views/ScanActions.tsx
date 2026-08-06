"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

// Actions sur un scan : suppression (droit à l'effacement) + partage opt-in.
export function ScanActions({ scanId }: { scanId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(t.profile.deleteData + " ?")) return;
    setBusy(true);
    try {
      await fetch(`/api/me/scans/${scanId}`, { method: "DELETE" });
      router.push("/me/history");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = `${window.location.origin}/`;
    const text = "J'ai suivi mon analyse de peau avec SkinScan ✨";
    if (navigator.share) {
      await navigator.share({ title: "SkinScan", text, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`).catch(() => {});
      alert("Lien copié !");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={share}
        className="rounded-full border border-sand-200 bg-white px-3 py-1.5 text-sm font-medium"
      >
        ↗ Partager
      </button>
      <button
        onClick={remove}
        disabled={busy}
        className="rounded-full border border-sand-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-600"
      >
        🗑
      </button>
    </div>
  );
}
