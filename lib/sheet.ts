const CACHE_TTL_MS = 60_000;

let cache: { text: string; expiresAt: number } | null = null;

export async function fetchFaq(): Promise<string> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.text;

  const url = process.env.SHEET_CSV_URL;
  if (!url) {
    console.error('[sheet] SHEET_CSV_URL is not set');
    return cache?.text ?? '';
  }

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const csv = await res.text();
    const text = csvToFaqText(csv);
    cache = { text, expiresAt: now + CACHE_TTL_MS };
    return text;
  } catch (err) {
    console.warn('[sheet] fetch failed — serving stale cache:', err);
    return cache?.text ?? '';
  }
}

function csvToFaqText(csv: string): string {
  const lines = csv.split('\n').slice(1); // skip header row
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const [question, answer] = parseCSVLine(line);
      return `Q: ${question}\nA: ${answer}`;
    })
    .join('\n\n');
}

function parseCSVLine(line: string): [string, string] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += char;
  }
  result.push(current.trim());
  return [result[0] ?? '', result[1] ?? ''];
}
