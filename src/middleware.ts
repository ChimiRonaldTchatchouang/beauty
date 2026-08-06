import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Protection des espaces par rôle (edge). On vérifie le JWT de session et on
// redirige selon le rôle. Les routes /api gèrent elles-mêmes leur autorisation.
const COOKIE_NAME = "skinscan_session";

type Role = "admin" | "center_admin" | "staff" | "patient";

function homeForRole(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "center_admin" || role === "staff") return "/center";
  return "/me";
}

async function readRole(req: NextRequest): Promise<Role | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return (payload.role as Role) ?? null;
  } catch {
    return null;
  }
}

const GUARDS: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/center", roles: ["center_admin", "staff"] },
  { prefix: "/me", roles: ["patient"] },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const guard = GUARDS.find((g) => pathname.startsWith(g.prefix));
  if (!guard) return NextResponse.next();

  const role = await readRole(req);

  if (!role) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!guard.roles.includes(role)) {
    // Connecté mais mauvais espace → on renvoie vers le sien.
    return NextResponse.redirect(new URL(homeForRole(role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/center/:path*", "/me/:path*"],
};
