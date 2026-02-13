const bucket = new Map<string, { count: number; ts: number }>();

export function allowAction(key: string, maxPerSec = 20) {
  const now = Date.now();
  const prev = bucket.get(key) || { count: 0, ts: now };
  if (now - prev.ts > 1000) {
    bucket.set(key, { count: 1, ts: now });
    return true;
  }
  prev.count += 1;
  bucket.set(key, prev);
  return prev.count <= maxPerSec;
}
