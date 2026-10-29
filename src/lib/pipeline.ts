import "server-only";
import { z } from "zod";
import { generateStructured } from "./llm";
import { CANDIDATES_SYSTEM, CONCEPT_SYSTEM, candidatesUser, conceptUser } from "./prompts";
import { STOCK_ENOUGH_HITS, probeStock } from "./pixabay";
import { mockCandidates, mockConcept } from "./mock";
import { plainify } from "./plain";
import {
  candidatesLlmSchema,
  conceptLlmSchema,
  type Candidate,
  type Handoff,
  type Length,
  type Sourcing,
  type candidatesReqSchema,
  type conceptReqSchema,
} from "./schemas";

const isMock = () => process.env.MOCK_LLM === "1";
const clean = (list: string[]) => list.map((s) => s.trim()).filter(Boolean);

function sourcingFromCoverage(coverage: number | null): Sourcing {
  if (coverage === null) return "unknown";
  if (coverage >= 0.66) return "stock";
  if (coverage >= 0.33) return "mixed";
  return "ai";
}

/** 키워드 중 스톡 결과가 충분한 비율. 조회가 전부 불가하면 null. */
async function stockCoverage(keywords: string[]): Promise<number | null> {
  const hits = await Promise.all(keywords.map(probeStock));
  const known = hits.filter((n): n is number => n !== null);
  return known.length ? known.filter((n) => n >= STOCK_ENOUGH_HITS).length / known.length : null;
}

export async function buildCandidates(req: z.infer<typeof candidatesReqSchema>, round: number): Promise<Candidate[]> {
  const out = isMock()
    ? mockCandidates(round)
    : await generateStructured({
        name: "candidates",
        schema: candidatesLlmSchema,
        system: CANDIDATES_SYSTEM,
        user: candidatesUser(req),
      });

  return Promise.all(
    out.candidates.slice(0, 5).map(async (c) => {
      const keywords = clean(c.stockKeywordsEn).slice(0, 3);
      const coverage = await stockCoverage(keywords);
      return {
        ...c,
        title: plainify(c.title),
        hook: plainify(c.hook),
        whyFit: plainify(c.whyFit),
        audience: plainify(c.audience),
        firstIdeas: clean(c.firstIdeas).slice(0, 3).map(plainify),
        stockKeywordsEn: keywords,
        id: crypto.randomUUID(),
        stockCoverage: coverage,
        sourcing: sourcingFromCoverage(coverage),
      };
    }),
  );
}

export async function buildConcept(req: z.infer<typeof conceptReqSchema>): Promise<Handoff> {
  const [out, coverage] = await Promise.all([
    isMock()
      ? mockConcept()
      : generateStructured({
          name: "concept",
          schema: conceptLlmSchema,
          system: CONCEPT_SYSTEM(),
          user: conceptUser({ profile: req.profile, candidate: req.candidate, tweak: req.tweak, previous: req.previous }),
          temperature: 0.7,
        }),
    stockCoverage(clean(req.candidate.stockKeywordsEn).slice(0, 3)),
  ]);

  return {
    schemaVersion: "3.0",
    createdAt: new Date().toISOString(),
    channelConcept: plainify(out.channelConcept),
    topic: plainify(out.topic),
    audience: plainify(out.audience),
    tone: plainify(out.tone),
    recommendedLength: Number(out.recommendedLength) as Length,
    lengthReason: plainify(out.lengthReason),
    visualStyle: plainify(out.visualStyle),
    firstVideoIdeas: clean(out.firstVideoIdeas).slice(0, 3).map(plainify),
    difficulty: { level: out.difficultyLevel, note: plainify(out.difficultyNote) },
    referenceKeywordsEn: clean(out.referenceKeywordsEn).slice(0, 5),
    sourcingOutlook: {
      level: sourcingFromCoverage(coverage),
      stockCoverage: coverage,
      stockKeywordsEn: clean(req.candidate.stockKeywordsEn).slice(0, 3),
    },
  };
}
