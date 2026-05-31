import { MetadataRoute } from 'next'

// Brago is English-only as of 2026-05-31 (the /zh routes were removed).
// localePrefix is `as-needed`, so the default English URLs have no prefix.

type RouteConfig = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}

const PUBLIC_ROUTES: RouteConfig[] = [
  // Core
  { path: '',                                           changeFrequency: 'daily',   priority: 1.0 },
  { path: '/free-google-post-generator',                changeFrequency: 'daily',   priority: 0.95 },
  { path: '/pricing',                                   changeFrequency: 'weekly',  priority: 0.9 },
  // Industry pages
  { path: '/industries',                                changeFrequency: 'weekly',  priority: 0.9 },
  { path: '/industries/pressure-washing-marketing',    changeFrequency: 'weekly',  priority: 0.9 },
  { path: '/industries/auto-detailing-marketing',      changeFrequency: 'weekly',  priority: 0.9 },
  { path: '/industries/cleaning-marketing',            changeFrequency: 'weekly',  priority: 0.9 },
  // Template pages
  { path: '/templates',                                 changeFrequency: 'weekly',  priority: 0.8 },
  { path: '/templates/google-business-profile-posts',  changeFrequency: 'weekly',  priority: 0.8 },
  // Resource pages
  { path: '/resources/how-to-get-pressure-washing-customers',    changeFrequency: 'monthly', priority: 0.7 },
  { path: '/resources/how-to-market-a-pressure-washing-business', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/resources/pressure-washing-advertising-ideas',        changeFrequency: 'monthly', priority: 0.7 },
  { path: '/resources/pressure-washing-marketing-ideas',          changeFrequency: 'monthly', priority: 0.7 },
  { path: '/resources/auto-detailing-marketing-posts',            changeFrequency: 'monthly', priority: 0.7 },
  // Marketing / legal
  { path: '/blog',                                      changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/contact',                                   changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy',                                   changeFrequency: 'monthly', priority: 0.3 },
  { path: '/terms',                                     changeFrequency: 'monthly', priority: 0.3 },
  { path: '/cookies',                                   changeFrequency: 'monthly', priority: 0.3 },
  { path: '/refund',                                    changeFrequency: 'monthly', priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }))
}
