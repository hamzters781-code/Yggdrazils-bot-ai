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
    const full = csvToFaqText(csv);
    const text = full.length > 30_000 ? full.slice(0, 30_000) + '\n...' : full;
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
      const cols = parseCSVLine(line);
      // รองรับทั้ง 5 คอลัมน์ (id,category,question,question_variations,answer)
      // และ 2 คอลัมน์ (question,answer) สำหรับ sheet แบบง่าย
      if (cols.length >= 5) {
        const [, category, question, variations, answer] = cols;
        const variationLine = variations ? `\nคำถามที่เกี่ยวข้อง: ${variations}` : '';
        return `[${category}] ${question}${variationLine}\nคำตอบ: ${answer}`;
      }
      const [question, answer] = cols;
      return `Q: ${question}\nA: ${answer}`;
    })
    .join('\n\n');
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}
