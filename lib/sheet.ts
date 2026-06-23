const CACHE_TTL_MS = 60_000;

let cachedFaq = '';
let cacheExpiresAt = 0;

export async function fetchFaq(): Promise<string> {
  if (Date.now() < cacheExpiresAt && cachedFaq !== '') {
    return cachedFaq;
  }

  const url = process.env.SHEET_CSV_URL;
  if (!url) {
    console.error('[sheet] SHEET_CSV_URL is not set');
    return '';
  }

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    cachedFaq = text.trim();
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return cachedFaq;
  } catch (err) {
    console.error('[sheet] fetch failed:', err);
    return cachedFaq; // return stale cache if available, else ''
  }
}
