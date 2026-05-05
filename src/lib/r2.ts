export async function uploadLogo(
  r2: R2Bucket,
  key: string,
  data: ArrayBuffer,
  contentType: string,
): Promise<void> {
  await r2.put(key, data, {
    httpMetadata: { contentType },
  });
}

export async function deleteLogo(r2: R2Bucket, key: string): Promise<void> {
  await r2.delete(key);
}

export function getLogoUrl(key: string | null): string {
  if (!key) return '/images/placeholder.svg';
  return `/api/logo/${key}`;
}
