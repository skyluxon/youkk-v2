import "server-only";

/** 이 값 이상이면 해당 키워드는 스톡으로 충분하다고 본다. Pixabay totalHits는 500에서 잘리고 임의 조합도 많이 잡혀서 거친 신호일 뿐이다. */
export const STOCK_ENOUGH_HITS = Number(process.env.STOCK_ENOUGH_HITS ?? 100);

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; hits: number | null }>();

/**
 * Pixabay 영상 검색 결과 수(totalHits)만 조회한다. 영상 선택·다운로드는 다음 단계 담당.
 * 키가 없거나 호출이 실패하면 null (= 알 수 없음).
 */
export async function probeStock(keyword: string): Promise<number | null> {
  const key = process.env.PIXABAY_API_KEY;
  const q = keyword.trim().slice(0, 100);
  if (!key || !q) return null;

  const hit = cache.get(q.toLowerCase());
  if (hit && Date.now() - hit.at < TTL_MS) return hit.hits;

  let hits: number | null = null;
  try {
    const url = new URL("https://pixabay.com/api/videos/");
    url.searchParams.set("key", key);
    url.searchParams.set("q", q);
    url.searchParams.set("per_page", "3");
    url.searchParams.set("safesearch", "true");
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const json = (await res.json()) as { totalHits?: number };
      hits = typeof json.totalHits === "number" ? json.totalHits : null;
    }
  } catch {
    hits = null;
  }
  // 실패(null)는 오래 캐시하지 않도록 짧게 둔다.
  cache.set(q.toLowerCase(), { at: hits === null ? Date.now() - TTL_MS + 30_000 : Date.now(), hits });
  return hits;
}
