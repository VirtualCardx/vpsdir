import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../../lib/db';
import { providers, providersContent } from '../../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { invalidateCache } from '../../../../lib/cache';
import { sanitizeRichText } from '../../../../lib/rich-text';
import { requireApiAuth, jsonResponse, handleCors } from '../../../../lib/api-auth';

// GET /api/v1/providers - 列出所有服务商
export const GET: APIRoute = async ({ request }) => {
  const cors = handleCors(request);
  if (cors) return cors;
  const auth = requireApiAuth(request);
  if (auth) return auth;

  const db = getDb(env.DB);
  const rows = await db
    .select()
    .from(providers)
    .leftJoin(
      providersContent,
      and(eq(providers.id, providersContent.provider_id), eq(providersContent.lang, 'zh')),
    )
    .orderBy(providers.id);

  return jsonResponse({
    count: rows.length,
    data: rows.map((row) => ({
      id: row.providers.id,
      slug_zh: row.providers.slug_zh,
      slug_en: row.providers.slug_en,
      url: row.providers.url,
      category: row.providers.category,
      rating: row.providers.rating,
      logo_key: row.providers.logo_key,
      tags: row.providers.tags ? JSON.parse(row.providers.tags) : [],
      is_active: row.providers.is_active,
      name_zh: row.providers_content?.name || '',
      created_at: row.providers.created_at,
      updated_at: row.providers.updated_at,
    })),
  });
};

// POST /api/v1/providers - 创建服务商
export const POST: APIRoute = async ({ request }) => {
  const cors = handleCors(request);
  if (cors) return cors;
  const auth = requireApiAuth(request);
  if (auth) return auth;

  try {
    const body = await request.json();
    const { slug_zh, slug_en, url, category, rating, tags, is_active, contents } = body;

    if (!slug_zh || !slug_en || !url || !category) {
      return jsonResponse({ error: 'Missing required fields: slug_zh, slug_en, url, category' }, 400);
    }
    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      return jsonResponse({ error: 'contents array is required (at least one language)' }, 400);
    }

    const db = getDb(env.DB);

    const inserted = await db
      .insert(providers)
      .values({
        slug_zh,
        slug_en,
        url,
        category,
        rating: rating ?? 0,
        tags: tags ? JSON.stringify(tags) : null,
        is_active: is_active ?? true,
      })
      .returning({ id: providers.id })
      .get();

    for (const c of contents) {
      await db.insert(providersContent).values({
        provider_id: inserted.id,
        lang: c.lang,
        name: c.name,
        desc: sanitizeRichText(c.desc),
        meta_title: c.meta_title || null,
        meta_desc: c.meta_desc || null,
      });
    }

    await invalidateCache(env.VPSDIR_KV, 'home:zh');
    await invalidateCache(env.VPSDIR_KV, 'home:en');

    return jsonResponse({ success: true, id: inserted.id }, 201);
  } catch (error) {
    console.error('API create provider error:', error);
    return jsonResponse({ error: 'Failed to create provider' }, 500);
  }
};
