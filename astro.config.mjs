// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()],
  },
  // API 端点通过 Bearer Token 鉴权，需要允许跨站 POST 请求（JSON / multipart）
  security: {
    checkOrigin: false,
  },
});
