import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireApiAuth, jsonResponse, handleCors } from '../../../lib/api-auth';

// POST /api/v1/upload - 上传图片到 R2
// 表单字段:
//   image:  图片文件（必填，jpg/png/gif/webp/svg，最大 5MB）
//   type:   图片类型（可选，"logo" 或 "editor"，默认 "editor"）
//           - "logo":   存储到 logos/ 目录，返回 logo_key（用于服务商 Logo）
//           - "editor": 存储到 editor-images/ 目录，返回 url（用于富文本内容插图）
export const POST: APIRoute = async ({ request }) => {
  const cors = handleCors(request);
  if (cors) return cors;
  const auth = requireApiAuth(request);
  if (auth) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const type = (formData.get('type') as string) || 'editor';

    if (!file) {
      return jsonResponse({ error: 'No file uploaded. Provide an "image" field.' }, 400);
    }

    if (!file.type.startsWith('image/')) {
      return jsonResponse({ error: 'Invalid file type. Only images are allowed.' }, 400);
    }

    // 最大 5MB
    if (file.size > 5 * 1024 * 1024) {
      return jsonResponse({ error: 'File too large. Maximum size is 5MB.' }, 400);
    }

    const allowedTypes = ['logo', 'editor'];
    if (!allowedTypes.includes(type)) {
      return jsonResponse({ error: `Invalid type "${type}". Must be "logo" or "editor".` }, 400);
    }

    const timestamp = Date.now();
    const random = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    const extension = file.name.split('.').pop() || 'jpg';

    // Logo 存到 logos/ 前缀（由 /api/logo/ 端点服务），编辑器图片存到 editor-images/（由 /api/image/ 端点服务）
    const prefix = type === 'logo' ? 'logos' : 'editor-images';
    const filename = `${prefix}/${timestamp}-${random}.${extension}`;

    await env.R2.put(filename, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    // 根据类型返回不同的访问路径
    if (type === 'logo') {
      return jsonResponse({
        logo_key: filename,
        logo_url: `/api/logo/${filename}`,
        filename,
      }, 201);
    }

    return jsonResponse({
      url: `/api/image/${filename}`,
      filename,
    }, 201);
  } catch (error) {
    console.error('API upload error:', error);
    return jsonResponse({ error: 'Failed to upload image' }, 500);
  }
};
