CREATE TABLE "contact_message" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text NOT NULL,
	"message" text NOT NULL,
	"locale" varchar(8),
	"ip_address" text,
	"user_agent" text,
	"email_delivered" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "contact_message_created_at_idx" ON "contact_message" USING btree ("created_at");