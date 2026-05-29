CREATE TABLE "brand_voice_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"brand_profile_id" text,
	"voice_json" text NOT NULL,
	"customer_language" varchar(8) DEFAULT 'en' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brand_voice_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "caption_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"google_post_id" text,
	"caption_text" text NOT NULL,
	"language" varchar(4) DEFAULT 'en' NOT NULL,
	"industry" varchar(32) NOT NULL,
	"service_type" varchar(64) NOT NULL,
	"opening_phrase" text,
	"key_phrases_json" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_post" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"brand_profile_id" text,
	"industry" varchar(32) NOT NULL,
	"service_type" varchar(64) NOT NULL,
	"service_area" text,
	"job_location" text,
	"language" varchar(4) DEFAULT 'en' NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"best_photo_id" text,
	"image_mode" varchar(24) DEFAULT 'single_after' NOT NULL,
	"before_photo_id" text,
	"after_photo_id" text,
	"proof_recommendation_json" text,
	"final_image_url" text,
	"caption" text,
	"caption_policy_json" text,
	"cta_recommendation" varchar(32) DEFAULT 'call_now_button' NOT NULL,
	"posted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_post_photo" (
	"id" text PRIMARY KEY NOT NULL,
	"google_post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"original_url" text NOT NULL,
	"processed_url" text,
	"thumbnail_url" text,
	"original_mime_type" varchar(32),
	"detected_role" varchar(16),
	"role_confidence" integer,
	"best_after_score" integer,
	"crop_hint_json" text,
	"risk_flags_json" text,
	"why_selected" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"day_of_week" integer DEFAULT 1 NOT NULL,
	"hour" integer DEFAULT 9 NOT NULL,
	"last_sent_at" timestamp,
	"paused_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reminder_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "upload_consent" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"google_post_id" text,
	"has_marketing_permission" boolean DEFAULT false NOT NULL,
	"accepted_terms_version" varchar(16) DEFAULT 'v1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_voice_profile" ADD CONSTRAINT "brand_voice_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_voice_profile" ADD CONSTRAINT "brand_voice_profile_brand_profile_id_brand_profile_id_fk" FOREIGN KEY ("brand_profile_id") REFERENCES "public"."brand_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caption_history" ADD CONSTRAINT "caption_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caption_history" ADD CONSTRAINT "caption_history_google_post_id_google_post_id_fk" FOREIGN KEY ("google_post_id") REFERENCES "public"."google_post"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_post" ADD CONSTRAINT "google_post_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_post" ADD CONSTRAINT "google_post_brand_profile_id_brand_profile_id_fk" FOREIGN KEY ("brand_profile_id") REFERENCES "public"."brand_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_post_photo" ADD CONSTRAINT "google_post_photo_google_post_id_google_post_id_fk" FOREIGN KEY ("google_post_id") REFERENCES "public"."google_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_post_photo" ADD CONSTRAINT "google_post_photo_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_settings" ADD CONSTRAINT "reminder_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_consent" ADD CONSTRAINT "upload_consent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_consent" ADD CONSTRAINT "upload_consent_google_post_id_google_post_id_fk" FOREIGN KEY ("google_post_id") REFERENCES "public"."google_post"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "caption_history_user_service_idx" ON "caption_history" USING btree ("user_id","service_type","created_at");--> statement-breakpoint
CREATE INDEX "google_post_user_idx" ON "google_post" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "google_post_user_created_idx" ON "google_post" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "google_post_photo_post_idx" ON "google_post_photo" USING btree ("google_post_id");--> statement-breakpoint
CREATE INDEX "upload_consent_user_idx" ON "upload_consent" USING btree ("user_id");