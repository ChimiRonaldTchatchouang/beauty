"use server";

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { centers, licenses, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession, hashPassword } from "@/lib/auth";
import { sendEmail, centerInviteEmailHtml, emailConfigured } from "@/lib/email";
import type { ActionResult } from "./center";

function tempPassword(): string {
  // 8 caractères lisibles (base64url sans caractères ambigus).
  return randomBytes(6).toString("base64url").replace(/[-_]/g, "").slice(0, 8) + "42";
}

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("unauthorized");
  return session;
}

type Plan = "trial" | "starter" | "pro" | "unlimited";

const PLAN_DEFAULTS: Record<Plan, { quota: number | null; maxStaff: number }> = {
  trial: { quota: 10, maxStaff: 1 },
  starter: { quota: 50, maxStaff: 3 },
  pro: { quota: 200, maxStaff: 8 },
  unlimited: { quota: null, maxStaff: 50 },
};

export interface CreateCenterResult extends ActionResult {
  tempPassword?: string;
  email?: string;
  emailSent?: boolean;
  emailError?: string;
}

/** Crée un centre + sa licence initiale + invite son gérant (email + mot de passe). */
export async function createCenter(formData: FormData): Promise<CreateCenterResult> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();
  const plan = String(formData.get("plan") ?? "trial") as Plan;
  if (!name || !adminEmail) return { ok: false, error: "Nom et email du gérant requis." };

  const [center] = await db
    .insert(centers)
    .values({
      name,
      city: String(formData.get("city") ?? "") || null,
      contactEmail: adminEmail,
      contactPhone: String(formData.get("contactPhone") ?? "") || null,
    })
    .returning();

  const conf = PLAN_DEFAULTS[plan] ?? PLAN_DEFAULTS.trial;
  const months = Number(formData.get("durationMonths") ?? 1) || 1;
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);

  await db.insert(licenses).values({
    centerId: center.id,
    plan,
    status: "active",
    monthlyScanQuota: conf.quota,
    maxStaff: conf.maxStaff,
    expiresAt,
  });

  // Invitation du gérant : on crée (ou rattache) l'utilisateur center_admin
  // avec un mot de passe temporaire (connexion email + mot de passe).
  const password = tempPassword();
  const passwordHash = await hashPassword(password);
  const [existing] = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (existing) {
    await db
      .update(users)
      .set({ role: "center_admin", centerId: center.id, passwordHash })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      email: adminEmail,
      name: "Gérant",
      role: "center_admin",
      centerId: center.id,
      activated: false,
      passwordHash,
    });
  }

  // Email d'invitation avec les accès (+ repli : le mot de passe est renvoyé
  // à l'admin pour affichage/partage si l'email n'arrive pas).
  const loginUrl = (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "") + "/login";
  let emailSent = false;
  let emailError: string | undefined;
  if (emailConfigured()) {
    const res = await sendEmail({
      to: adminEmail,
      subject: `Vos accès SkinScan — ${name}`,
      html: centerInviteEmailHtml({ centerName: name, loginUrl, email: adminEmail, password }),
    });
    emailSent = res.ok;
    if (!res.ok) emailError = res.error;
  } else {
    emailError = "Email non configuré (RESEND_API_KEY / RESEND_FROM).";
  }

  revalidatePath("/admin");
  return { ok: true, id: center.id, tempPassword: password, email: adminEmail, emailSent, emailError };
}

/** Renouvelle / change le plan de la licence courante d'un centre. */
export async function renewLicense(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const centerId = String(formData.get("centerId") ?? "");
  const plan = String(formData.get("plan") ?? "starter") as Plan;
  const months = Number(formData.get("durationMonths") ?? 1) || 1;
  const conf = PLAN_DEFAULTS[plan] ?? PLAN_DEFAULTS.starter;

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);

  await db.insert(licenses).values({
    centerId,
    plan,
    status: "active",
    monthlyScanQuota: conf.quota,
    maxStaff: conf.maxStaff,
    expiresAt,
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/centers/${centerId}`);
  return { ok: true };
}

/** Suspend / réactive la licence courante d'un centre. */
export async function setLicenseStatus(
  licenseId: string,
  status: "active" | "suspended",
): Promise<ActionResult> {
  await requireAdmin();
  await db.update(licenses).set({ status }).where(eq(licenses.id, licenseId));
  revalidatePath("/admin");
  return { ok: true };
}

/** Active / désactive un centre. */
export async function setCenterActive(centerId: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  await db.update(centers).set({ active }).where(eq(centers.id, centerId));
  revalidatePath("/admin");
  return { ok: true };
}

export interface ResetPasswordResult extends ActionResult {
  password?: string;
}

/**
 * Réinitialise le mot de passe d'un compte (centre/staff/admin).
 * Si `customPassword` est vide, un mot de passe est généré. Renvoie la valeur
 * en clair pour affichage/transmission (jamais stockée en clair).
 */
export async function resetPassword(
  userId: string,
  customPassword?: string,
): Promise<ResetPasswordResult> {
  await requireAdmin();
  const clean = (customPassword ?? "").trim();
  if (clean && clean.length < 6) {
    return { ok: false, error: "6 caractères minimum." };
  }
  const password = clean || tempPassword();
  const passwordHash = await hashPassword(password);
  const [updated] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId))
    .returning({ centerId: users.centerId });

  if (updated?.centerId) revalidatePath(`/admin/centers/${updated.centerId}`);
  return { ok: true, password };
}
