import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDb } from '../lib/db';
import { providers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { locales } from '../i18n/config';

export const GET: APIRoute = async ({ url }) => {
  const db = getDb(env.DB);
  const allProviders = await db
    .select({
      slug_zh: providers.slug_zh,
      slug_en: providers.slug_en,
      updated_at: providers.updated_at,
    })
    .from(providers)
    .where(eq(providers.is_active, true));

  const baseUrl = url.origin;
  const urls: string[] = [];

  // Home pages
  for (const locale of locales) {
    const hreflangs = locales
      .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${baseUrl}/${l}/" />`)
      .join('\n');
    urls.push(`  <url>
    <loc>${baseUrl}/${locale}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
${hreflangs}
  </url>`);
  }

  // Provider detail pages
  for (const p of allProviders) {
    for (const locale of locales) {
      const slug = locale === 'zh' ? p.slug_zh : p.slug_en;
      urls.push(`  <url>
    <loc>${baseUrl}/${locale}/provider/${slug}</loc>
    <lastmod>${p.updated_at}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="zh" href="${baseUrl}/zh/provider/${p.slug_zh}" />
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/provider/${p.slug_en}" />
  </url>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
