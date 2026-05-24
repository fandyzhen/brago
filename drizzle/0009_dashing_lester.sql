CREATE TABLE "brand_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_name" text,
	"phone" text,
	"service_area" text,
	"is_licensed" boolean DEFAULT false NOT NULL,
	"is_insured" boolean DEFAULT false NOT NULL,
	"logo_url" text,
	"google_review_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brand_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"industry" varchar(32) NOT NULL,
	"channel" varchar(32) NOT NULL,
	"layout_mode" varchar(16) NOT NULL,
	"template_id" text NOT NULL,
	"headline" text NOT NULL,
	"caption" text,
	"phone_display" varchar(12),
	"status" varchar(16) DEFAULT 'completed' NOT NULL,
	"output_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_image_pair" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"area_index" integer NOT NULL,
	"area_label" text,
	"before_image_url" text,
	"after_image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_profile" ADD CONSTRAINT "brand_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_image_pair" ADD CONSTRAINT "post_image_pair_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_image_pair_post_idx" ON "post_image_pair" USING btree ("post_id");