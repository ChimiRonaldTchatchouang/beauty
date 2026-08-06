"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { I18nProvider, useI18n } from "@/lib/i18n/context";
import { SparkleIcon } from "./icons";

function Form({ mode }: { mode: "login" | "register" }) {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.auth.error);
        return;
      }
      if (mode === "register") {
        router.push("/consent");
      } else if (!data.consented) {
        router.push("/consent");
      } else if (!data.onboardingCompleted) {
        router.push("/onboarding");
      } else {
        router.push("/home");
      }
      router.refresh();
    } catch {
      setError(t.auth.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-sand-50 px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500 text-white">
            <SparkleIcon width={24} height={24} />
          </span>
          <span className="text-lg font-bold">{t.common.appName}</span>
        </Link>

        <h1 className="text-2xl font-bold">
          {mode === "login" ? t.auth.loginTitle : t.auth.registerTitle}
        </h1>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          {mode === "register" && (
            <input
              className="field"
              placeholder={t.auth.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
            />
          )}
          <input
            className="field"
            type="email"
            inputMode="email"
            placeholder={t.auth.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            className="field"
            type="password"
            placeholder={t.auth.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />

          {error && <p className="text-sm text-brand-600">{error}</p>}

          <button className="btn-primary mt-2 w-full" disabled={loading}>
            {loading
              ? t.common.loading
              : mode === "login"
                ? t.auth.login
                : t.auth.register}
          </button>
        </form>

        {/* Téléphone + OTP : prévu (marché local). Placeholder d'UI. */}
        <div className="mt-6 text-center text-sm text-ink-faint">
          {t.auth.orPhone}
        </div>
        <button
          type="button"
          disabled
          title="Bientôt disponible"
          className="btn-ghost mt-3 w-full opacity-60"
        >
          📱 {t.auth.phone}
        </button>

        <p className="mt-8 text-center text-sm text-ink-soft">
          {mode === "login" ? t.auth.noAccount : t.auth.hasAccount}{" "}
          <Link
            href={mode === "login" ? "/register" : "/login"}
            className="font-semibold text-brand-600"
          >
            {mode === "login" ? t.auth.register : t.auth.login}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  return (
    <I18nProvider>
      <Form mode={mode} />
    </I18nProvider>
  );
}
