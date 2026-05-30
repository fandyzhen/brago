import { pgTable, text, timestamp, boolean, integer, varchar, index } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  // total available credits for the user
  credits: integer("credits").default(0).notNull(),
  // user role: 'admin' | 'user'
  role: text("role").default("user").notNull(),
  // current subscription plan
  planKey: text("plan_key").default("free"),
  // ban status
  banned: boolean("banned").default(false).notNull(),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Payment records (one-time purchases and subscription renewals)
export const payment = pgTable("payment", {
  id: text("id").primaryKey(),
  provider: varchar("provider", { length: 32 }).default("creem").notNull(),
  providerPaymentId: text("provider_payment_id").notNull().unique(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 8 }).default("usd").notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(), // 'one_time' | 'subscription'
  planKey: varchar("plan_key", { length: 64 }),
  creditsGranted: integer("credits_granted").default(0).notNull(),
  raw: text("raw"), // store provider payload as JSON string
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Active subscriptions
export const subscription = pgTable("subscription", {
  id: text("id").primaryKey(),
  provider: varchar("provider", { length: 32 }).default("creem").notNull(),
  providerSubId: text("provider_sub_id").notNull().unique(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  planKey: varchar("plan_key", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  currentPeriodEnd: timestamp("current_period_end"),
  raw: text("raw"), // store provider payload as JSON string
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Credit ledger for auditability
export const creditLedger = pgTable("credit_ledger", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  delta: integer("delta").notNull(),
  reason: varchar("reason", { length: 64 }).notNull(), // 'subscription_cycle' | 'one_time_pack' | 'adjustment' | 'chat_usage' | ...
  paymentId: text("payment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptionCreditSchedule = pgTable(
  "subscription_credit_schedule",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscription.id, { onDelete: "cascade" })
      .unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planKey: varchar("plan_key", { length: 64 }).notNull(),
    creditsPerGrant: integer("credits_per_grant").notNull(),
    intervalMonths: integer("interval_months").notNull(),
    grantsRemaining: integer("grants_remaining").notNull(),
    totalCreditsRemaining: integer("total_credits_remaining").notNull(),
    nextGrantAt: timestamp("next_grant_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => ({
    nextGrantIdx: index("subscription_credit_schedule_next_grant_idx").on(table.nextGrantAt),
  }),
);

// Chat sessions
export const chatSession = pgTable("chat_session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title"),
  model: varchar("model", { length: 48 }).default("doubao-1-5-thinking-pro-250415").notNull(),
  totalMessages: integer("total_messages").default(0).notNull(),
  totalCreditsUsed: integer("total_credits_used").default(0).notNull(),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Chat messages
export const chatMessage = pgTable("chat_message", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => chatSession.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 16 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  creditsUsed: integer("credits_used").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Generation history for images and videos
export const generationHistory = pgTable("generation_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 16 }).notNull(), // 'image' | 'video' | 'poster'
  prompt: text("prompt").notNull(),
  imageUrl: text("image_url"), // For image-to-video generation
  resultUrl: text("result_url"), // Final result URL
  taskId: text("task_id"), // For async video generation tracking
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending, processing, completed, failed
  creditsUsed: integer("credits_used").default(0).notNull(),
  metadata: text("metadata"), // JSON string for additional data
  error: text("error"), // Error message if failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Password reset tokens
export const passwordResetToken = pgTable("password_reset_token", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Newsletter subscriptions
export const newsletterSubscription = pgTable("newsletter_subscription", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  status: varchar("status", { length: 16 }).notNull().default("active"), // active, unsubscribed
  unsubscribeToken: text("unsubscribe_token").notNull().unique(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const contactMessage = pgTable(
  "contact_message",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company").notNull(),
    message: text("message").notNull(),
    locale: varchar("locale", { length: 8 }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    emailDelivered: boolean("email_delivered").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index("contact_message_created_at_idx").on(table.createdAt),
  }),
);

// Brand profiles — one per user, stores their business identity for poster generation
export const brandProfile = pgTable("brand_profile", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  businessName: text("business_name"),
  phone: text("phone"),
  serviceArea: text("service_area"),
  isLicensed: boolean("is_licensed").default(false).notNull(),
  isInsured: boolean("is_insured").default(false).notNull(),
  logoUrl: text("logo_url"),
  googleReviewCount: integer("google_review_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});


// Brago posts — finished poster records (per generation)
export const post = pgTable("post", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  industry: varchar("industry", { length: 32 }).notNull(),
  channel: varchar("channel", { length: 32 }).notNull(),
  layoutMode: varchar("layout_mode", { length: 16 }).notNull(),
  templateId: text("template_id").notNull(),
  headline: text("headline").notNull(),
  caption: text("caption"),
  phoneDisplay: varchar("phone_display", { length: 12 }),
  status: varchar("status", { length: 16 }).notNull().default("completed"),
  outputUrl: text("output_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Brago post image pairs — 1-4 before/after pairs per post
export const postImagePair = pgTable(
  "post_image_pair",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    areaIndex: integer("area_index").notNull(),
    areaLabel: text("area_label"),
    beforeImageUrl: text("before_image_url"),
    afterImageUrl: text("after_image_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    postIdx: index("post_image_pair_post_idx").on(t.postId),
  })
);

// === Brago Google-Ready Posts P0 (2026-05-29) ===

export const googlePost = pgTable(
  "google_post",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    brandProfileId: text("brand_profile_id").references(() => brandProfile.id, {
      onDelete: "set null",
    }),
    industry: varchar("industry", { length: 32 }).notNull(),
    serviceType: varchar("service_type", { length: 64 }).notNull(),
    serviceArea: text("service_area"),
    jobLocation: text("job_location"),
    language: varchar("language", { length: 4 }).default("en").notNull(), // 'en' | 'es'
    status: varchar("status", { length: 16 }).default("draft").notNull(), // draft | ready | posted_manually | archived
    bestPhotoId: text("best_photo_id"),
    imageMode: varchar("image_mode", { length: 24 })
      .default("single_after")
      .notNull(), // single_after | before_after_proof
    beforePhotoId: text("before_photo_id"),
    afterPhotoId: text("after_photo_id"),
    proofRecommendationJson: text("proof_recommendation_json"),
    finalImageUrl: text("final_image_url"),
    caption: text("caption"),
    captionPolicyJson: text("caption_policy_json"),
    ctaRecommendation: varchar("cta_recommendation", { length: 32 })
      .default("call_now_button")
      .notNull(),
    postedAt: timestamp("posted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    userIdx: index("google_post_user_idx").on(t.userId),
    createdAtIdx: index("google_post_user_created_idx").on(t.userId, t.createdAt),
  })
);

export const googlePostPhoto = pgTable(
  "google_post_photo",
  {
    id: text("id").primaryKey(),
    googlePostId: text("google_post_id")
      .notNull()
      .references(() => googlePost.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    originalUrl: text("original_url").notNull(),
    processedUrl: text("processed_url"),
    thumbnailUrl: text("thumbnail_url"),
    originalMimeType: varchar("original_mime_type", { length: 32 }),
    detectedRole: varchar("detected_role", { length: 16 }), // before | after | process | detail | team | other
    roleConfidence: integer("role_confidence"), // 0-100
    bestAfterScore: integer("best_after_score"), // 0-100
    cropHintJson: text("crop_hint_json"),
    riskFlagsJson: text("risk_flags_json"),
    whySelected: text("why_selected"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    postIdx: index("google_post_photo_post_idx").on(t.googlePostId),
  })
);

export const brandVoiceProfile = pgTable("brand_voice_profile", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  brandProfileId: text("brand_profile_id").references(() => brandProfile.id, {
    onDelete: "set null",
  }),
  voiceJson: text("voice_json").notNull(),
  customerLanguage: varchar("customer_language", { length: 8 })
    .default("en")
    .notNull(), // en | es | mixed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const captionHistory = pgTable(
  "caption_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    googlePostId: text("google_post_id").references(() => googlePost.id, {
      onDelete: "set null",
    }),
    captionText: text("caption_text").notNull(),
    language: varchar("language", { length: 4 }).default("en").notNull(),
    industry: varchar("industry", { length: 32 }).notNull(),
    serviceType: varchar("service_type", { length: 64 }).notNull(),
    openingPhrase: text("opening_phrase"),
    keyPhrasesJson: text("key_phrases_json"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userServiceIdx: index("caption_history_user_service_idx").on(
      t.userId,
      t.serviceType,
      t.createdAt,
    ),
  })
);

export const reminderSettings = pgTable("reminder_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  timezone: text("timezone").default("America/New_York").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  dayOfWeek: integer("day_of_week").default(1).notNull(), // 0=Sun, 1=Mon
  hour: integer("hour").default(9).notNull(),
  lastSentAt: timestamp("last_sent_at"),
  pausedUntil: timestamp("paused_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const uploadConsent = pgTable(
  "upload_consent",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    googlePostId: text("google_post_id").references(() => googlePost.id, {
      onDelete: "set null",
    }),
    hasMarketingPermission: boolean("has_marketing_permission")
      .default(false)
      .notNull(),
    acceptedTermsVersion: varchar("accepted_terms_version", { length: 16 })
      .default("v1")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("upload_consent_user_idx").on(t.userId),
  })
);
