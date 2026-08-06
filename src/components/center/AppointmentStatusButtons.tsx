"use client";

import { useTransition } from "react";
import { updateAppointmentStatus } from "@/lib/actions/center";

const LABEL: Record<string, string> = {
  scheduled: "Prévu",
  completed: "Honoré",
  cancelled: "Annulé",
  no_show: "Absent",
};

export function AppointmentStatusButtons({
  id,
  status,
}: {
  id: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
}) {
  const [pending, start] = useTransition();

  if (status !== "scheduled") {
    return (
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          status === "completed"
            ? "bg-green-100 text-green-700"
            : status === "no_show"
              ? "bg-amber-100 text-amber-700"
              : "bg-sand-100 text-ink-faint"
        }`}
      >
        {LABEL[status]}
      </span>
    );
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={() => start(async () => void (await updateAppointmentStatus(id, "completed")))}
        disabled={pending}
        className="rounded-lg bg-green-50 px-2 py-1 text-xs font-semibold text-green-700"
      >
        Honoré
      </button>
      <button
        onClick={() => start(async () => void (await updateAppointmentStatus(id, "no_show")))}
        disabled={pending}
        className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
      >
        Absent
      </button>
      <button
        onClick={() => start(async () => void (await updateAppointmentStatus(id, "cancelled")))}
        disabled={pending}
        className="rounded-lg bg-sand-100 px-2 py-1 text-xs font-semibold text-ink-faint"
      >
        Annuler
      </button>
    </div>
  );
}
