import { env } from 'cloudflare:workers';

/**
 * 使用固定时间比较验证 Bearer Token，防止时序攻击。
 */
export function verifyBearerToken(authHeader: string | null | undefined): boolean {
  if (!authHeader) return false;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const token = match[1];
  const expected = env.API_BEARER_TOKEN;
  if (!expected || token.length !== expected.length) return false;
  // 固定时间比较
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * 在 API handler 开头调用，返回 401 响应或 null 表示通过。
 */
export function requireApiAuth(request: Request): Response | null {
  if (!verifyBearerToken(request.headers.get('Authorization'))) {
    return jsonResponse({ error: 'Unauthorized: invalid or missing Bearer token' }, 401);
  }
  return null;
}

/**
 * 统一 JSON 响应工具。
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * 处理 CORS 预检请求。
 */
export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  return null;
}
