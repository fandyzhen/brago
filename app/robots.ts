import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Protected user pages
          '/dashboard',
          '/create',
          '/history',
          '/credits',
          '/profile',
          '/settings',
          '/posts',
          '/google-posts',
          '/reminders',
          // Admin
          '/admin',
          // Auth flows (not useful to index)
          '/check-email',
          '/verify-email',
          '/reset-password',
          '/forgot-password',
          // Demo / starter routes (not part of product surface)
          '/demo',
          // API routes
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
