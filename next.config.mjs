import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n.ts');
const withMDX = createMDX();
const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  pageExtensions: ["ts", "tsx", "mdx"],
  turbopack: {
    root: rootDir,
  },
  async redirects() {
    return [
      {
        source: "/industries/pressure-washing-before-after-posts",
        destination: "/industries/pressure-washing-marketing",
        permanent: true,
      },
      {
        source: "/industries/auto-detailing-before-after-posts",
        destination: "/industries/auto-detailing-marketing",
        permanent: true,
      },
      // `/create` retired — unified funnel lives at /free-google-post-generator.
      // (Old bookmarks + external links land on the new page without going
      //  through the login wall first.)
      {
        source: "/create",
        destination: "/free-google-post-generator",
        permanent: true,
      },
      {
        source: "/:locale(en)/create",
        destination: "/:locale/free-google-post-generator",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(withMDX(nextConfig));
