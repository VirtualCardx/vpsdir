import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { setLastUpdated, invalidateCache } from '../../../lib/cache';

export const POST: APIRoute = async ({ redirect }) => {
  // Invalidate all cached data
  await invalidateCache(env.VPSDIR_KV, 'home:zh');
  await invalidateCache(env.VPSDIR_KV, 'home:en');
  await setLastUpdated(env.VPSDIR_KV);

  return redirect('/admin/?msg=cache_refreshed');
};
