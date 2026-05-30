CREATE TABLE "anonymous_quota" (
	"id" text PRIMARY KEY NOT NULL,
	"ip_hash" text NOT NULL,
	"usage_date" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"last_anon_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "google_post" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "google_post_photo" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "google_post" ADD COLUMN "anon_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "anonymous_quota_ip_date_uq" ON "anonymous_quota" USING btree ("ip_hash","usage_date");--> statement-breakpoint
CREATE INDEX "anonymous_quota_created_at_idx" ON "anonymous_quota" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "google_post_anon_id_idx" ON "google_post" USING btree ("anon_id");--> statement-breakpoint
ALTER TABLE "google_post"
  ADD CONSTRAINT "google_post_owner_check"
  CHECK ("user_id" IS NOT NULL OR "anon_id" IS NOT NULL);--> statement-breakpoint
DROP INDEX IF EXISTS "google_post_anon_id_idx";--> statement-breakpoint
CREATE INDEX "google_post_anon_id_idx"
  ON "google_post" ("anon_id")
  WHERE "anon_id" IS NOT NULL;