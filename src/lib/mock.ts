import "server-only";
import type { z } from "zod";
import type { candidatesLlmSchema, conceptLlmSchema } from "./schemas";

// MOCK_LLM=1 일 때만 쓰는 데모 데이터. 키 없이 화면 흐름을 확인하기 위한 용도.
export function mockCandidates(round: number): z.infer<typeof candidatesLlmSchema> {
  const sets = [
    [
      ["자취생 10분 한 그릇 요리", "cooking", "kitchen", "pasta"],
      ["출근길 도시 풍경 힐링 영상", "city morning", "subway", "sunrise"],
      ["밤하늘 판타지 동화 낭독", "starry sky", "forest night", "moon"],
      ["하루 5분 스트레칭 루틴", "stretching", "yoga", "morning light"],
      ["동네 숨은 카페 감성 브이로그", "cafe", "coffee pouring", "street"],
    ],
    [
      ["비 오는 날 듣는 로파이 플레이리스트", "rain window", "city rain", "cozy room"],
      ["10분 정리로 바뀌는 작은 방", "room cleaning", "desk", "organizing"],
      ["우주와 시간의 개념 3분 설명", "galaxy", "clock", "abstract light"],
      ["반려견과 함께하는 산책 코스", "dog walking", "park", "autumn leaves"],
      ["초보 홈카페 라떼 레시피", "latte art", "milk pouring", "coffee beans"],
    ],
  ];
  const set = sets[round % sets.length];
  return {
    candidates: set.map(([title, ...kw]) => ({
      title,
      hook: `${title}, 처음이어도 30초면 충분해요.`,
      whyFit: "관심사에 맞춰 부담 없이 시작할 수 있어요. (데모 데이터)",
      audience: "퇴근 후 짧은 영상으로 쉬고 싶은 20~30대",
      firstIdeas: ["첫 번째 아이디어", "두 번째 아이디어", "세 번째 아이디어"],
      stockKeywordsEn: kw.slice(0, 3),
    })),
  };
}

export function mockConcept(): z.infer<typeof conceptLlmSchema> {
  return {
    channelConcept: "바쁜 하루 사이 1분 쉼표가 되어주는 감성 숏폼 (데모)",
    topic: "출근길 힐링 영상",
    audience: "퇴근 후 짧은 영상으로 쉬고 싶은 20~30대",
    tone: "차분하고 따뜻한 분위기",
    visualStyle: "따뜻한 톤의 실사 시네마틱, 낮은 채도",
    recommendedLength: "30",
    lengthReason: "한 가지 분위기만 보여주기 좋아서 짧게 끝내는 게 어울려요. (데모 데이터)",
    firstVideoIdeas: ["새벽 도시의 첫 빛", "비 오는 날의 카페", "퇴근길 노을"],
    difficultyLevel: "쉬움",
    difficultyNote: "스톡 영상 중심이라 제작 부담이 적어요. 첫 영상은 욕심내지 말고 하나만 보여주세요. (데모 데이터)",
    referenceKeywordsEn: ["healing shorts", "morning vlog", "cinematic city"],
  };
}
