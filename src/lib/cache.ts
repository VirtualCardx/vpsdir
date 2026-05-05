const CACHE_PREFIX = 'cache:';
const DEFAULT_TTL = 3600;

export async function getCached<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const data = await kv.get(`${CACHE_PREFIX}${key}`, 'json');
  return data as T | null;
}

export async function setCache(
  kv: KVNamespace,
  key: string,
  value: unknown,
  ttl = DEFAULT_TTL,
): Promise<void> {
  await kv.put(`${CACHE_PREFIX}${key}`, JSON.stringify(value), { expirationTtl: ttl });
}

export async function invalidateCache(kv: KVNamespace, key: string): Promise<void> {
  await kv.delete(`${CACHE_PREFIX}${key}`);
}

export async function setLastUpdated(kv: KVNamespace): Promise<void> {
  await kv.put('last_updated', new Date().toISOString());
}

export async function getLastUpdated(kv: KVNamespace): Promise<string | null> {
  return kv.get('last_updated');
}
