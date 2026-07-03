import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ params }) => {
  try {
    const filename = params.path;
    if (!filename) {
      return new Response('Not found', { status: 404 });
    }

    // Only allow access to editor-images prefix
    if (!filename.startsWith('editor-images/')) {
      return new Response('Forbidden', { status: 403 });
    }

    // Get object from R2 using native Cloudflare API
    const object = await env.R2.get(filename);

    if (!object) {
      return new Response('Image not found', { status: 404 });
    }

    // Get the image data
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Handle range requests for large images
    if (object.size) {
      headers.set('Content-Length', object.size.toString());
    }

    // Return the image with proper headers
    return new Response(object.body, {
      headers,
    });
  } catch (error) {
    console.error('Image serve error:', error);
    return new Response('Failed to load image', { status: 500 });
  }
};