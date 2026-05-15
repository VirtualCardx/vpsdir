# VPS Provider Directory

[中文文档](README.zh-CN.md)

A bilingual provider directory and activity publishing site built with Astro and Cloudflare. It includes a public-facing directory, an admin panel for provider and activity management, and a lightweight deployment model designed around Cloudflare free-tier services.

## Highlights

- Public bilingual site for provider listings, provider detail pages, and activity content
- Admin panel for provider management, activity management, category management, and user password updates
- Cloudflare-native stack with D1, KV, R2, and Workers
- Lightweight auth based on PBKDF2 password hashing and HMAC-signed sessions
- Custom theme with dark navigation, warm card surfaces, and bilingual UI copy

## Tech Stack

- **Framework**: [Astro](https://astro.build/) v6 (`output: 'server'`, rendered on Cloudflare Workers)
- **Adapter**: [@astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) v13 (Workers deployment)
- **Database**: Cloudflare D1 + [Drizzle ORM](https://orm.drizzle.team/)
- **Storage**: Cloudflare R2 (logo images)
- **Cache**: Cloudflare KV (data cache)
- **Styling**: Tailwind CSS v4 + custom CSS variable theme
- **Editor**: TipTap rich text editor for admin activity content
- **Security**: Web Crypto API (PBKDF2 password hashing, HMAC session signing)

## UI Theme

- **Accent**: `#f10c00`
- **Primary**: `#0f325b`
- **Dark Navigation**: `#0b2340`
- **Page Background**: `#fffdf8`
- **Card Background**: `#fcf5e2`

## Project Structure

```
├── scripts/
│   ├── clean.mjs          # Pre-build cleanup (kills zombie workerd, removes dist/)
│   └── seed.mjs           # Seeds admin user + sample providers into local D1
├── src/
│   ├── components/        # Astro components (Header, Footer, SEO, ProviderCard, AdminHeader, etc.)
│   ├── db/schema.ts       # Drizzle ORM schema (providers, activities, users, bilingual content tables)
│   ├── i18n/              # i18n config, translations, and utilities
│   ├── layouts/           # BaseLayout with SEO, hreflang, JSON-LD
│   ├── lib/               # Core libraries (auth, cache, db, r2, rich-text)
│   ├── middleware.ts       # Route protection + locale redirect
│   ├── pages/
│   │   ├── [lang]/        # Public pages (home, provider detail, activities) -- bilingual
│   │   ├── admin/         # Admin panel (login, provider management, activities, settings, edit pages)
│   │   ├── api/           # API routes (auth, CRUD, cache refresh, uploads, asset serving)
│   │   └── sitemap.xml.ts # Dynamic sitemap with hreflang alternates
│   ├── scripts/           # Client-side admin scripts (rich text editor)
│   └── styles/global.css  # Tailwind CSS entry
├── drizzle/migrations/    # Generated D1 migration SQL files
├── wrangler.jsonc         # Cloudflare Workers config (D1, KV, R2 bindings)
├── drizzle.config.ts      # Drizzle Kit config
└── astro.config.mjs       # Astro config (server output, Cloudflare adapter, Tailwind)
```

## Prerequisites

- Node.js >= 22.12.0
- A Cloudflare account

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Create Cloudflare resources

```bash
# Create D1 database
wrangler d1 create vpsdir-db

# Create KV namespace
wrangler kv namespace create VPSDIR_KV

# Create R2 bucket
wrangler r2 bucket create vpsdir-assets
```

After creating these resources, update `wrangler.jsonc` with the actual IDs returned by each command:

- `d1_databases[0].database_id` -- your D1 database ID
- `kv_namespaces[0].id` -- your KV namespace ID

### 3. Set up the database

```bash
# Generate migration SQL from Drizzle schema
npm run db:generate

# Apply migrations to local D1
npm run db:migrate

# Seed admin user (admin/admin123) and sample providers
npm run db:seed
```

Or run all three in one command:

```bash
npm run db:setup
```

The activity migration also creates default activity categories:

- `news`
- `events`
- `updates`
- `announcements`

### 4. Configure secrets for local dev

Create a `.dev.vars` file in the project root:

```
ADMIN_SESSION_SECRET=any-random-string-for-local-dev
```

### 5. Start the dev server

```bash
npm run dev
```

The site will be available at `http://localhost:4321`. For testing the built Worker locally:

```bash
npm run build
npx wrangler dev
```

This starts the Worker at `http://localhost:8787`.

### 6. Optional type and Astro checks

`astro check` is not wired into the current dependencies by default. Install the required packages first if you want template/type validation:

```bash
npm install -D @astrojs/check typescript
npx astro check
```

## Production Deployment

### 1. Apply migrations to remote D1

```bash
wrangler d1 migrations apply vpsdir-db --remote
```

### 2. Set production secrets

```bash
wrangler secret put ADMIN_SESSION_SECRET
```

Use a strong random string (32+ characters) for `ADMIN_SESSION_SECRET`.

### 3. Deploy

```bash
npm run deploy
```

This runs `clean` -> `astro build` -> `wrangler deploy`.

### 4. Seed the remote database (first deploy only)

After the first deployment, seed the admin user on the remote D1:

```bash
wrangler d1 execute vpsdir-db --remote --command="INSERT INTO users (username, password_hash) VALUES ('admin', '<your-hash>')"
```

To generate a password hash, use the seed script locally and copy the hash from the local database:

```bash
npm run db:seed
wrangler d1 execute vpsdir-db --local --command="SELECT password_hash FROM users WHERE username='admin'"
```

## NPM Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Astro dev server |
| `npm run build` | Clean + production build |
| `npm run preview` | Preview built site locally |
| `npm run clean` | Kill zombie workerd processes and remove dist/ |
| `npm run deploy` | Build and deploy to Cloudflare Workers |
| `npm run db:generate` | Generate Drizzle migration SQL |
| `npm run db:migrate` | Apply migrations to local D1 |
| `npm run db:seed` | Seed admin user + sample data |
| `npm run db:setup` | Generate + migrate + seed (all-in-one) |

## Routes

### Public

| Route | Mode | Description |
|---|---|---|
| `/` | SSR | Redirects to `/zh/` |
| `/zh/` `/en/` | SSR | Home page with provider listing (KV cached) |
| `/zh/provider/[slug]` `/en/provider/[slug]` | SSR | Provider detail with JSON-LD + hreflang |
| `/zh/activities/` `/en/activities/` | SSR | Activity listing page |
| `/zh/activity/[slug]` `/en/activity/[slug]` | SSR | Activity detail page with bilingual content |
| `/sitemap.xml` | SSR | Dynamic sitemap with bilingual alternates |
| `/api/logo/[key]` | SSR | Serves logos from R2 with CDN cache headers |

### Admin

| Route | Description |
|---|---|
| `/admin/login` | Admin login form |
| `/admin/` | Provider management -- provider list, add form, cache refresh |
| `/admin/activities/` | Activity management -- list, create, delete |
| `/admin/activities/edit/[id]` | Edit activity with bilingual rich text fields |
| `/admin/edit/[id]` | Edit provider (bilingual fields, logo upload) |
| `/admin/settings` | User settings -- change current user's password |

## Admin Features

- **Provider Management**: create, edit, delete providers, upload logos, refresh KV cache
- **Activity Management**: create, edit, delete activities and manage activity categories
- **User Settings**: change the currently signed-in admin user's password

## Admin Styling Guide

The admin area now has a shared styling layer in `src/styles/global.css` and a growing set of shared Astro components in `src/components/`. When adding or updating admin pages, prefer these shared classes and components over piling up one-off Tailwind utility combinations or re-building the same page shell.

Standalone reference: [`docs/admin-ui-cheat-sheet.md`](docs/admin-ui-cheat-sheet.md)

- **Cards and sections**: `admin-card`, `admin-section-header`, `admin-section-title`, `admin-section-desc`
- **Alerts and empty states**: `admin-alert-*`, `admin-help-text`, `admin-empty-state`, `admin-empty-state-table`
- **Form controls**: `admin-label`, `admin-input`, `admin-checkbox-row`, `admin-checkbox`, `admin-checkbox-label`
- **Buttons and links**: `admin-btn-*`, `admin-action-link`, `admin-btn-danger`
- **Tables and status UI**: `admin-table-card`, `admin-table-wrap`, `admin-table-head`, `admin-cell*`, `admin-badge*`
- **Uploads and tag pills**: `admin-upload-*`, `admin-tag-pill`, `admin-tag-pill-remove`
- **Shared components**: `AdminAlert`, `AdminSectionCard`, `AdminDataTable`, `AdminHeaderActions`, `AdminFormPage`

Recommended workflow:

- Start new admin pages from an existing admin page structure, then swap fields and business logic
- Extend shared classes in `global.css` first, then reuse them in page templates
- If a tweak is only about color, spacing, or border radius, update the shared class instead of patching pages one by one
- When introducing a new admin UI pattern, check whether it can also be reused by provider management, activity management, login, or settings pages
- For standalone admin form pages, prefer `AdminFormPage` to keep the `main + card + form` shell consistent; if the page also includes tables or other sections, embed it with `wrapMain={false}`

### API

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login` | POST | Authenticate admin (PBKDF2) |
| `/api/auth/logout` | POST | Clear session cookie |
| `/api/auth/password` | POST | Change current user's password |
| `/api/admin/activity-categories` | GET | Fetch activity categories |
| `/api/admin/activity-categories` | POST | Create category or delete via `_method=DELETE` |
| `/api/admin/providers` | POST | Create provider |
| `/api/admin/providers?id=X&_method=PUT` | POST | Update provider |
| `/api/admin/providers?id=X&_method=DELETE` | POST | Delete provider |
| `/api/admin/activities` | GET | Fetch activities for admin |
| `/api/admin/activities` | POST | Create activity |
| `/api/admin/activities?id=X&_method=PUT` | POST | Update activity |
| `/api/admin/activities?id=X&_method=DELETE` | POST | Delete activity |
| `/api/admin/upload-image` | POST | Upload rich text images to R2 |
| `/api/admin/cache-refresh` | POST | Invalidate KV cache |

## Database Schema

### providers
Core provider information with unique bilingual slugs (`slug_zh`, `slug_en`), URL, category, rating, logo key, and active status.

### providers_content
Bilingual content (name, description, meta title, meta description) with a unique composite index on `(provider_id, lang)`.

### users
Admin accounts with PBKDF2-hashed passwords.

### activity_categories
Activity category taxonomy used by admin and public activity pages.

### activities
Activity base records with category, publish time, featured flag, active flag, and view count.

### activities_content
Bilingual activity content (title, slug, description, rich text body, SEO fields) with a unique composite index on `(activity_id, lang)`.

## Security

- **Authentication**: PBKDF2 (100k iterations, SHA-256) via Web Crypto API -- no Node.js crypto modules
- **Sessions**: HMAC-signed cookies (SHA-256), 24h expiry, httpOnly + secure + sameSite=strict
- **Admin Routes**: Middleware-enforced session validation on all `/admin/*` routes (except login)
- **SEO Protection**: Admin pages have `noindex, nofollow` meta tags

## Cloudflare Free Tier Compliance

| Service | Free Tier Limit |
|---|---|
| D1 | 5M rows read, 100K rows written per day |
| KV | 100K reads, 1K writes per day |
| R2 | 10M Class A ops, 10M Class B ops per month |
| Workers | 100K requests per day |

The architecture minimizes D1 reads and writes with KV caching, lightweight SSR pages, and batched administrative operations to stay within free-tier limits.
