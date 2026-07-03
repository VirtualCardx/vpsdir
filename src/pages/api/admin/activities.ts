import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';
import {
  activities,
  activitiesContent,
  activityCategories,
} from '../../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { sanitizeRichText } from '../../../lib/rich-text';
import { env } from 'cloudflare:workers';

// GET all activities
export const GET: APIRoute = async ({ url }) => {
  try {
    const db = getDb(env.DB);
    const activityList = await db
      .select({
        id: activities.id,
        slug: activities.slug,
        categoryId: activities.category_id,
        publishedAt: activities.published_at,
        isFeatured: activities.is_featured,
        isActive: activities.is_active,
        viewCount: activities.view_count,
        createdAt: activities.created_at,
        updatedAt: activities.updated_at,
        // Get Chinese content
        titleZh: sql<string>`(SELECT title FROM ${activitiesContent} WHERE ${activitiesContent.activity_id} = ${activities.id} AND ${activitiesContent.lang} = 'zh' LIMIT 1)`.as('title_zh'),
        // Get category info
        categorySlug: activityCategories.slug,
        categoryIcon: activityCategories.icon,
      })
      .from(activities)
      .leftJoin(activityCategories, eq(activities.category_id, activityCategories.id))
      .orderBy(desc(activities.published_at))
      .limit(50);

    return new Response(JSON.stringify(activityList), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch activities' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST create new activity (and handle method override for PUT/DELETE)
export const POST: APIRoute = async ({ request, url }) => {
  try {
    const db = getDb(env.DB);
    const methodFromQuery = url.searchParams.get('_method');
    const id = parseInt(url.searchParams.get('id') || '');

    const handleDelete = async () => {
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing activity ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await db.delete(activities).where(eq(activities.id, id));

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    };

    // Handle DELETE requests that use query-string method override.
    if (methodFromQuery === 'DELETE') {
      return handleDelete();
    }

    const formData = await request.formData();

    // Check for method override from either the query string or form body.
    const method = methodFromQuery || (formData.get('_method') as string | null);
    if (method === 'DELETE') {
      return handleDelete();
    }

    if (method === 'PUT') {
      // Handle PUT request
      const id = parseInt(url.searchParams.get('id') || '');

      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing activity ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Get basic fields
      const slug = formData.get('slug') as string;
      const categoryIdRaw = formData.get('category_id') as string;
      const publishedAt = formData.get('published_at') as string;
      const isFeatured = formData.get('is_featured') === '1';
      const isActive = formData.get('is_active') !== '0';

      // Parse and validate category_id
      const categoryId = categoryIdRaw ? parseInt(categoryIdRaw, 10) : null;

      // Validate category_id exists and is valid
      if (categoryId && (isNaN(categoryId) || categoryId <= 0)) {
        return new Response(JSON.stringify({ error: 'Invalid category_id. Please select a valid category.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const validCategories = await db
        .select({ id: activityCategories.id })
        .from(activityCategories);

      const validCategoryIds = validCategories.map(c => c.id);
      if (categoryId && !validCategoryIds.includes(categoryId)) {
        return new Response(JSON.stringify({ error: `Invalid category_id: ${categoryId}. Valid categories are: ${validCategoryIds.join(', ')}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Chinese content
      const titleZh = formData.get('title_zh') as string;
      const slugZh = formData.get('slug_zh') as string;
      const descriptionZh = formData.get('description_zh') as string;
      const contentZh = sanitizeRichText(formData.get('content_zh') as string);
      const metaTitleZh = formData.get('meta_title_zh') as string;
      const metaDescZh = formData.get('meta_desc_zh') as string;

      // English content
      const titleEn = formData.get('title_en') as string;
      const slugEn = formData.get('slug_en') as string;
      const descriptionEn = formData.get('description_en') as string;
      const contentEn = sanitizeRichText(formData.get('content_en') as string);
      const metaTitleEn = formData.get('meta_title_en') as string;
      const metaDescEn = formData.get('meta_desc_en') as string;

      // Update activity
      await db
        .update(activities)
        .set({
          slug,
          category_id: categoryId,
          published_at: new Date(publishedAt).toISOString(),
          is_featured: isFeatured,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .where(eq(activities.id, id));

      // Update Chinese content
      await db
        .update(activitiesContent)
        .set({
          title: titleZh,
          slug: slugZh,
          description: descriptionZh || null,
          content: contentZh || null,
          meta_title: metaTitleZh || null,
          meta_desc: metaDescZh || null,
          updated_at: new Date().toISOString(),
        })
        .where(and(eq(activitiesContent.activity_id, id), eq(activitiesContent.lang, 'zh')));

      // Update English content
      await db
        .update(activitiesContent)
        .set({
          title: titleEn,
          slug: slugEn,
          description: descriptionEn || null,
          content: contentEn || null,
          meta_title: metaTitleEn || null,
          meta_desc: metaDescEn || null,
          updated_at: new Date().toISOString(),
        })
        .where(and(eq(activitiesContent.activity_id, id), eq(activitiesContent.lang, 'en')));

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Normal POST request for creating new activity
    // Get basic fields
    const slug = formData.get('slug') as string;
    const categoryIdRaw = formData.get('category_id') as string;
    const publishedAt = formData.get('published_at') as string || new Date().toISOString();
    const isFeatured = formData.get('is_featured') === '1';
    const isActive = formData.get('is_active') !== '0';

    // Parse and validate category_id
    const categoryId = categoryIdRaw ? parseInt(categoryIdRaw, 10) : null;

    // Chinese content
    const titleZh = formData.get('title_zh') as string;
    const slugZh = formData.get('slug_zh') as string;
    const descriptionZh = formData.get('description_zh') as string;
    const contentZh = sanitizeRichText(formData.get('content_zh') as string);
    const metaTitleZh = formData.get('meta_title_zh') as string;
    const metaDescZh = formData.get('meta_desc_zh') as string;

    // English content
    const titleEn = formData.get('title_en') as string;
    const slugEn = formData.get('slug_en') as string;
    const descriptionEn = formData.get('description_en') as string;
    const contentEn = sanitizeRichText(formData.get('content_en') as string);
    const metaTitleEn = formData.get('meta_title_en') as string;
    const metaDescEn = formData.get('meta_desc_en') as string;

    // Validate required fields first
    if (!slug || !categoryId || !titleZh || !titleEn) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate category_id exists and is valid
    if (isNaN(categoryId) || categoryId <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid category_id. Please select a valid category.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validCategories = await db
      .select({ id: activityCategories.id })
      .from(activityCategories);

    const validCategoryIds = validCategories.map(c => c.id);
    if (!validCategoryIds.includes(categoryId)) {
      return new Response(JSON.stringify({ error: `Invalid category_id: ${categoryId}. Valid categories are: ${validCategoryIds.join(', ')}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create activity
    const [newActivity] = await db
      .insert(activities)
      .values({
        slug,
        category_id: categoryId,
        published_at: new Date(publishedAt).toISOString(),
        is_featured: isFeatured,
        is_active: isActive,
        view_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning();

    // Create Chinese content
    await db.insert(activitiesContent).values({
      activity_id: newActivity.id,
      lang: 'zh',
      title: titleZh,
      slug: slugZh,
      description: descriptionZh || null,
      content: contentZh || null,
      meta_title: metaTitleZh || null,
      meta_desc: metaDescZh || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Create English content
    await db.insert(activitiesContent).values({
      activity_id: newActivity.id,
      lang: 'en',
      title: titleEn,
      slug: slugEn,
      description: descriptionEn || null,
      content: contentEn || null,
      meta_title: metaTitleEn || null,
      meta_desc: metaDescEn || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, id: newActivity.id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    return new Response(JSON.stringify({ error: 'Failed to create activity' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
