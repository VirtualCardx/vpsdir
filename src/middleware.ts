import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { verifySession } from './lib/auth';
import { defaultLocale } from './i18n/config';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Skip static assets
  if (pathname.startsWith('/_') || pathname.startsWith('/favicon')) {
    return next();
  }

  // Root redirect to default locale
  if (pathname === '/') {
    return context.redirect(`/${defaultLocale}/`);
  }

  // Admin route protection (except login page and API)
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

  return next();
});
