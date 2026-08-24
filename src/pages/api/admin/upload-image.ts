import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { resolveImageType } from '../../../lib/image-upload';

// Upload image to R2 and return the URL
export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file type (server-side authoritative check)
    const resolvedType = resolveImageType(file.name, file.type);
    if (!resolvedType) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Allowed extensions: jpg, jpeg, png, gif, webp, svg' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: 'File too large. Maximum size is 5MB.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const random = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
    const filename = `editor-images/${timestamp}-${random}.${resolvedType.extension}`;

    // Upload to R2 using native Cloudflare API
    const arrayBuffer = await file.arrayBuffer();
    await env.R2.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: resolvedType.contentType,
      },
    });

    // Return the URL
    const imageUrl = `/api/image/${filename}`;

    return new Response(JSON.stringify({ url: imageUrl, filename }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return new Response(JSON.stringify({ error: 'Failed to upload image' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};