"use server";

import { db } from "@/lib/db";
import {
  users,
  skinProfiles,
  scans,
  centers,
  appointments,
  resultEmails,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { sendEmail, resultEmailHtml, emailConfigured } from "@/lib/email";
import { reportShareUrl, reportPdfUrl } from "@/lib/share";
import { generateReportPdf } from "@/lib/pdf";
import { sendWhatsAppDocument, whatsappConfigured } from "@/lib/whatsapp";

async function requireCenter() {
  const session = await getSession();
  if (!session || (session.role !== "center_admin" && session.role !== "staff") || !session.centerId) {
    throw new Error("unauthorized");
  }
  return session as { userId: string; role: "center_admin" | "staff"; centerId: string };
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/** Crée un patient rattaché au centre (avant même son 1er login Google). */
export async function createPatient(formData: FormData): Promise<ActionResult> {
  const s = await requireCenter();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!email) return { ok: false, error: "Email requis." };

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    if (existing.centerId && existing.centerId !== s.centerId) {
      return { ok: false, error: "Cet email est déjà rattaché à un autre centre." };
    }
    // Rattache un compte existant (ex. patient déjà connecté sans centre).
    await db
      .update(users)
      .set({ centerId: s.centerId, role: "patient", name: existing.name ?? name, phone: existing.phone ?? phone })
      .where(eq(users.id, existing.id));
    revalidatePath("/center/patients");
    return { ok: true, id: existing.id };
  }

  const [created] = await db
    .insert(users)
    .values({ email, name: name || null, phone, role: "patient", centerId: s.centerId, activated: false })
    .returning({ id: users.id });
  await db.insert(skinProfiles).values({ userId: created.id }).onConflictDoNothing();

  revalidatePath("/center/patients");
  return { ok: true, id: created.id };
}

/** Met à jour le profil peau / notes internes d'un patient. */
export async function updatePatientProfile(formData: FormData): Promise<ActionResult> {
  const s = await requireCenter();
  const patientId = String(formData.get("patientId") ?? "");
  const [patient] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, patientId), eq(users.centerId, s.centerId)))
    .limit(1);
  if (!patient) return { ok: false, error: "Patient introuvable." };

  const concerns = String(formData.get("concerns") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const values = {
    userId: patientId,
    skinType: String(formData.get("skinType") ?? "") || null,
    ageRange: String(formData.get("ageRange") ?? "") || null,
    concerns,
    allergies: String(formData.get("allergies") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
    updatedAt: new Date(),
  };
  await db
    .insert(skinProfiles)
    .values(values)
    .onConflictDoUpdate({ target: skinProfiles.userId, set: values });

  revalidatePath(`/center/patients/${patientId}`);
  return { ok: true };
}

/** Envoie (ou renvoie) les résultats d'un scan au patient par email. */
export async function sendResults(scanId: string): Promise<ActionResult> {
  const s = await requireCenter();
  if (!emailConfigured()) return { ok: false, error: "Email non configuré (RESEND)." };

  const [scan] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.id, scanId), eq(scans.centerId, s.centerId)))
    .limit(1);
  if (!scan || !scan.analysis) return { ok: false, error: "Scan introuvable." };

  const [patient] = await db.select().from(users).where(eq(users.id, scan.patientId)).limit(1);
  if (!patient?.email) return { ok: false, error: "Patient sans email." };

  const [center] = await db.select().from(centers).where(eq(centers.id, s.centerId)).limit(1);
  const portalUrl = (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "") + "/me";

  const html = resultEmailHtml({
    patientName: patient.name,
    centerName: center?.name ?? "Votre centre",
    centerLogo: center?.logoUrl,
    brandColor: center?.brandColor,
    analysis: scan.analysis,
    routine: scan.routine ?? null,
    portalUrl,
    reportUrl: reportPdfUrl(scan.id),
  });

  // Génère le vrai PDF et le joint à l'email.
  let attachments: { filename: string; content: string }[] | undefined;
  try {
    const d = scan.createdAt;
    const scanRef = `SCAN-${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}-${scan.id.slice(0, 4).toUpperCase()}`;
    const pdf = await generateReportPdf({
      center: { name: center?.name ?? "SkinScan", city: center?.city, contactEmail: center?.contactEmail, contactPhone: center?.contactPhone },
      patientLabel: patient.name ?? "Patient",
      scanRef,
      date: d.toISOString(),
      analysis: scan.analysis,
      routine: scan.routine ?? null,
      image: scan.imageData,
    });
    attachments = [{ filename: `rapport-${scanRef}.pdf`, content: Buffer.from(pdf).toString("base64") }];
  } catch (e) {
    console.error("[sendResults] pdf", e);
  }

  const result = await sendEmail({
    to: patient.email,
    subject: `Vos résultats de peau — ${center?.name ?? "SkinScan"}`,
    html,
    replyTo: center?.contactEmail ?? undefined,
    attachments,
  });

  await db.insert(resultEmails).values({
    scanId: scan.id,
    centerId: s.centerId,
    toEmail: patient.email,
    status: result.ok ? "sent" : "failed",
    providerId: result.id ?? null,
    error: result.error ?? null,
  });

  if (result.ok) {
    await db.update(scans).set({ emailedAt: new Date() }).where(eq(scans.id, scan.id));
    revalidatePath(`/center/patients/${scan.patientId}`);
    return { ok: true };
  }
  return { ok: false, error: result.error };
}

