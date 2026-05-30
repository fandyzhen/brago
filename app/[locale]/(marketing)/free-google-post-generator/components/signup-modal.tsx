"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/button";

export function SignupModal(props: {
  open: boolean;
  onClose: () => void;
  postId: string | null;
  anonId: string | null;
  locale: string;
}) {
  const t = useTranslations("freeTrial.signupModal");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open) {
      setError(null);
      setLoading(false);
    }
  }, [props.open]);

  if (!props.open) return null;

  const localePrefix = props.locale === "en" ? "" : `/${props.locale}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await authClient.signUp.email({
        email,
        password,
        name: email.split("@")[0] ?? "Brago user",
      });
      if (res.error) throw new Error(res.error.message ?? "Sign-up failed");
      if (props.postId) {
        router.push(`${localePrefix}/google-posts/${props.postId}`);
      } else {
        router.push(`${localePrefix}/dashboard`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
      setLoading(false);
    }
  };

  const googleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: props.postId ? `${localePrefix}/google-posts/${props.postId}` : `${localePrefix}/dashboard`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl">
        <button onClick={props.onClose} className="absolute right-4 top-4 text-muted-foreground">✕</button>
        <h2 className="font-display text-xl font-bold text-foreground">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

        <form onSubmit={submit} className="mt-5 grid gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailLabel")}
            className="rounded-xl border border-border bg-background px-4 py-3"
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordLabel")}
            className="rounded-xl border border-border bg-background px-4 py-3"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button variant="accent" type="submit" disabled={loading}>
            {loading ? "…" : t("submit")}
          </Button>
        </form>

        <div className="relative my-4 text-center text-xs text-muted-foreground">
          <span className="bg-background px-2 relative z-10">or</span>
          <span className="absolute left-0 right-0 top-1/2 h-px bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={googleSignIn}>
          {t("googleCta")}
        </Button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("loginHint")}{" "}
          <a href={`${localePrefix}/login`} className="underline">{t("loginLink")}</a>
        </p>
      </div>
    </div>
  );
}
