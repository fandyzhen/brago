import { type Metadata } from "next";
import { getAllBlogs } from "@/lib/blog";
import { Background } from "@/components/background";
import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { Subheading } from "@/components/subheading";
import { BlogCard } from "@/components/blog-card";
import { getTranslations } from 'next-intl/server';
import { type Locale } from '@/i18n.config';
import { generatePageMetadata } from "@/lib/metadata";

export async function generateMetadata(
  props: {
    params: Promise<{ locale: Locale }>
  }
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'blog' });

  return generatePageMetadata({
    locale: params.locale,
    path: '/blog',
    title: t('title'),
    description: t('subtitle'),
  });
}

interface PageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export default async function ArticlesIndex(props: PageProps) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'blog' });
  const blogs = await getAllBlogs(params.locale);

  return (
    <div className="relative overflow-hidden py-20 md:py-0">
      <Background />
      <Container className="flex flex-col items-center justify-between pb-20">
        <div className="relative z-20 py-10 md:pt-40">
          <Heading as="h1">{t('title')}</Heading>
          <Subheading className="text-center">
            {t('subtitle')}
          </Subheading>
        </div>

        {blogs.length === 0 ? (
          <div className="relative z-20 w-full max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-tactile">
            <p className="font-display text-lg font-bold text-foreground">
              First posts are landing soon
            </p>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              We&apos;re drafting the first round — what makes a great Google
              Business Profile before/after, how to photograph a job in 30
              seconds, what works for pressure washing vs. auto detailing.
              Want one of these in your inbox first?
            </p>
            <a
              href="/contact"
              className="mt-5 inline-flex items-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
            >
              Tell us what to write
            </a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-20 w-full mb-10">
              {blogs.slice(0, 2).map((blog, index) => (
                <BlogCard blog={blog} key={blog.title + index} />
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full relative z-20">
              {blogs.slice(2).map((blog, index) => (
                <BlogCard blog={blog} key={blog.title + index} />
              ))}
            </div>
          </>
        )}
      </Container>
    </div>
  );
}
