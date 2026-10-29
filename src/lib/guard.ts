import "server-only";

// 단일 인스턴스용 간이 남용 방지. 배포 규모가 커지면 외부 저장소 기반으로 교체한다.
const WINDOW_MS = 10 * 60 * 1000;
const PER_IP_LIMIT = Number(process.env.RATE_LIMIT_PER_10MIN ?? 30);
const DAILY_LIMIT = Number(process.env.DAILY_LLM_LIMIT ?? 300);

const perIp = new Map<string, number[]>();
let day = new Date().toDateString();
let dailyCount = 0;

export function checkLimits(ip: string): { ok: true } | { ok: false; reason: string } {
  const today = new Date().toDateString();
  if (today !== day) {
    day = today;
    dailyCount = 0;
  }
  if (dailyCount >= DAILY_LIMIT) {
    return { ok: false, reason: "오늘 사용 가능한 AI 호출 한도를 모두 썼어요. 내일 다시 시도해 주세요." };
  }
  const now = Date.now();
  const recent = (perIp.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_IP_LIMIT) {
    return { ok: false, reason: "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요." };
  }
  recent.push(now);
  perIp.set(ip, recent);
  dailyCount += 1;
  return { ok: true };
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
