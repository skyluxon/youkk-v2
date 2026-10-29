import { z } from "zod";

export const LENGTHS = [30, 45, 60] as const;
export type Length = (typeof LENGTHS)[number];

/** 사용자가 1단계에서 입력하는 프로필 */
export const profileSchema = z.object({
  interests: z.array(z.string().max(40)).min(1).max(8),
  interestsExtra: z.string().max(200),
  strengths: z.string().max(300),
  tones: z.array(z.string().max(20)).max(5),
});
export type Profile = z.infer<typeof profileSchema>;

/** 주제 후보 카드 (LLM 출력) */
export const candidateLlmSchema = z.object({
  title: z.string(),
  hook: z.string(),
  whyFit: z.string(),
  audience: z.string(),
  firstIdeas: z.array(z.string()),
  stockKeywordsEn: z.array(z.string()),
});
export const candidatesLlmSchema = z.object({
  candidates: z.array(candidateLlmSchema),
});

export type Sourcing = "stock" | "mixed" | "ai" | "unknown";

export type Candidate = z.infer<typeof candidateLlmSchema> & {
  id: string;
  sourcing: Sourcing;
  /** 키워드 중 스톡 결과가 충분한 비율 (0~1), 탐침 불가 시 null */
  stockCoverage: number | null;
};

/** 컨셉 카드 (LLM 출력). 주제와 콘텐츠 방향까지만 다루고, 장면·대사는 다음 단계 몫이다. */
export const conceptLlmSchema = z.object({
  channelConcept: z.string(),
  topic: z.string(),
  audience: z.string(),
  tone: z.string(),
  visualStyle: z.string(),
  recommendedLength: z.enum(["30", "45", "60"]),
  lengthReason: z.string(),
  firstVideoIdeas: z.array(z.string()),
  difficultyLevel: z.enum(["쉬움", "보통", "도전"]),
  difficultyNote: z.string(),
  referenceKeywordsEn: z.array(z.string()),
});

/** 다음 단계(레퍼런스·자료 수집·영상 제작)로 넘기는 계약. 필드 변경 시 schemaVersion을 올린다. */
export type Handoff = {
  schemaVersion: "3.0";
  createdAt: string;
  channelConcept: string;
  topic: string;
  audience: string;
  tone: string;
  /** 추천 길이(초). 사용자가 고른 값이 아니며 다음 단계가 바꿔도 된다. */
  recommendedLength: Length;
  lengthReason: string;
  visualStyle: string;
  firstVideoIdeas: string[];
  difficulty: { level: "쉬움" | "보통" | "도전"; note: string };
  referenceKeywordsEn: string[];
  /** 이 주제를 무료 스톡 영상으로 만들기 쉬운 정도(Pixabay 검색 결과 수 기반의 거친 신호) */
  sourcingOutlook: {
    level: Sourcing;
    /** 키워드 중 스톡 결과가 충분한 비율(0~1), 조회 불가 시 null */
    stockCoverage: number | null;
    stockKeywordsEn: string[];
  };
};

// ── API 요청 스키마 ──
export const candidatesReqSchema = z.object({
  profile: profileSchema,
  liked: z.array(z.string().max(100)).max(10),
  disliked: z.array(z.string().max(100)).max(20),
  exclude: z.array(z.string().max(100)).max(30),
});

export const conceptReqSchema = z.object({
  profile: profileSchema,
  candidate: z.object({
    title: z.string().max(100),
    hook: z.string().max(300),
    audience: z.string().max(200),
    firstIdeas: z.array(z.string().max(200)).max(5),
    stockKeywordsEn: z.array(z.string().max(60)).max(5),
  }),
  tweak: z.string().max(400).optional(),
  previous: z.string().max(12000).optional(),
});
