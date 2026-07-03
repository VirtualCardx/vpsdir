import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../../lib/db';
import { activityCategories, activities } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { requireApiAuth, jsonResponse, handleCors } from '../../../../lib/api-auth';

// PUT /api/v1/categories/:id - 更新分类
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

    const existing = await db.select().from(activityCategories).where(eq(activityCategories.id, id)).get();
    if (!existing) return jsonResponse({ error: 'Category not found' }, 404);

    const { slug, icon, sort_order } = body;

    await db
      .update(activityCategories)
      .set({
        ...(slug !== undefined && { slug }),
        ...(icon !== undefined && { icon }),
        ...(sort_order !== undefined && { sort_order }),
        updated_at: new Date().toISOString(),
      })
      .where(eq(activityCategories.id, id));

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('API update category error:', error);
    return jsonResponse({ error: 'Failed to update category' }, 500);
  }
};

// DELETE /api/v1/categories/:id - 删除分类（有关联活动时拒绝）
export const DELETE: APIRoute = async ({ request, params }) => {
  const cors = handleCors(request);
  if (cors) return cors;
  const auth = requireApiAuth(request);
  if (auth) return auth;

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonResponse({ error: 'Invalid id' }, 400);

  const db = getDb(env.DB);

  const linked = await db
    .select({ id: activities.id })
    .from(activities)
    .where(eq(activities.category_id, id))
    .limit(1)
    .get();

  if (linked) {
    return jsonResponse({ error: 'Category has associated activities. Delete or move them first.' }, 409);
  }

  await db.delete(activityCategories).where(eq(activityCategories.id, id));

  return jsonResponse({ success: true });
};
