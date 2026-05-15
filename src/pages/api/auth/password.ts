import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { users } from '../../../db/schema';
import { createSession, hashPassword, verifyPassword, verifySession } from '../../../lib/auth';
import { getDb } from '../../../lib/db';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const sessionCookie = cookies.get('session')?.value;
  if (!sessionCookie) {
    return redirect('/admin/login');
  }

  const session = await verifySession(sessionCookie, env.ADMIN_SESSION_SECRET);
  if (!session?.sub) {
    cookies.delete('session', { path: '/' });
    return redirect('/admin/login');
  }

  const formData = await request.formData();
  const currentPassword = String(formData.get('currentPassword') || '').trim();
  const newPassword = String(formData.get('newPassword') || '').trim();
  const confirmPassword = String(formData.get('confirmPassword') || '').trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return redirect('/admin/settings?error=missing');
  }

  if (newPassword.length < 8) {
    return redirect('/admin/settings?error=too_short');
  }

  if (newPassword !== confirmPassword) {
    return redirect('/admin/settings?error=mismatch');
  }

  const db = getDb(env.DB);
  const user = await db.select().from(users).where(eq(users.id, session.sub)).get();
  if (!user) {
    cookies.delete('session', { path: '/' });
    return redirect('/admin/login');
  }

  const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash);
  if (!isCurrentPasswordValid) {
    return redirect('/admin/settings?error=invalid_current');
  }

  const password_hash = await hashPassword(newPassword);
  await db.update(users).set({ password_hash }).where(eq(users.id, user.id));

  const token = await createSession(user.id, env.ADMIN_SESSION_SECRET);
  cookies.set('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 86400,
  });

  return redirect('/admin/settings?msg=password_updated');
};
