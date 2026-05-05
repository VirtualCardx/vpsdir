/**
 * Prebuild script: Fetches provider data from local D1 and writes to src/data/providers.json.
 * This enables SSG (getStaticPaths) for provider detail pages.
 * Run before `astro build`: node scripts/prebuild.mjs
 */
import { getPlatformProxy } from 'wrangler';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'src', 'data');
const dataFile = join(dataDir, 'providers.json');

async function main() {
  console.log('[prebuild] Fetching providers from D1...');

  let env, dispose;
  try {
    const proxy = await getPlatformProxy();
    env = proxy.env;
    dispose = proxy.dispose;
  } catch (err) {
    console.warn('[prebuild] Could not connect to D1. Writing empty providers.json.');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    writeFileSync(dataFile, '[]');
    return;
  }

  try {
    const result = await env.DB.prepare(
      `SELECT
        p.id, p.slug_zh, p.slug_en, p.url, p.category, p.rating, p.logo_key,
        pc_zh.name AS name_zh, pc_zh.desc AS desc_zh,
        pc_zh.meta_title AS meta_title_zh, pc_zh.meta_desc AS meta_desc_zh,
        pc_en.name AS name_en, pc_en.desc AS desc_en,
        pc_en.meta_title AS meta_title_en, pc_en.meta_desc AS meta_desc_en
      FROM providers p
      LEFT JOIN providers_content pc_zh ON p.id = pc_zh.provider_id AND pc_zh.lang = 'zh'
      LEFT JOIN providers_content pc_en ON p.id = pc_en.provider_id AND pc_en.lang = 'en'
      WHERE p.is_active = 1`,
    ).all();

    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    writeFileSync(dataFile, JSON.stringify(result.results, null, 2));
    console.log(`[prebuild] Wrote ${result.results.length} providers to ${dataFile}`);
  } catch (err) {
    console.warn('[prebuild] D1 query failed. Writing empty providers.json.', err);
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    writeFileSync(dataFile, '[]');
  } finally {
    await dispose();
  }
}

main();
