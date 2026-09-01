// Généré depuis drizzle/0000_init_b2b.sql — schéma embarqué pour exécution
// côté serverless (aucune lecture de fichier au runtime).
// Ne pas éditer à la main : régénérer si le schéma change.

export const SCHEMA_DDL = `
CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."lang" AS ENUM('fr', 'en');--> statement-breakpoint
CREATE TYPE "public"."license_plan" AS ENUM('trial', 'starter', 'pro', 'unlimited');--> statement-breakpoint
CREATE TYPE "public"."license_status" AS ENUM('active', 'suspended', 'expired');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'center_admin', 'staff', 'patient');--> statement-breakpoint
CREATE TYPE "public"."scan_status" AS ENUM('pending', 'analyzed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('none', 'low', 'medium', 'high');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"center_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"staff_id" uuid,
	"scan_id" uuid,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_min" integer DEFAULT 45,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'beauty_center' NOT NULL,
	"city" text,
	"contact_email" text,
	"contact_phone" text,
	"logo_url" text,
	"brand_color" text DEFAULT '#d95b3c',
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "license_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"center_id" uuid NOT NULL,
	"license_id" uuid,
	"kind" text NOT NULL,
	"amount_money_cents" integer,
	"currency" text DEFAULT 'XAF',
	"provider" text,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"center_id" uuid NOT NULL,
	"plan" "license_plan" DEFAULT 'trial' NOT NULL,
	"status" "license_status" DEFAULT 'active' NOT NULL,
	"monthly_scan_quota" integer DEFAULT 50,
	"max_staff" integer DEFAULT 3,
	"price_cents" integer,
	"currency" text DEFAULT 'XAF',
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"center_id" uuid,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"key_ingredient" text,
	"targets_concern" text,
	"description" text,
	"price_cents" integer,
	"currency" text DEFAULT 'XAF',
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "result_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"center_id" uuid NOT NULL,
	"to_email" text NOT NULL,
	"status" "email_status" NOT NULL,
	"provider_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"category" text NOT NULL,
	"score" integer NOT NULL,
	"severity" "severity" DEFAULT 'none' NOT NULL,
	"zone" text,
	"explanation" text
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"center_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"staff_id" uuid,
	"image_data" text,
	"thumbnail_data" text,
	"images" jsonb,
	"status" "scan_status" DEFAULT 'pending' NOT NULL,
	"overall_score" integer,
	"analysis" jsonb,
	"routine" jsonb,
	"quality" jsonb,
	"error_message" text,
	"emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skin_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"skin_type" text,
	"age_range" text,
	"concerns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allergies" text,
	"current_routine" text,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skin_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" "role" DEFAULT 'patient' NOT NULL,
	"center_id" uuid,
	"google_id" text,
	"image" text,
	"password_hash" text,
	"activated" boolean DEFAULT false NOT NULL,
	"lang" "lang" DEFAULT 'fr' NOT NULL,
	"consent_at" timestamp with time zone,
	"consent_version" text,
	"notify_routine" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_center_id_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD CONSTRAINT "license_transactions_center_id_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD CONSTRAINT "license_transactions_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_center_id_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_center_id_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_emails" ADD CONSTRAINT "result_emails_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_emails" ADD CONSTRAINT "result_emails_center_id_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_metrics" ADD CONSTRAINT "scan_metrics_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_center_id_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skin_profiles" ADD CONSTRAINT "skin_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_center_id_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_center_sched_idx" ON "appointments" USING btree ("center_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "appointments_patient_idx" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "licenses_center_idx" ON "licenses" USING btree ("center_id");--> statement-breakpoint
CREATE INDEX "products_center_idx" ON "products" USING btree ("center_id");--> statement-breakpoint
CREATE INDEX "scan_metrics_scan_idx" ON "scan_metrics" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "scans_center_created_idx" ON "scans" USING btree ("center_id","created_at");--> statement-breakpoint
CREATE INDEX "scans_patient_idx" ON "scans" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "users_center_idx" ON "users" USING btree ("center_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");
`;
