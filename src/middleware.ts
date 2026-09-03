import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Le middleware vérifie UNIQUEMENT qu'une session valide existe (pas le rôle) :
// le gating par rôle est fait dans chaque layout à partir de la base (source de
// vérité unique). Cela évite toute boucle de redirection cookie ↔ base.
const COOKIE_NAME = "skinscan_session";

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const ok = await hasValidSession(req);
  if (!ok) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/center/:path*", "/me/:path*"],
};
