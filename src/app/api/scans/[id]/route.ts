import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scans } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const { id } = await params;
  const [scan] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.id, id), eq(scans.userId, session.userId)))
    .limit(1);

  if (!scan) {
    return NextResponse.json({ error: "Scan introuvable." }, { status: 404 });
  }
  return NextResponse.json({ scan });
}

// Suppression d'un scan (droit à l'effacement — donnée sensible).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const { id } = await params;
  await db
    .delete(scans)
    .where(and(eq(scans.id, id), eq(scans.userId, session.userId)));
  return NextResponse.json({ ok: true });
}
