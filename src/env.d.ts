/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  DB: D1Database;
  VPSDIR_KV: KVNamespace;
  R2: R2Bucket;
  ADMIN_SESSION_SECRET: string;
}

declare module 'cloudflare:workers' {
  const env: CloudflareEnv;
  export { env };
}

declare namespace App {
  interface Locals {
    userId?: number;
  }
}
