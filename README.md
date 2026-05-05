# VPS Provider Directory

[中文文档](README.zh-CN.md)

A minimal, high-performance bilingual (Chinese/English) service provider directory website, fully hosted on Cloudflare infrastructure within Free Tier limits.

## Tech Stack

- **Framework**: [Astro](https://astro.build/) v6 (Hybrid Rendering -- SSG for detail pages, SSR for admin)
- **Adapter**: [@astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) v13 (Workers deployment)
- **Database**: Cloudflare D1 + [Drizzle ORM](https://orm.drizzle.team/)
- **Storage**: Cloudflare R2 (logo images)
- **Cache**: Cloudflare KV (data cache)
- **Styling**: Tailwind CSS v4
- **Security**: Web Crypto API (PBKDF2 password hashing, HMAC session signing)

## Project Structure

```
├── scripts/
│   ├── clean.mjs          # Pre-build cleanup (kills zombie workerd, removes dist/)
│   ├── prebuild.mjs       # Exports D1 providers to JSON for SSG getStaticPaths
│   └── seed.mjs           # Seeds admin user + sample providers into local D1
├── src/
│   ├── components/        # Astro components (Header, Footer, SEO, ProviderCard, etc.)
│   ├── data/              # Build-time generated provider data (providers.json)
│   ├── db/schema.ts       # Drizzle ORM schema (providers, providers_content, users)
│   ├── i18n/              # i18n config, translations, and utilities
│   ├── layouts/           # BaseLayout with SEO, hreflang, JSON-LD
│   ├── lib/               # Core libraries (auth, cache, db, r2)
│   ├── middleware.ts       # Route protection + locale redirect
│   ├── pages/
│   │   ├── [lang]/        # Public pages (home, provider detail) -- bilingual
│   │   ├── admin/         # Admin panel (login, dashboard, edit)
│   │   ├── api/           # API routes (auth, CRUD, cache refresh, logo serving)
│   │   └── sitemap.xml.ts # Dynamic sitemap with hreflang alternates
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

This runs `clean` -> `prebuild` (exports D1 data for SSG) -> `astro build` -> `wrangler deploy`.

> **Note**: The `prebuild` step reads from the **local** D1 database to generate static provider detail pages. To build with production data, first export the remote D1 and import locally:
>
> ```bash
> wrangler d1 export vpsdir-db --remote --output=backup.sql
> wrangler d1 execute vpsdir-db --local --file=backup.sql
> npm run deploy
> ```

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
| `npm run build` | Clean + prebuild SSG data + production build |
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
| `/zh/provider/[slug]` `/en/provider/[slug]` | SSG | Provider detail with JSON-LD + hreflang |
| `/sitemap.xml` | SSR | Dynamic sitemap with bilingual alternates |
| `/api/logo/[key]` | SSR | Serves logos from R2 with CDN cache headers |

### Admin

| Route | Description |
|---|---|
| `/admin/login` | Admin login form |
| `/admin/` | Dashboard -- provider list, add form, cache refresh |
| `/admin/edit/[id]` | Edit provider (bilingual fields, logo upload) |

### API

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login` | POST | Authenticate admin (PBKDF2) |
| `/api/auth/logout` | POST | Clear session cookie |
| `/api/admin/providers` | POST | Create provider |
| `/api/admin/providers?id=X&_method=PUT` | POST | Update provider |
| `/api/admin/providers?id=X&_method=DELETE` | POST | Delete provider |
| `/api/admin/cache-refresh` | POST | Invalidate KV cache |

## Database Schema

### providers
Core provider information with unique bilingual slugs (`slug_zh`, `slug_en`), URL, category, rating, logo key, and active status.

### providers_content
Bilingual content (name, description, meta title, meta description) with a unique composite index on `(provider_id, lang)`.

### users
Admin accounts with PBKDF2-hashed passwords.

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

The architecture minimizes D1 writes (KV caching for reads, batch operations) and uses SSG for detail pages to reduce Worker invocations.
