"use server";

import { db } from "@/lib/db";
import { centers, licenses, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import type { ActionResult } from "./center";

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

/** Crée un centre + sa licence initiale + invite son gérant (par email Google). */
export async function createCenter(formData: FormData): Promise<ActionResult> {
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

  // Invitation du gérant : on crée (ou rattache) l'utilisateur center_admin.
  const [existing] = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (existing) {
    await db
      .update(users)
      .set({ role: "center_admin", centerId: center.id })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      email: adminEmail,
      role: "center_admin",
      centerId: center.id,
      activated: false,
    });
  }

  revalidatePath("/admin");
  return { ok: true, id: center.id };
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
