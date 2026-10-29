import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { checkLimits, clientIp } from "./guard";
import { LlmError } from "./llm";

/** 공통: 한도 확인 → 본문 검증 → 실행 → 오류를 한국어 메시지로 변환 */
export async function handle<S extends z.ZodType>(
  req: Request,
  schema: S,
  run: (body: z.infer<S>) => Promise<unknown>,
) {
  const limit = checkLimits(clientIp(req));
  if (!limit.ok) return NextResponse.json({ error: limit.reason }, { status: 429 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  try {
    return NextResponse.json(await run(parsed.data));
  } catch (e) {
    if (e instanceof LlmError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "알 수 없는 오류가 발생했어요." }, { status: 500 });
  }
}
