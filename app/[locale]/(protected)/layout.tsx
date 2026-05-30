import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EmailVerifiedGuard } from "@/features/auth/components/email-verified-guard";
import { NavBar } from "@/features/navigation/components/navbar";
import { getActiveSessionUser } from "@/lib/auth/session";

export default async function ProtectedLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  const {
    children
  } = props;

  const access = await getActiveSessionUser(await headers());
  if (!access.ok) {
    redirect(`/${locale}/login`);
  }

  return (
    <EmailVerifiedGuard requireEmailVerification={true}>
      <main className="min-h-screen">
        <NavBar />
        {/* Reserve space for the fixed top-4 nav (mobile ~56px, desktop ~66px) */}
        <div className="pt-16 md:pt-20">{children}</div>
      </main>
    </EmailVerifiedGuard>
  );
}
