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
  real,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["user", "pro", "admin"]);
export const planEnum = pgEnum("plan", ["free", "premium"]);
export const langEnum = pgEnum("lang", ["fr", "en"]);
export const scanStatusEnum = pgEnum("scan_status", [
  "pending",
  "analyzed",
  "failed",
]);
// Sévérité normalisée renvoyée par l'analyse IA.
export const severityEnum = pgEnum("severity", ["none", "low", "medium", "high"]);

// ---------------------------------------------------------------------------
// Organisations partenaires (Pharmacie / salon / clinique) — Phase 2.
// Présentes dès la v1 pour éviter une refonte du schéma plus tard.
// ---------------------------------------------------------------------------

export const partners = pgTable("partners", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("pharmacy"), // pharmacy | salon | clinic
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  // Crédits de scans achetés (rechargeables via Mobile Money en phase 2).
  scanCredits: integer("scan_credits").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Utilisateurs
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").unique(),
    phone: text("phone").unique(),
    passwordHash: text("password_hash"),
    name: text("name"),
    role: userRoleEnum("role").notNull().default("user"),
    plan: planEnum("plan").notNull().default("free"),
    lang: langEnum("lang").notNull().default("fr"),

    // Rattachement optionnel à un partenaire Pro (client d'une pharmacie…).
    partnerId: uuid("partner_id").references(() => partners.id, {
      onDelete: "set null",
    }),

    // Consentement données sensibles (photo de visage).
    consentAt: timestamp("consent_at", { withTimezone: true }),
    consentVersion: text("consent_version"),

    onboardingCompleted: boolean("onboarding_completed")
      .notNull()
      .default(false),

    // Préférences de notifications.
    notifyRoutine: boolean("notify_routine").notNull().default(true),
    notifyScan: boolean("notify_scan").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    partnerIdx: index("users_partner_idx").on(t.partnerId),
  }),
);

// ---------------------------------------------------------------------------
// Profil peau (issu du questionnaire d'onboarding, modifiable).
// ---------------------------------------------------------------------------

export const skinProfiles = pgTable("skin_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  skinType: text("skin_type"), // oily | dry | combination | sensitive | unknown
  ageRange: text("age_range"), // "<18" | "18-24" | "25-34" | "35-44" | "45-54" | "55+"
  // Préoccupations (choix multiples) : acne, dark_spots, wrinkles, pores, redness, dullness
  concerns: jsonb("concerns").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  allergies: text("allergies"),
  currentRoutine: text("current_routine"), // none | basic | complete
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Scans
// ---------------------------------------------------------------------------

export const scans = pgTable(
  "scans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Image stockée en data URL (base64). En production on brancherait un
    // object storage (Vercel Blob / S3) — la colonne resterait la référence.
    imageData: text("image_data"),
    thumbnailData: text("thumbnail_data"),

    status: scanStatusEnum("status").notNull().default("pending"),

    // Score global de santé de la peau (0-100).
    overallScore: integer("overall_score"),

    // Résultat brut normalisé de l'analyse : { metrics: [...], summary, ... }
    analysis: jsonb("analysis").$type<ScanAnalysis>(),

    // Routine générée à partir de l'analyse + profil.
    routine: jsonb("routine").$type<Routine>(),

    // Métadonnées de qualité image (mesurées côté client).
    quality: jsonb("quality").$type<Record<string, number>>(),

    errorMessage: text("error_message"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("scans_user_created_idx").on(t.userId, t.createdAt),
  }),
);

// Détail par catégorie de problème détecté.
export const scanMetrics = pgTable(
  "scan_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => scans.id, { onDelete: "cascade" }),
    // acne | dark_spots | wrinkles | pores | redness | hydration | evenness
    category: text("category").notNull(),
    score: integer("score").notNull(), // 0-100 (100 = parfait)
    severity: severityEnum("severity").notNull().default("none"),
    zone: text("zone"), // front | joues | nez | menton | contour_yeux | global
    explanation: text("explanation"),
  },
  (t) => ({
    scanIdx: index("scan_metrics_scan_idx").on(t.scanId),
  }),
);

// ---------------------------------------------------------------------------
// Catalogue produits (partenaire ou générique) — recommandations.
// ---------------------------------------------------------------------------

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  partnerId: uuid("partner_id").references(() => partners.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  category: text("category").notNull(), // cleanser | serum | moisturizer | spf | treatment
  // Ingrédient clé (mapping problème → ingrédient) : niacinamide, retinol, spf…
  keyIngredient: text("key_ingredient"),
  targetsConcern: text("targets_concern"), // acne | dark_spots | ...
  description: text("description"),
  priceCents: integer("price_cents"),
  currency: text("currency").default("XAF"),
  active: boolean("active").notNull().default(true),
});

// ---------------------------------------------------------------------------
// Facturation / crédits partenaires — Phase 2 (structure présente en v1).
// ---------------------------------------------------------------------------

export const partnerTransactions = pgTable("partner_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // topup | usage | refund
  amountCredits: integer("amount_credits").notNull(),
  amountMoneyCents: integer("amount_money_cents"),
  currency: text("currency").default("XAF"),
  provider: text("provider"), // mtn_momo | orange_money | ...
  reference: text("reference"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Sessions (auth par cookie signé — la table sert d'audit/révocation légère).
// ---------------------------------------------------------------------------

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(skinProfiles, {
    fields: [users.id],
    references: [skinProfiles.userId],
  }),
  partner: one(partners, {
    fields: [users.partnerId],
    references: [partners.id],
  }),
  scans: many(scans),
}));

export const scansRelations = relations(scans, ({ one, many }) => ({
  user: one(users, { fields: [scans.userId], references: [users.id] }),
  metrics: many(scanMetrics),
}));

export const scanMetricsRelations = relations(scanMetrics, ({ one }) => ({
  scan: one(scans, { fields: [scanMetrics.scanId], references: [scans.id] }),
}));

export const partnersRelations = relations(partners, ({ many }) => ({
  users: many(users),
  products: many(products),
  transactions: many(partnerTransactions),
}));

// ---------------------------------------------------------------------------
// Types partagés (analyse & routine) — utilisés côté API et UI.
// ---------------------------------------------------------------------------

export type Severity = "none" | "low" | "medium" | "high";

export interface ScanMetricResult {
  category: string;
  score: number; // 0-100
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
  category: string; // cleanser | serum | moisturizer | spf | treatment
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
