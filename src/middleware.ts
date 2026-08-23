import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { verifySession } from './lib/auth';
import { defaultLocale } from './i18n/config';

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://cloudflareinsights.com; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Skip static assets
  if (pathname.startsWith('/_') || pathname.startsWith('/favicon')) {
    return withSecurityHeaders(await next());
  }

  // Root redirect to default locale
  if (pathname === '/') {
    return withSecurityHeaders(context.redirect(`/${defaultLocale}/`));
  }

  // Admin route protection (except login page)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const sessionCookie = context.cookies.get('session')?.value;
    if (!sessionCookie) {
      return context.redirect('/admin/login');
    }
    const session = await verifySession(sessionCookie, env.ADMIN_SESSION_SECRET);
    if (!session) {
      context.cookies.delete('session', { path: '/' });
      return context.redirect('/admin/login');
    }
    context.locals.userId = session.sub;
  }

  // Protect admin API endpoints
  if (pathname.startsWith('/api/admin/')) {
    const sessionCookie = context.cookies.get('session')?.value;
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const session = await verifySession(sessionCookie, env.ADMIN_SESSION_SECRET);
    if (!session) {
      context.cookies.delete('session', { path: '/' });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    context.locals.userId = session.sub;
  }

  return withSecurityHeaders(await next());
});
