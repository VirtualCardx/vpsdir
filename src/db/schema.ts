import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const providers = sqliteTable('providers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug_zh: text('slug_zh').notNull().unique(),
  slug_en: text('slug_en').notNull().unique(),
  url: text('url').notNull(),
  category: text('category').notNull(),
  rating: real('rating').default(0),
  logo_key: text('logo_key'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const providersContent = sqliteTable(
  'providers_content',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    provider_id: integer('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    lang: text('lang').notNull(),
    name: text('name').notNull(),
    desc: text('desc'),
    meta_title: text('meta_title'),
    meta_desc: text('meta_desc'),
  },
  (table) => [uniqueIndex('provider_lang_idx').on(table.provider_id, table.lang)],
);

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});
