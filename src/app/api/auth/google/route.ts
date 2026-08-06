import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildConsentUrl, googleConfigured } from "@/lib/google";

// Démarre le flux OAuth Google : pose un state anti-CSRF puis redirige.
export async function GET() {
  if (!googleConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth non configuré (GOOGLE_CLIENT_ID/SECRET)." },
      { status: 503 },
    );
  }
  const state = crypto.randomUUID();
  const store = await cookies();
  store.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return NextResponse.redirect(buildConsentUrl(state));
}
