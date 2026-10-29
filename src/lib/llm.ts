import "server-only";
import { z } from "zod";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export class LlmError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

export function llmConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function toJsonSchema(schema: z.ZodType) {
  const js = z.toJSONSchema(schema) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  return JSON.parse(t);
}

/**
 * OpenRouter에 구조화 출력을 요청하고 zod로 검증한다. 검증 실패 시 1회 재시도.
 * 사용자 자유 입력은 항상 user 메시지의 데이터로만 전달하고 system에는 넣지 않는다.
 */
export async function generateStructured<T>(opts: {
  name: string;
  schema: z.ZodType<T>;
  system: string;
  user: string;
  temperature?: number;
}): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new LlmError("OPENROUTER_API_KEY가 설정되지 않았어요. .env.local을 확인해 주세요.", 500);
  const model = process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-5.5";

  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: opts.temperature ?? 0.8,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: opts.name, strict: true, schema: toJsonSchema(opts.schema) },
        },
      }),
      signal: AbortSignal.timeout(60_000),
    }).catch((e: unknown) => {
      throw new LlmError(`AI 서버에 연결하지 못했어요: ${e instanceof Error ? e.message : String(e)}`);
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        throw new LlmError("OpenRouter 인증에 실패했어요. 키를 확인해 주세요.", 500);
      }
      if (res.status === 429) throw new LlmError("AI 사용량 한도에 걸렸어요. 잠시 후 다시 시도해 주세요.", 429);
      throw new LlmError(`AI 응답 오류(${res.status}) ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      lastErr = "빈 응답";
      continue;
    }
    try {
      return opts.schema.parse(extractJson(content));
    } catch (e) {
      lastErr = e instanceof Error ? e.message.slice(0, 200) : "형식 오류";
    }
  }
  throw new LlmError(`AI가 올바른 형식으로 답하지 못했어요. 다시 시도해 주세요. (${lastErr})`);
}
