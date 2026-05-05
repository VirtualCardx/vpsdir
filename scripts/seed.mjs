/**
 * Seed script: Creates the admin user and sample providers in local D1.
 * Run after migrations: node scripts/seed.mjs
 */
import { getPlatformProxy } from 'wrangler';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  const toHex = (bytes) => Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${toHex(salt)}:${toHex(new Uint8Array(hash))}`;
}

async function main() {
  const { env, dispose } = await getPlatformProxy();

  console.log('[seed] Creating admin user...');
  const passwordHash = await hashPassword('admin123');
  await env.DB.prepare('INSERT OR IGNORE INTO users (username, password_hash) VALUES (?, ?)')
    .bind('admin', passwordHash)
    .run();

  console.log('[seed] Creating sample providers...');
  const sampleProviders = [
    { slug_zh: 'bandwagonhost', slug_en: 'bandwagonhost', url: 'https://bandwagonhost.com', category: 'vps', rating: 4.2 },
    { slug_zh: 'vultr', slug_en: 'vultr', url: 'https://www.vultr.com', category: 'vps', rating: 4.5 },
    { slug_zh: 'namesilo', slug_en: 'namesilo', url: 'https://www.namesilo.com', category: 'domain', rating: 4.3 },
  ];

  for (const p of sampleProviders) {
    const result = await env.DB.prepare(
      'INSERT OR IGNORE INTO providers (slug_zh, slug_en, url, category, rating) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(p.slug_zh, p.slug_en, p.url, p.category, p.rating)
      .run();

    if (result.meta.changes > 0) {
      const row = await env.DB.prepare('SELECT id FROM providers WHERE slug_en = ?').bind(p.slug_en).first();
      if (row) {
        await env.DB.prepare(
          'INSERT OR IGNORE INTO providers_content (provider_id, lang, name, desc) VALUES (?, ?, ?, ?)',
        )
          .bind(row.id, 'zh', `${p.slug_en} 主机`, `${p.slug_en} 是一家优质的${p.category === 'vps' ? 'VPS' : '域名'}服务商。`)
          .run();
        await env.DB.prepare(
          'INSERT OR IGNORE INTO providers_content (provider_id, lang, name, desc) VALUES (?, ?, ?, ?)',
        )
          .bind(row.id, 'en', p.slug_en.charAt(0).toUpperCase() + p.slug_en.slice(1), `${p.slug_en} is a quality ${p.category} service provider.`)
          .run();
      }
    }
  }

  console.log('[seed] Done!');
  await dispose();
}

main();
