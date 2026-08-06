"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import type { Lang } from "@/lib/i18n/dictionaries";

interface Props {
  user: {
    name: string | null;
    email: string | null;
    plan: "free" | "premium";
    lang: Lang;
    notifyRoutine: boolean;
    notifyScan: boolean;
  };
  profile: {
    skinType: string | null;
    ageRange: string | null;
    concerns: string[];
    currentRoutine: string | null;
  } | null;
  usage: { used: number; limit: number | null; remaining: number | null };
}

export function ProfileView({ user, profile, usage }: Props) {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const [notifyRoutine, setNotifyRoutine] = useState(user.notifyRoutine);
  const [notifyScan, setNotifyScan] = useState(user.notifyScan);

  async function patch(body: Record<string, unknown>) {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function deleteAccount() {
    if (!confirm(t.profile.deleteData + " ?\n\nCette action est irréversible.")) return;
    await fetch("/api/account", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      new Notification("SkinScan", { body: "Les rappels sont activés ✨" });
    }
  }

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">{t.profile.title}</h1>

      {/* Carte identité */}
      <div className="card mb-6 flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-2xl">
          {(user.name?.[0] ?? "🙂").toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{user.name || "—"}</p>
          <p className="truncate text-sm text-ink-faint">{user.email}</p>
          <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
            {user.plan === "premium" ? `⭐ ${t.profile.premium}` : t.profile.free}
          </span>
        </div>
      </div>

      {/* Abonnement / quota */}
      <Section title={t.profile.subscription}>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-ink-soft">{t.profile.plan}</span>
          <span className="font-semibold">
            {user.plan === "premium" ? t.profile.premium : t.profile.free}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-sand-100 px-4 py-3">
          <span className="text-sm text-ink-soft">{t.home.scansLeft}</span>
          <span className="font-semibold">
            {usage.remaining === null
              ? `∞ (${t.home.unlimited})`
              : `${usage.remaining} / ${usage.limit}`}
          </span>
        </div>
      </Section>

      {/* Profil peau */}
      <Section title={t.profile.editProfile}>
        <Row label={t.onboarding.skinType} value={profile?.skinType} />
        <Row label={t.onboarding.age} value={profile?.ageRange} />
        <Row
          label={t.onboarding.concerns}
          value={profile?.concerns?.length ? profile.concerns.join(", ") : "—"}
        />
        <button
          onClick={() => router.push("/onboarding")}
          className="w-full border-t border-sand-100 px-4 py-3 text-left text-sm font-semibold text-brand-600"
        >
          ✏️ {t.profile.editProfile}
        </button>
      </Section>

      {/* Notifications */}
      <Section title={t.profile.notifications}>
        <Toggle
          label={t.profile.routineReminder}
          checked={notifyRoutine}
          onChange={(v) => {
            setNotifyRoutine(v);
            patch({ notifyRoutine: v });
            if (v) enableNotifications();
          }}
        />
        <Toggle
          label={t.profile.scanReminder}
          checked={notifyScan}
          onChange={(v) => {
            setNotifyScan(v);
            patch({ notifyScan: v });
            if (v) enableNotifications();
          }}
        />
      </Section>

      {/* Langue */}
      <Section title={t.profile.language}>
        <div className="flex gap-2 p-3">
          {(["fr", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`flex-1 rounded-2xl border-2 px-4 py-2 font-semibold transition ${
                lang === l
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-sand-200"
              }`}
            >
              {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
            </button>
          ))}
        </div>
      </Section>

      {/* Confidentialité */}
      <Section title={t.profile.privacy}>
        <a
          href="/api/account/export"
          className="block border-b border-sand-100 px-4 py-3 text-sm font-medium"
        >
          ⬇️ {t.profile.exportData}
        </a>
        <button
          onClick={deleteAccount}
          className="w-full px-4 py-3 text-left text-sm font-medium text-brand-600"
        >
          🗑 {t.profile.deleteData}
        </button>
      </Section>

      {/* Aide / contact (WhatsApp) */}
      <Section title={t.profile.help}>
        <a
          href="https://wa.me/237600000000"
          target="_blank"
          rel="noopener noreferrer"
          className="block px-4 py-3 text-sm font-medium"
        >
          💬 WhatsApp support
        </a>
      </Section>

      <button onClick={logout} className="btn-ghost mt-4 w-full text-brand-600">
        {t.profile.logout}
      </button>

      <p className="mt-6 text-center text-xs text-ink-faint">
        SkinScan · Analyse cosmétique, aucun diagnostic médical.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="mb-2 px-1 text-sm font-semibold text-ink-faint">{title}</h2>
      <div className="overflow-hidden rounded-3xl bg-white shadow-soft">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-sand-100 px-4 py-3 last:border-0">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between border-b border-sand-100 px-4 py-3 last:border-0">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-brand-500" : "bg-sand-200"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}
