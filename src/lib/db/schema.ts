import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ===========================================================================
// SkinScan B2B — plateforme multi-tenant vendue sous licence à des centres.
// Rôles : admin (éditeur) · center_admin / staff (centre) · patient.
// Isolation : (presque) toute donnée porte un center_id.
// ===========================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum("role", [
  "admin", // super-admin plateforme (toi)
  "center_admin", // propriétaire / gérant d'un centre
  "staff", // esthéticien·ne d'un centre
  "patient", // client scanné dans un centre
]);

export const licensePlanEnum = pgEnum("license_plan", [
  "trial",
  "starter",
  "pro",
  "unlimited",
]);

export const licenseStatusEnum = pgEnum("license_status", [
  "active",
  "suspended",
  "expired",
]);

export const scanStatusEnum = pgEnum("scan_status", [
  "pending",
  "analyzed",
  "failed",
]);

export const severityEnum = pgEnum("severity", ["none", "low", "medium", "high"]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

export const emailStatusEnum = pgEnum("email_status", ["sent", "failed"]);

export const langEnum = pgEnum("lang", ["fr", "en"]);

// ---------------------------------------------------------------------------
// Centres de beauté (tenants)
// ---------------------------------------------------------------------------

export const centers = pgTable("centers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("beauty_center"), // beauty_center | pharmacy | clinic | spa
  city: text("city"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  logoUrl: text("logo_url"), // utilisé en en-tête des emails
  brandColor: text("brand_color").default("#d95b3c"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Licences (émises par l'admin, une par centre "courante")
// ---------------------------------------------------------------------------

export const licenses = pgTable(
  "licenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    centerId: uuid("center_id")
      .notNull()
      .references(() => centers.id, { onDelete: "cascade" }),
    plan: licensePlanEnum("plan").notNull().default("trial"),
    status: licenseStatusEnum("status").notNull().default("active"),
    // Quota de scans par mois (null = illimité).
    monthlyScanQuota: integer("monthly_scan_quota").default(50),
    // Nombre max de comptes staff.
    maxStaff: integer("max_staff").default(3),
    priceCents: integer("price_cents"),
    currency: text("currency").default("XAF"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    centerIdx: index("licenses_center_idx").on(t.centerId),
  }),
);

// ---------------------------------------------------------------------------
// Utilisateurs (tous rôles). Un patient est créé par un centre ; il "active"
// son compte au 1er login Google (match par email).
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    role: roleEnum("role").notNull().default("patient"),

    centerId: uuid("center_id").references(() => centers.id, {
      onDelete: "set null",
    }),

    // Auth Google (patients / centres).
    googleId: text("google_id").unique(),
    image: text("image"),

    // Auth email + mot de passe (admin / comptes provisionnés).
    passwordHash: text("password_hash"),

    // Un patient créé par le centre mais pas encore connecté = pas encore "actif".
    activated: boolean("activated").notNull().default(false),

    lang: langEnum("lang").notNull().default("fr"),

    // Consentement données sensibles (photo de visage).
    consentAt: timestamp("consent_at", { withTimezone: true }),
    consentVersion: text("consent_version"),

    notifyRoutine: boolean("notify_routine").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    centerIdx: index("users_center_idx").on(t.centerId),
    roleIdx: index("users_role_idx").on(t.role),
  }),
);

// ---------------------------------------------------------------------------
// Profil peau (par patient)
// ---------------------------------------------------------------------------

export const skinProfiles = pgTable("skin_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  skinType: text("skin_type"),
  ageRange: text("age_range"),
  concerns: jsonb("concerns").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  allergies: text("allergies"),
  currentRoutine: text("current_routine"),
  notes: text("notes"), // notes internes du centre (non visibles patient)
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Scans (réalisés par un centre pour un patient)
// ---------------------------------------------------------------------------

export const scans = pgTable(
  "scans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    centerId: uuid("center_id")
      .notNull()
      .references(() => centers.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id").references(() => users.id, { onDelete: "set null" }),

    imageData: text("image_data"),
    thumbnailData: text("thumbnail_data"),

    status: scanStatusEnum("status").notNull().default("pending"),
    overallScore: integer("overall_score"),
    analysis: jsonb("analysis").$type<ScanAnalysis>(),
    routine: jsonb("routine").$type<Routine>(),
    quality: jsonb("quality").$type<Record<string, number | boolean | string>>(),
    errorMessage: text("error_message"),

    // Traçabilité de l'envoi email au patient.
    emailedAt: timestamp("emailed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    centerCreatedIdx: index("scans_center_created_idx").on(t.centerId, t.createdAt),
    patientIdx: index("scans_patient_idx").on(t.patientId),
  }),
);

export const scanMetrics = pgTable(
  "scan_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => scans.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    score: integer("score").notNull(),
    severity: severityEnum("severity").notNull().default("none"),
    zone: text("zone"),
    explanation: text("explanation"),
  },
  (t) => ({
    scanIdx: index("scan_metrics_scan_idx").on(t.scanId),
  }),
);

// ---------------------------------------------------------------------------
// Rendez-vous (gérés par le centre, consultés par le patient)
// ---------------------------------------------------------------------------

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    centerId: uuid("center_id")
      .notNull()
      .references(() => centers.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id").references(() => users.id, { onDelete: "set null" }),
    scanId: uuid("scan_id").references(() => scans.id, { onDelete: "set null" }),

    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").default(45),
    status: appointmentStatusEnum("status").notNull().default("scheduled"),
    reason: text("reason"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    centerSchedIdx: index("appointments_center_sched_idx").on(t.centerId, t.scheduledAt),
    patientIdx: index("appointments_patient_idx").on(t.patientId),
  }),
);

