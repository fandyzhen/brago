import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { db } from "./db";
import { refundCredits } from "./credits";
import { getGoogleAuthProvider } from "./auth/google-auth";
import { upsertReminderSettings } from "./brago/reminder-settings";

const defaultTrustedOrigins = ["http://localhost:3000"];

const trustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
  ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : defaultTrustedOrigins;

const googleAuthProvider = getGoogleAuthProvider();

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,

  emailAndPassword: {
    enabled: true,
  },
  ...(googleAuthProvider
    ? {
        socialProviders: {
          google: googleAuthProvider,
        },
      }
    : {}),

  trustedOrigins,

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Listen for user registration events (email and OAuth)
      if (ctx.path.startsWith("/sign-up")) {
        const newSession = ctx.context.newSession;
        if (newSession) {
          try {
            // Grant 300 credits as registration bonus
            await refundCredits(
              newSession.user.id,
              300,
              "registration_bonus"
            );
            console.log(`[Auth] New user registered, granted 300 credits: ${newSession.user.email}`);
          } catch (error) {
            console.error("[Auth] Failed to grant registration bonus:", error);
          }
          try {
            await upsertReminderSettings(newSession.user.id, {});
          } catch (error) {
            console.error("[Auth] Failed to seed reminder_settings:", error);
          }
          try {
            const cookieHeader = ctx.request?.headers.get("cookie") ?? null;
            const { readAnonIdFromRequestCookies } = await import("@/lib/brago/anonymous/cookies");
            const { claimAnonymousPost } = await import("@/lib/brago/anonymous/claim");
            const anonId = await readAnonIdFromRequestCookies(cookieHeader);
            if (anonId) {
              const claimed = await claimAnonymousPost(newSession.user.id, anonId);
              if (claimed) {
                console.log(`[Auth] Claimed anonymous post ${claimed} for ${newSession.user.email}`);
              }
            }
          } catch (error) {
            console.error("[Auth] Failed to claim anonymous post:", error);
          }
        }
      }
    }),
  },
});

export { hashPassword } from "better-auth/crypto";
