import { handle } from "@/lib/route-helpers";
import { buildCandidates } from "@/lib/pipeline";
import { candidatesReqSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  return handle(req, candidatesReqSchema, async (body) => ({
    demo: process.env.MOCK_LLM === "1",
    candidates: await buildCandidates(body, Math.floor(body.exclude.length / 5)),
  }));
}
