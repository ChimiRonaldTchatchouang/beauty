import { NextResponse } from "next/server";
import { runSetup } from "@/lib/db/migrate-core";

// Installation de la base à la demande (crée les tables + le compte admin).
// Protégé par une clé = AUTH_SECRET. À appeler une fois après le déploiement :
//   https://<ton-app>/api/setup?key=<AUTH_SECRET>
// Idempotent : peut être rappelé sans risque.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "AUTH_SECRET non configuré." }, { status: 500 });
  }
  if (key !== secret) {
    return NextResponse.json({ error: "Clé invalide." }, { status: 401 });
  }

  try {
    const result = await runSetup();
    return NextResponse.json({
      message: "Base installée avec succès.",
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