/** Envoie le PDF du scan au patient sur WhatsApp (API Cloud). */
export async function sendWhatsappReport(scanId: string): Promise<ActionResult> {
  const s = await requireCenter();
  if (!whatsappConfigured()) return { ok: false, error: "whatsapp_not_configured" };

  const [scan] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.id, scanId), eq(scans.centerId, s.centerId)))
    .limit(1);
  if (!scan?.analysis) return { ok: false, error: "Scan introuvable." };

  const [patient] = await db.select().from(users).where(eq(users.id, scan.patientId)).limit(1);
  if (!patient?.phone) return { ok: false, error: "Ce patient n'a pas de numéro WhatsApp." };
  const [center] = await db.select().from(centers).where(eq(centers.id, s.centerId)).limit(1);

  const prio = scan.analysis.priorities?.[0]?.title;
  const caption =
    `Votre analyse de peau chez ${center?.name ?? "notre centre"} : score ${scan.analysis.overallScore}/100` +
    `${scan.analysis.skinType ? ` (peau ${scan.analysis.skinType})` : ""}.${prio ? ` Priorité : ${prio}.` : ""}`;

  const res = await sendWhatsAppDocument({
    to: patient.phone,
    link: reportPdfUrl(scan.id),
    filename: "rapport-analyse-peau.pdf",
    caption,
  });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

/** Met à jour les informations d'identité d'un patient. */
export async function updatePatientInfo(formData: FormData): Promise<ActionResult> {
  const s = await requireCenter();
  const patientId = String(formData.get("patientId") ?? "");
  const [patient] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, patientId), eq(users.centerId, s.centerId)))
    .limit(1);
  if (!patient) return { ok: false, error: "Patient introuvable." };

  const name = String(formData.get("name") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Email requis." };

  // Vérifie l'unicité de l'email si modifié.
  if (email !== patient.email) {
    const [clash] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (clash && clash.id !== patientId) return { ok: false, error: "Cet email est déjà utilisé." };
  }

  await db.update(users).set({ name, phone, email }).where(eq(users.id, patientId));
  revalidatePath(`/center/patients/${patientId}`);
  return { ok: true };
}

/** Crée un rendez-vous pour un patient du centre. */
export async function createAppointment(formData: FormData): Promise<ActionResult> {
  const s = await requireCenter();
  const patientId = String(formData.get("patientId") ?? "");
  const scheduledAt = String(formData.get("scheduledAt") ?? "");
  if (!patientId || !scheduledAt) return { ok: false, error: "Patient et date requis." };

  const [patient] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, patientId), eq(users.centerId, s.centerId)))
    .limit(1);
  if (!patient) return { ok: false, error: "Patient introuvable." };

  await db.insert(appointments).values({
    centerId: s.centerId,
    patientId,
    staffId: s.userId,
    scheduledAt: new Date(scheduledAt),
    durationMin: Number(formData.get("durationMin") ?? 45) || 45,
    reason: String(formData.get("reason") ?? "") || null,
  });
  revalidatePath("/center/appointments");
  revalidatePath(`/center/patients/${patientId}`);
  return { ok: true };
}

/** Change le statut d'un rendez-vous (honoré, annulé, absent…). */
export async function updateAppointmentStatus(
  id: string,
  status: "scheduled" | "completed" | "cancelled" | "no_show",
): Promise<ActionResult> {
  const s = await requireCenter();
  await db
    .update(appointments)
    .set({ status })
    .where(and(eq(appointments.id, id), eq(appointments.centerId, s.centerId)));
  revalidatePath("/center/appointments");
  return { ok: true };
}