// ---------------------------------------------------------------------------
// Emails de résultats envoyés (audit)
// ---------------------------------------------------------------------------

export const resultEmails = pgTable("result_emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  centerId: uuid("center_id")
    .notNull()
    .references(() => centers.id, { onDelete: "cascade" }),
  toEmail: text("to_email").notNull(),
  status: emailStatusEnum("status").notNull(),
  providerId: text("provider_id"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Catalogue produits (par centre) — recommandations priorisées
// ---------------------------------------------------------------------------

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    centerId: uuid("center_id").references(() => centers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    keyIngredient: text("key_ingredient"),
    targetsConcern: text("targets_concern"),
    description: text("description"),
    priceCents: integer("price_cents"),
    currency: text("currency").default("XAF"),
    active: boolean("active").notNull().default(true),
  },
  (t) => ({
    centerIdx: index("products_center_idx").on(t.centerId),
  }),
);

// ---------------------------------------------------------------------------
// Transactions licences (facturation / recharge — phase 2)
// ---------------------------------------------------------------------------

export const licenseTransactions = pgTable("license_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  centerId: uuid("center_id")
    .notNull()
    .references(() => centers.id, { onDelete: "cascade" }),
  licenseId: uuid("license_id").references(() => licenses.id, { onDelete: "set null" }),
  kind: text("kind").notNull(), // subscription | topup | refund
  amountMoneyCents: integer("amount_money_cents"),
  currency: text("currency").default("XAF"),
  provider: text("provider"), // mtn_momo | orange_money | manual
  reference: text("reference"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const centersRelations = relations(centers, ({ many, one }) => ({
  users: many(users),
  scans: many(scans),
  appointments: many(appointments),
  products: many(products),
  license: one(licenses, { fields: [centers.id], references: [licenses.centerId] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  center: one(centers, { fields: [users.centerId], references: [centers.id] }),
  profile: one(skinProfiles, { fields: [users.id], references: [skinProfiles.userId] }),
  scans: many(scans),
}));

export const scansRelations = relations(scans, ({ one, many }) => ({
  center: one(centers, { fields: [scans.centerId], references: [centers.id] }),
  patient: one(users, { fields: [scans.patientId], references: [users.id] }),
  metrics: many(scanMetrics),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  center: one(centers, { fields: [appointments.centerId], references: [centers.id] }),
  patient: one(users, { fields: [appointments.patientId], references: [users.id] }),
}));

// ---------------------------------------------------------------------------
// Types partagés (analyse & routine)
// ---------------------------------------------------------------------------

export type Severity = "none" | "low" | "medium" | "high";

export interface ScanMetricResult {
  category: string;
  score: number;
  severity: Severity;
  zone: string;
  explanation: string;
}

export interface ScanAnalysis {
  overallScore: number;
  summary: string;
  metrics: ScanMetricResult[];
}

export interface RoutineStep {
  order: number;
  category: string;
  title: string;
  reason: string;
  keyIngredient?: string;
  frequency: string;
}

export interface Routine {
  morning: RoutineStep[];
  evening: RoutineStep[];
  tips: { title: string; body: string }[];
}
