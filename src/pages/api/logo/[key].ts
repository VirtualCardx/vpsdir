import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ params }) => {
  const { key } = params;

  if (!env.R2) {
    return new Response('R2 not configured', { status: 500 });
  }

  // Only allow access to logos prefix
  if (!key || !(key.startsWith('logos/') || key.startsWith('logos%2F'))) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const object = await env.R2.get(key);

    if (!object) {
      return new Response('Logo not found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Error serving logo:', error);
    return new Response('Error serving logo', { status: 500 });
  }
};
