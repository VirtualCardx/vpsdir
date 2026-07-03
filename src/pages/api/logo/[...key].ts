import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ params }) => {
  const key = params.key;

  if (!key) {
    return new Response('Not found', { status: 404 });
  }

  // Only allow access to logos prefix
  if (!key.startsWith('logos/')) {
    return new Response('Forbidden', { status: 403 });
  }

  const object = await env.R2.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/png',
      'Cache-Control': 'public, max-age=604800',
    },
  });
};
