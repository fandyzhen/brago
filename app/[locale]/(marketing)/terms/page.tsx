/* eslint-disable react/no-unescaped-entities */
import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import type { Locale } from "@/i18n.config";

export async function generateMetadata(
  props: {
    params: Promise<{ locale: Locale }>
  }
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'seo' });

  return {
    title: t('terms.title'),
    description: t('terms.description'),
    openGraph: {
      images: [t('terms.ogImage')],
    },
  };
}

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <p className="text-muted-foreground mb-8">
          Effective Date: May 25, 2026
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p>
            Welcome to Brago ("Brago", "we", "our", or "us"). These Terms of Service ("Terms") govern your use of our website and services (collectively, the "Service") located at brago.ai.
          </p>
          <p>
            By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these terms, then you may not access the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
          <p>
            Brago provides an AI-assisted Google Business Profile post generator for local home-services businesses (pressure washing, auto detailing, cleaning, etc.). The Service helps you turn finished job photos into a Google-ready post you can copy and paste. Brago does not post on your behalf. Specifically the Service lets you:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Upload finished job photos and have Brago pick the strongest after shot</li>
            <li>Generate Google-safe captions in English or Spanish</li>
            <li>Save business details (name, service area, posting style) for reuse</li>
            <li>Revisit your past Google posts and weekly posting freshness</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            By uploading photos, you confirm that (a) you have permission from the customer (where applicable) to use the images in marketing materials and (b) Brago provides AI-assisted drafts only — you remain responsible for the final review and for posting to Google Business Profile yourself.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
          <p>
            To access certain features of our Service, you may be required to create an account. When creating an account, you must:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain the security of your password and account</li>
            <li>Promptly update your account information to keep it accurate</li>
            <li>Accept all risks of unauthorized access to your account</li>
            <li>Be at least 18 years old or the age of legal consent in your jurisdiction</li>
          </ul>
          <p className="mt-4">
            You are responsible for all activities that occur under your account. We reserve the right to refuse service, terminate accounts, or remove content at our sole discretion.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
          <p>
            You agree not to use the Service to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Violate any laws or regulations</li>
            <li>Infringe upon the rights of others</li>
            <li>Upload or transmit viruses or malicious code</li>
            <li>Engage in any activity that disrupts or interferes with the Service</li>
            <li>Attempt to gain unauthorized access to any portion of the Service</li>
            <li>Harass, abuse, or harm another person</li>
            <li>Use the Service for any illegal or unauthorized purpose</li>
            <li>Violate any applicable laws in your jurisdiction</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property Rights</h2>
          <p>
            The Service and its original content, features, and functionality are and will remain the exclusive property of Brago and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.
          </p>
          <p className="mt-4">
            You retain ownership of any content you submit to the Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content in connection with operating and providing the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Payment Terms</h2>
          <p>
            If you purchase any services from us, you agree to pay all applicable fees as described at the time of purchase. All payments are:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Processed through secure third-party payment providers</li>
            <li>Subject to the payment provider's terms and conditions</li>
            <li>Non-refundable except as required by law or as explicitly stated in our Refund Policy</li>
            <li>Subject to applicable taxes which you are responsible for</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Disclaimers and Limitations of Liability</h2>
          <p>
            THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. WE DISCLAIM ALL WARRANTIES, WHETHER EXPRESS OR IMPLIED, INCLUDING THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p className="mt-4">
            IN NO EVENT SHALL BRAGO, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless Brago and its affiliates from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees arising out of or relating to your violation of these Terms or your use of the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
          <p>
            We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>
          <p className="mt-4">
            Upon termination, your right to use the Service will immediately cease. All provisions of the Terms which by their nature should survive termination shall survive termination.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Privacy Policy</h2>
          <p>
            Your use of the Service is also governed by our Privacy Policy. Please review our Privacy Policy, which also governs the Site and informs users of our data collection practices.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Changes to Terms</h2>
          <p>
            We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any legal action or proceeding arising under these Terms will be brought exclusively in courts located in the State of Delaware, United States.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">13. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          <ul className="list-none space-y-2 mt-4">
            <li>Email: contact@brago.ai</li>
            <li>Website: https://brago.ai</li>
            <li>Address: Available on request via support@brago.ai</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
