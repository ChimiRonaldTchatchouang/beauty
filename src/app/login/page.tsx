import Link from "next/link";
import { getSession, homeForRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SparkleIcon, GoogleIcon } from "@/components/icons";
import { PasswordLoginForm } from "@/components/PasswordLoginForm";

const ERRORS: Record<string, string> = {
  oauth_state: "Session expirée, réessayez.",
  email_unverified: "Votre email Google n'est pas vérifié.",
  oauth_failed: "La connexion Google a échoué, réessayez.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(homeForRole(session.role));
  const { error } = await searchParams;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-brand-50 via-sand-50 to-sand-50">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-100/50 blur-3xl" />

      <main className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-8 grid h-24 w-24 place-items-center rounded-[28px] bg-brand-500 text-white shadow-soft">
          <SparkleIcon width={48} height={48} />
        </div>
        <h1 className="text-3xl font-bold">SkinScan</h1>
        <p className="mt-3 max-w-sm text-ink-soft">
          Diagnostic cutané par IA pour les centres de beauté et leurs client·e·s.
        </p>

        {error && (
          <p className="mt-6 rounded-2xl bg-brand-50 px-4 py-2 text-sm text-brand-700">
            {ERRORS[error] ?? "Une erreur est survenue."}
          </p>
        )}

        <a
          href="/api/auth/google"
          className="mt-8 inline-flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl border border-sand-200 bg-white px-6 py-3.5 font-semibold text-ink shadow-soft transition active:scale-[0.98] hover:bg-sand-50"
        >
          <GoogleIcon />
          Continuer avec Google
        </a>

        <p className="mt-6 max-w-xs text-xs text-ink-faint">
          Patients et centres se connectent avec Google. Votre rôle est reconnu
          automatiquement.
        </p>

        <PasswordLoginForm />
      </main>

      <footer className="relative px-6 pb-8 text-center text-xs text-ink-faint">
        Analyse cosmétique — aucun diagnostic médical.{" "}
        <Link href="/login" className="underline">
          Aide
        </Link>
      </footer>
    </div>
  );
}
