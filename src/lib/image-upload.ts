// 服务端权威的图片类型判定:扩展名白名单优先,无扩展名时兜底到已知图片 MIME。
// 客户端自报的 Content-Type 不可信,写入 R2 的 contentType 必须由此处决定,
// 防止伪造 MIME 的非图片内容(如 HTML)被存储后按可执行文档提供给浏览器。
const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

const MIME_FALLBACKS: Record<string, { extension: string; contentType: string }> = {
  'image/jpeg': { extension: 'jpg', contentType: 'image/jpeg' },
  'image/png': { extension: 'png', contentType: 'image/png' },
  'image/gif': { extension: 'gif', contentType: 'image/gif' },
  'image/webp': { extension: 'webp', contentType: 'image/webp' },
  'image/svg+xml': { extension: 'svg', contentType: 'image/svg+xml' },
};

export interface ResolvedImageType {
  extension: string;
  contentType: string;
}

export function resolveImageType(filename: string, mimeType: string): ResolvedImageType | null {
  const match = /\.([a-z0-9]+)$/i.exec(filename.trim());
  if (match) {
    const extension = match[1].toLowerCase();
    const contentType = EXTENSION_CONTENT_TYPES[extension];
    // 有扩展名但不在白名单内:直接拒绝,不回退到客户端 MIME
    return contentType ? { extension, contentType } : null;
  }
  // 无扩展名(如部分粘贴上传的文件):仅当 MIME 是已知图片类型时放行
  return MIME_FALLBACKS[mimeType] || null;
}
