import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForUser } from "@/lib/google";
import { resolveUserOnLogin } from "@/lib/account";
import { createSession, homeForRole } from "@/lib/auth";

// Callback OAuth Google : vérifie le state, échange le code, résout le compte,
// ouvre la session et redirige vers l'espace du rôle.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get("oauth_state")?.value;

  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? url.origin;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${origin}/login?error=oauth_state`);
  }
  store.delete("oauth_state");

  try {
    const googleUser = await exchangeCodeForUser(code);
    if (!googleUser.emailVerified) {
      return NextResponse.redirect(`${origin}/login?error=email_unverified`);
    }
    const user = await resolveUserOnLogin(googleUser);
    await createSession({ userId: user.id, role: user.role, centerId: user.centerId });
    return NextResponse.redirect(`${origin}${homeForRole(user.role)}`);
  } catch (err) {
    console.error("[google callback]", err);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }
}
