import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifyPassword, createSession } from '../../../lib/auth';
import { getDb } from '../../../lib/db';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return redirect('/admin/login?error=invalid');
  }

  // Verify credentials
  const db = getDb(env.DB);
  const user = await db.select().from(users).where(eq(users.username, username)).get();
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return redirect('/admin/login?error=invalid');
  }

  // Create session
  const token = await createSession(user.id, env.ADMIN_SESSION_SECRET);
  cookies.set('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 86400,
  });

  return redirect('/admin/');
};
