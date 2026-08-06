import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scans } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Suppression d'un scan par le patient lui-même (droit à l'effacement).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { id } = await params;
  await db.delete(scans).where(and(eq(scans.id, id), eq(scans.patientId, session.userId)));
  return NextResponse.json({ ok: true });
}
