import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/container";
import { getResourcePageMeta, RESOURCE_PAGES } from "@/lib/seo/resource-pages";
import { HowToGetPressureWashingCustomers } from "./content/how-to-get-pressure-washing-customers";
import { HowToMarketAPressureWashingBusiness } from "./content/how-to-market-a-pressure-washing-business";
import { PressureWashingAdvertisingIdeas } from "./content/pressure-washing-advertising-ideas";
import { PressureWashingMarketingIdeas } from "./content/pressure-washing-marketing-ideas";
import { AutoDetailingMarketingPosts } from "./content/auto-detailing-marketing-posts";

export async function generateStaticParams() {
  return RESOURCE_PAGES.map((p) => ({ resourceSlug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ resourceSlug: string }>;
}): Promise<Metadata> {
  const { resourceSlug } = await params;
  const meta = getResourcePageMeta(resourceSlug);
  if (!meta) return {};
  return {
    title: meta.title,
    description: meta.description,
  };
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ resourceSlug: string }>;
}) {
  const { resourceSlug } = await params;
  const meta = getResourcePageMeta(resourceSlug);
  if (!meta) notFound();

  // Render specific content component based on slug
  if (resourceSlug === "how-to-get-pressure-washing-customers") {
    return <HowToGetPressureWashingCustomers />;
  }

  if (resourceSlug === "how-to-market-a-pressure-washing-business") {
    return <HowToMarketAPressureWashingBusiness />;
  }

  if (resourceSlug === "pressure-washing-advertising-ideas") {
    return <PressureWashingAdvertisingIdeas />;
  }

  if (resourceSlug === "pressure-washing-marketing-ideas") {
    return <PressureWashingMarketingIdeas />;
  }

  if (resourceSlug === "auto-detailing-marketing-posts") {
    return <AutoDetailingMarketingPosts />;
  }

  // Placeholder for other resource pages (not yet written)
  return (
    <div className="bg-background min-h-screen">
      <Container className="py-20">
        <h1 className="text-3xl font-bold">{meta.title.split(" | ")[0]}</h1>
        <p className="mt-4 text-muted-foreground">{meta.description}</p>
        <div className="mt-8">
          <Link
            href="/industries/pressure-washing-marketing"
            className="text-sm underline text-muted-foreground hover:text-foreground"
          >
            &larr; Back to Pressure Washing Marketing
          </Link>
        </div>
      </Container>
    </div>
  );
}
