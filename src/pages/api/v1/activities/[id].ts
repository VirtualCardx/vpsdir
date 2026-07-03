import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../../lib/db';
import { activities, activitiesContent, activityCategories } from '../../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { sanitizeRichText } from '../../../../lib/rich-text';
import { requireApiAuth, jsonResponse, handleCors } from '../../../../lib/api-auth';

// GET /api/v1/activities/:id - 获取单个活动详情
export const GET: APIRoute = async ({ request, params }) => {
  const cors = handleCors(request);
  if (cors) return cors;
  const auth = requireApiAuth(request);
  if (auth) return auth;

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonResponse({ error: 'Invalid id' }, 400);

  const db = getDb(env.DB);
  const activity = await db.select().from(activities).where(eq(activities.id, id)).get();
  if (!activity) return jsonResponse({ error: 'Activity not found' }, 404);

  const contentRows = await db
    .select()
    .from(activitiesContent)
    .where(eq(activitiesContent.activity_id, id));

  const category = await db
    .select()
    .from(activityCategories)
    .where(eq(activityCategories.id, activity.category_id))
    .get();

  return jsonResponse({
    data: {
      id: activity.id,
      slug: activity.slug,
      category_id: activity.category_id,
      category_slug: category?.slug || '',
      published_at: activity.published_at,
      is_featured: activity.is_featured,
      is_active: activity.is_active,
      view_count: activity.view_count,
      created_at: activity.created_at,
      updated_at: activity.updated_at,
      contents: contentRows.map((c) => ({
        lang: c.lang,
        title: c.title,
        slug: c.slug,
        description: c.description,
        content: c.content,
        meta_title: c.meta_title,
        meta_desc: c.meta_desc,
      })),
    },
  });
};

// PUT /api/v1/activities/:id - 更新活动
export const PUT: APIRoute = async ({ request, params }) => {
  const cors = handleCors(request);
  if (cors) return cors;
  const auth = requireApiAuth(request);
  if (auth) return auth;

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonResponse({ error: 'Invalid id' }, 400);

  try {
    const body = await request.json();
    const db = getDb(env.DB);

    const existing = await db.select().from(activities).where(eq(activities.id, id)).get();
    if (!existing) return jsonResponse({ error: 'Activity not found' }, 404);

    const { slug, category_id, published_at, is_featured, is_active, contents } = body;

    if (category_id !== undefined) {
      const cat = await db.select().from(activityCategories).where(eq(activityCategories.id, category_id)).get();
      if (!cat) return jsonResponse({ error: `Category id ${category_id} not found` }, 400);
    }

    await db
      .update(activities)
      .set({
        ...(slug !== undefined && { slug }),
        ...(category_id !== undefined && { category_id }),
        ...(published_at !== undefined && { published_at: new Date(published_at).toISOString() }),
        ...(is_featured !== undefined && { is_featured }),
        ...(is_active !== undefined && { is_active }),
        updated_at: new Date().toISOString(),
      })
      .where(eq(activities.id, id));

    if (contents && Array.isArray(contents)) {
      for (const c of contents) {
        const existingContent = await db
          .select()
          .from(activitiesContent)
          .where(and(eq(activitiesContent.activity_id, id), eq(activitiesContent.lang, c.lang)))
          .get();

        if (existingContent) {
          await db
            .update(activitiesContent)
            .set({
              title: c.title,
              slug: c.slug || slug,
              description: c.description || null,
              content: sanitizeRichText(c.content),
              meta_title: c.meta_title || null,
              meta_desc: c.meta_desc || null,
              updated_at: new Date().toISOString(),
            })
            .where(eq(activitiesContent.id, existingContent.id));
        } else {
          await db.insert(activitiesContent).values({
            activity_id: id,
            lang: c.lang,
            title: c.title,
            slug: c.slug || slug,
            description: c.description || null,
            content: sanitizeRichText(c.content),
            meta_title: c.meta_title || null,
            meta_desc: c.meta_desc || null,
          });
        }
      }
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('API update activity error:', error);
    return jsonResponse({ error: 'Failed to update activity' }, 500);
  }
};

// DELETE /api/v1/activities/:id - 删除活动
export const DELETE: APIRoute = async ({ request, params }) => {
  const cors = handleCors(request);
  if (cors) return cors;
  const auth = requireApiAuth(request);
  if (auth) return auth;

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonResponse({ error: 'Invalid id' }, 400);

  const db = getDb(env.DB);
  const existing = await db.select().from(activities).where(eq(activities.id, id)).get();
  if (!existing) return jsonResponse({ error: 'Activity not found' }, 404);

  await db.delete(activities).where(eq(activities.id, id));

  return jsonResponse({ success: true });
};
