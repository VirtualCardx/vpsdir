# VPS 服务商目录

[English](README.md)

一个极简、高性能的中英双语服务商目录网站，完全托管在 Cloudflare 基础设施上，符合免费套餐限制。

## 技术栈

- **框架**: [Astro](https://astro.build/) v6 (混合渲染 -- 详情页 SSG，管理后台 SSR)
- **适配器**: [@astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) v13 (Workers 部署)
- **数据库**: Cloudflare D1 + [Drizzle ORM](https://orm.drizzle.team/)
- **存储**: Cloudflare R2 (Logo 图片)
- **缓存**: Cloudflare KV (数据缓存)
- **样式**: Tailwind CSS v4
- **安全**: Web Crypto API (PBKDF2 密码哈希, HMAC 会话签名)

## 项目结构

```
├── scripts/
│   ├── clean.mjs          # 构建前清理 (终止残留 workerd 进程, 删除 dist/)
│   ├── prebuild.mjs       # 从 D1 导出服务商数据到 JSON, 供 SSG getStaticPaths 使用
│   └── seed.mjs           # 向本地 D1 写入管理员用户和示例服务商数据
├── src/
│   ├── components/        # Astro 组件 (Header, Footer, SEO, ProviderCard 等)
│   ├── data/              # 构建时生成的服务商数据 (providers.json)
│   ├── db/schema.ts       # Drizzle ORM 数据库模型 (providers, providers_content, users)
│   ├── i18n/              # 国际化配置、翻译文件和工具函数
│   ├── layouts/           # BaseLayout, 含 SEO、hreflang、JSON-LD
│   ├── lib/               # 核心库 (auth, cache, db, r2)
│   ├── middleware.ts       # 路由保护 + 语言重定向
│   ├── pages/
│   │   ├── [lang]/        # 公开页面 (首页, 服务商详情) -- 双语
│   │   ├── admin/         # 管理后台 (登录, 仪表盘, 编辑)
│   │   ├── api/           # API 路由 (认证, CRUD, 缓存刷新, Logo 服务)
│   │   └── sitemap.xml.ts # 动态站点地图, 含 hreflang 备用链接
│   └── styles/global.css  # Tailwind CSS 入口
├── drizzle/migrations/    # 生成的 D1 迁移 SQL 文件
├── wrangler.jsonc         # Cloudflare Workers 配置 (D1, KV, R2 绑定)
├── drizzle.config.ts      # Drizzle Kit 配置
└── astro.config.mjs       # Astro 配置 (server 输出, Cloudflare 适配器, Tailwind)
```

## 前置要求

- Node.js >= 22.12.0
- Cloudflare 账户

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 创建 Cloudflare 资源

```bash
# 创建 D1 数据库
wrangler d1 create vpsdir-db

# 创建 KV 命名空间
wrangler kv namespace create VPSDIR_KV

# 创建 R2 存储桶
wrangler r2 bucket create vpsdir-assets
```

创建完成后，将各命令返回的实际 ID 填入 `wrangler.jsonc`：

- `d1_databases[0].database_id` -- 你的 D1 数据库 ID
- `kv_namespaces[0].id` -- 你的 KV 命名空间 ID

### 3. 初始化数据库

```bash
# 根据 Drizzle schema 生成迁移 SQL
npm run db:generate

# 将迁移应用到本地 D1
npm run db:migrate

# 写入管理员用户 (admin/admin123) 和示例服务商数据
npm run db:seed
```

或一键执行：

```bash
npm run db:setup
```

### 4. 配置本地开发密钥

在项目根目录创建 `.dev.vars` 文件：

```
ADMIN_SESSION_SECRET=any-random-string-for-local-dev
```

### 5. 启动开发服务器

```bash
npm run dev
```

站点地址：`http://localhost:4321`。如需测试构建后的 Worker：

```bash
npm run build
npx wrangler dev
```

Worker 地址：`http://localhost:8787`。

## 生产部署

### 1. 将迁移应用到远程 D1

```bash
wrangler d1 migrations apply vpsdir-db --remote
```

### 2. 设置生产环境密钥

```bash
wrangler secret put ADMIN_SESSION_SECRET
```

`ADMIN_SESSION_SECRET` 请使用强随机字符串 (32 字符以上)。

### 3. 部署

```bash
npm run deploy
```

执行流程：`clean` -> `prebuild` (导出 D1 数据供 SSG) -> `astro build` -> `wrangler deploy`。

> **注意**：`prebuild` 步骤从**本地** D1 读取数据生成静态服务商详情页。如需使用生产数据构建，先将远程 D1 导出并导入本地：
>
> ```bash
> wrangler d1 export vpsdir-db --remote --output=backup.sql
> wrangler d1 execute vpsdir-db --local --file=backup.sql
> npm run deploy
> ```

### 4. 初始化远程数据库 (仅首次部署)

首次部署后，向远程 D1 写入管理员用户：

```bash
wrangler d1 execute vpsdir-db --remote --command="INSERT INTO users (username, password_hash) VALUES ('admin', '<your-hash>')"
```

生成密码哈希的方法：先在本地执行 seed 脚本，再从本地数据库复制哈希值：

```bash
npm run db:seed
wrangler d1 execute vpsdir-db --local --command="SELECT password_hash FROM users WHERE username='admin'"
```

## NPM 脚本

| 脚本 | 说明 |
|---|---|
| `npm run dev` | 启动 Astro 开发服务器 |
| `npm run build` | 清理 + 预构建 SSG 数据 + 生产构建 |
| `npm run preview` | 本地预览构建产物 |
| `npm run clean` | 终止残留 workerd 进程并删除 dist/ |
| `npm run deploy` | 构建并部署到 Cloudflare Workers |
| `npm run db:generate` | 生成 Drizzle 迁移 SQL |
| `npm run db:migrate` | 将迁移应用到本地 D1 |
| `npm run db:seed` | 写入管理员用户和示例数据 |
| `npm run db:setup` | 生成 + 迁移 + 写入数据 (一键执行) |

## 路由

### 公开页面

| 路由 | 模式 | 说明 |
|---|---|---|
| `/` | SSR | 重定向到 `/zh/` |
| `/zh/` `/en/` | SSR | 首页, 服务商列表 (KV 缓存) |
| `/zh/provider/[slug]` `/en/provider/[slug]` | SSG | 服务商详情, 含 JSON-LD + hreflang |
| `/sitemap.xml` | SSR | 动态站点地图, 含双语备用链接 |
| `/api/logo/[key]` | SSR | 从 R2 提供 Logo, 带 CDN 缓存头 |

### 管理后台

| 路由 | 说明 |
|---|---|
| `/admin/login` | 管理员登录 |
| `/admin/` | 仪表盘 -- 服务商列表、添加表单、缓存刷新 |
| `/admin/edit/[id]` | 编辑服务商 (双语字段, Logo 上传) |

### API

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/auth/login` | POST | 管理员认证 (PBKDF2) |
| `/api/auth/logout` | POST | 清除会话 Cookie |
| `/api/admin/providers` | POST | 创建服务商 |
| `/api/admin/providers?id=X&_method=PUT` | POST | 更新服务商 |
| `/api/admin/providers?id=X&_method=DELETE` | POST | 删除服务商 |
| `/api/admin/cache-refresh` | POST | 清除 KV 缓存 |

## 数据库模型

### providers
服务商核心信息，包含唯一的双语 slug (`slug_zh`, `slug_en`)、URL、分类、评分、Logo 键名和启用状态。

### providers_content
双语内容 (名称、描述、SEO 标题、SEO 描述)，`(provider_id, lang)` 有唯一复合索引。

### users
管理员账户，密码使用 PBKDF2 哈希存储。

## 安全机制

- **认证**: 通过 Web Crypto API 实现 PBKDF2 (100k 迭代, SHA-256) -- 不依赖 Node.js crypto 模块
- **会话**: HMAC 签名 Cookie (SHA-256), 24 小时过期, httpOnly + secure + sameSite=strict
- **后台路由**: 中间件强制校验所有 `/admin/*` 路由的会话 (登录页除外)
- **SEO 防护**: 管理后台页面设置 `noindex, nofollow` meta 标签

## Cloudflare 免费套餐合规

| 服务 | 免费套餐限制 |
|---|---|
| D1 | 每天 500 万行读取, 10 万行写入 |
| KV | 每天 10 万次读取, 1000 次写入 |
| R2 | 每月 1000 万次 A 类操作, 1000 万次 B 类操作 |
| Workers | 每天 10 万次请求 |

架构设计通过 KV 缓存减少 D1 读取、批量操作减少写入、SSG 预渲染详情页减少 Worker 调用，以充分利用免费套餐额度。
