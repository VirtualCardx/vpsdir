import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../lib/db';
import { providers, providersContent } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { uploadLogo, deleteLogo } from '../../../lib/r2';
import { invalidateCache } from '../../../lib/cache';

// Unified handler for all provider operations
export const POST: APIRoute = async ({ request, redirect, url }) => {
  const db = getDb(env.DB);
  const method = url.searchParams.get('_method');
  const id = Number(url.searchParams.get('id'));

  // Handle UPDATE operation
  if (method === 'PUT' && id && !isNaN(id)) {
    const formData = await request.formData();
    const slug_zh = (formData.get('slug_zh') as string).trim();
    const slug_en = (formData.get('slug_en') as string).trim();
    const url_value = (formData.get('url') as string).trim();
    const category = formData.get('category') as string;
    const rating = formData.get('rating') ? parseFloat(formData.get('rating') as string) : 0;
    const is_active = formData.has('is_active');
    const tags = formData.get('tags') as string || null;
    const name_zh = (formData.get('name_zh') as string).trim();
    const name_en = (formData.get('name_en') as string).trim();
    const desc_zh = (formData.get('desc_zh') as string)?.trim() || null;
    const desc_en = (formData.get('desc_en') as string)?.trim() || null;
    const meta_title_zh = (formData.get('meta_title_zh') as string)?.trim() || null;
    const meta_title_en = (formData.get('meta_title_en') as string)?.trim() || null;
    const meta_desc_zh = (formData.get('meta_desc_zh') as string)?.trim() || null;
    const meta_desc_en = (formData.get('meta_desc_en') as string)?.trim() || null;
    const logoFile = formData.get('logo') as File | null;

    let logo_key: string | undefined;
    if (logoFile && logoFile.size > 0) {
      // Delete old logo
      const existing = await db.select({ logo_key: providers.logo_key }).from(providers).where(eq(providers.id, id)).get();
      if (existing?.logo_key) {
        await deleteLogo(env.R2, existing.logo_key);
      }
      logo_key = `logos/${slug_en}-${Date.now()}.${logoFile.name.split('.').pop()}`;
      await uploadLogo(env.R2, logo_key, await logoFile.arrayBuffer(), logoFile.type);
    }

    await db
      .update(providers)
      .set({
        slug_zh,
        slug_en,
        url: url_value,
        category,
        rating,
        is_active,
        tags,
        ...(logo_key ? { logo_key } : {}),
        updated_at: new Date().toISOString(),
      })
      .where(eq(providers.id, id));

    // Upsert bilingual content
    for (const lang of ['zh', 'en'] as const) {
      const name = lang === 'zh' ? name_zh : name_en;
      const desc = lang === 'zh' ? desc_zh : desc_en;
      const meta_title = lang === 'zh' ? meta_title_zh : meta_title_en;
      const meta_desc = lang === 'zh' ? meta_desc_zh : meta_desc_en;

      const existing = await db
        .select()
        .from(providersContent)
        .where(and(eq(providersContent.provider_id, id), eq(providersContent.lang, lang)))
        .get();

      if (existing) {
        await db
          .update(providersContent)
          .set({ name, desc, meta_title, meta_desc })
          .where(eq(providersContent.id, existing.id));
      } else {
        await db.insert(providersContent).values({ provider_id: id, lang, name, desc, meta_title, meta_desc });
      }
    }

    await invalidateCache(env.VPSDIR_KV, 'home:zh');
    await invalidateCache(env.VPSDIR_KV, 'home:en');
    return redirect('/admin/?msg=saved');
  }

  // Handle DELETE operation
  if (method === 'DELETE' && id && !isNaN(id)) {
    // Get logo key before deleting
    const existing = await db.select({ logo_key: providers.logo_key }).from(providers).where(eq(providers.id, id)).get();
    if (existing?.logo_key) {
      await deleteLogo(env.R2, existing.logo_key);
    }
    await db.delete(providers).where(eq(providers.id, id));
    await invalidateCache(env.VPSDIR_KV, 'home:zh');
    await invalidateCache(env.VPSDIR_KV, 'home:en');
    return redirect('/admin/?msg=deleted');
  }

  // Handle CREATE operation (default)
  const formData = await request.formData();

  const slug_zh = (formData.get('slug_zh') as string).trim();
  const slug_en = (formData.get('slug_en') as string).trim();
  const url_value = (formData.get('url') as string).trim();
  const category = formData.get('category') as string;
  const rating = formData.get('rating') ? parseFloat(formData.get('rating') as string) : 0;
  const tags = formData.get('tags') as string || null;
  const name_zh = (formData.get('name_zh') as string).trim();
  const name_en = (formData.get('name_en') as string).trim();
  const desc_zh = (formData.get('desc_zh') as string)?.trim() || null;
  const desc_en = (formData.get('desc_en') as string)?.trim() || null;
  const meta_title_zh = (formData.get('meta_title_zh') as string)?.trim() || null;
  const meta_title_en = (formData.get('meta_title_en') as string)?.trim() || null;
  const meta_desc_zh = (formData.get('meta_desc_zh') as string)?.trim() || null;
  const meta_desc_en = (formData.get('meta_desc_en') as string)?.trim() || null;
  const logoFile = formData.get('logo') as File | null;

  let logo_key: string | null = null;
  if (logoFile && logoFile.size > 0) {
    logo_key = `logos/${slug_en}-${Date.now()}.${logoFile.name.split('.').pop()}`;
    await uploadLogo(env.R2, logo_key, await logoFile.arrayBuffer(), logoFile.type);
  }

  const inserted = await db
    .insert(providers)
    .values({ slug_zh, slug_en, url: url_value, category, rating, logo_key, tags })
    .returning({ id: providers.id })
    .get();

  // Insert bilingual content
  await db.insert(providersContent).values([
    { provider_id: inserted.id, lang: 'zh', name: name_zh, desc: desc_zh, meta_title: meta_title_zh, meta_desc: meta_desc_zh },
    { provider_id: inserted.id, lang: 'en', name: name_en, desc: desc_en, meta_title: meta_title_en, meta_desc: meta_desc_en },
  ]);

  // Invalidate home cache
  await invalidateCache(env.VPSDIR_KV, 'home:zh');
  await invalidateCache(env.VPSDIR_KV, 'home:en');

  return redirect('/admin/?msg=saved');
};

