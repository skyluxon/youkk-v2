import { handle } from "@/lib/route-helpers";
import { buildConcept } from "@/lib/pipeline";
import { conceptReqSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  return handle(req, conceptReqSchema, async (body) => ({ demo: process.env.MOCK_LLM === "1", concept: await buildConcept(body) }));
}
