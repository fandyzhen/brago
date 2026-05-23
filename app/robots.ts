import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Protected user pages (both default-locale and /zh/ locale)
          '/dashboard',
          '/zh/dashboard',
          '/create',
          '/zh/create',
          '/history',
          '/zh/history',
          '/credits',
          '/zh/credits',
          '/profile',
          '/zh/profile',
          '/settings',
          '/zh/settings',
          // Admin
          '/admin',
          '/zh/admin',
          // Auth flows (not useful to index)
          '/check-email',
          '/zh/check-email',
          '/verify-email',
          '/zh/verify-email',
          '/reset-password',
          '/zh/reset-password',
          // API routes
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
