import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getLicenseState } from "@/lib/license";
import { pingGemini } from "@/lib/gemini";
import { emailConfigured } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Diagnostic pour le gérant : état des services (IA, licence, email).
export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "center_admin" && session.role !== "staff") || !session.centerId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [gemini, license] = await Promise.all([
    pingGemini(),
    getLicenseState(session.centerId),
  ]);

  return NextResponse.json({
    env: {
      geminiKey: Boolean(process.env.GEMINI_API_KEY),
      geminiModel: process.env.GEMINI_MODEL || "gemini-3.6-flash (défaut)",
      resend: emailConfigured(),
      appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
    },
    gemini,
    license: {
      active: license.active,
      reason: license.reason,
      used: license.used,
      quota: license.quota,
      remaining: license.remaining,
    },
  });
}
