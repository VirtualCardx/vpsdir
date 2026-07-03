import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../../lib/db';
import { activities, activitiesContent, activityCategories } from '../../../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { sanitizeRichText } from '../../../../lib/rich-text';
import { requireApiAuth, jsonResponse, handleCors } from '../../../../lib/api-auth';

// GET /api/v1/activities - 列出所有活动
export const GET: APIRoute = async ({ request }) => {
  const cors = handleCors(request);
  if (cors) return cors;
  const auth = requireApiAuth(request);
  if (auth) return auth;

  const db = getDb(env.DB);
  const rows = await db
    .select({
      id: activities.id,
      slug: activities.slug,
      category_id: activities.category_id,
      published_at: activities.published_at,
      is_featured: activities.is_featured,
      is_active: activities.is_active,
      view_count: activities.view_count,
      created_at: activities.created_at,
      updated_at: activities.updated_at,
      title_zh: activitiesContent.title,
      category_slug: activityCategories.slug,
    })
    .from(activities)
    .leftJoin(
      activitiesContent,
      and(eq(activitiesContent.activity_id, activities.id), eq(activitiesContent.lang, 'zh')),
    )
    .leftJoin(activityCategories, eq(activities.category_id, activityCategories.id))
    .orderBy(desc(activities.published_at))
    .limit(100);

  return jsonResponse({
    count: rows.length,
    data: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      category_id: row.category_id,
      category_slug: row.category_slug || '',
      published_at: row.published_at,
      is_featured: row.is_featured,
      is_active: row.is_active,
      view_count: row.view_count,
      title_zh: row.title_zh || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
  });
};

// POST /api/v1/activities - 创建活动
export const POST: APIRoute = async ({ request }) => {
  const cors = handleCors(request);
  if (cors) return cors;
  const auth = requireApiAuth(request);
  if (auth) return auth;

  try {
    const body = await request.json();
    const { slug, category_id, published_at, is_featured, is_active, contents } = body;

    if (!slug || !category_id || !contents || !Array.isArray(contents)) {
      return jsonResponse({ error: 'Missing required fields: slug, category_id, contents' }, 400);
    }

    const db = getDb(env.DB);

    // 验证分类是否存在
    const category = await db
      .select()
      .from(activityCategories)
      .where(eq(activityCategories.id, category_id))
      .get();
    if (!category) {
      return jsonResponse({ error: `Category id ${category_id} not found` }, 400);
    }

    const [newActivity] = await db
      .insert(activities)
      .values({
        slug,
        category_id,
        published_at: published_at || new Date().toISOString(),
        is_featured: is_featured ?? false,
        is_active: is_active ?? true,
      })
      .returning();

    for (const c of contents) {
      await db.insert(activitiesContent).values({
        activity_id: newActivity.id,
        lang: c.lang,
        title: c.title,
        slug: c.slug || slug,
        description: c.description || null,
        content: sanitizeRichText(c.content),
        meta_title: c.meta_title || null,
        meta_desc: c.meta_desc || null,
      });
    }

    return jsonResponse({ success: true, id: newActivity.id }, 201);
  } catch (error) {
    console.error('API create activity error:', error);
    return jsonResponse({ error: 'Failed to create activity' }, 500);
  }
};
