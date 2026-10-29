# 첫 영상 컨셉 잡기 (youkk-v2 · STEP 0)

유튜브를 처음 시작하는 사람이 AI와 대화하며 **숏폼의 주제와 콘텐츠 방향**을 정하는 앞단 모듈입니다.
결과물은 화면의 컨셉 카드와, 다음 단계(레퍼런스 탐색 → 자료 수집 → 영상 제작)로 넘기는 JSON입니다.
장면 구성·대사·영상 소스 선택은 이 단계가 아니라 다음 단계에서 구체화합니다.

## 흐름

1. **나 알아보기** — 관심사·잘하는 것·분위기를 입력 (필수는 관심사 하나 이상)
2. **주제 고르기** — AI가 후보 5개를 제안. 👍/👎 반응을 반영해 최대 3회 재추천. 후보마다 "스톡으로 만들기 쉬운 정도" 배지 표시
3. **컨셉 카드** — 채널 컨셉·시청자·분위기·추천 길이·첫 영상 아이디어·난이도·참고 영상 검색어 + 수정 요청 + 결과 복사/파일 저장

영상 길이(30/45/60초)는 사용자가 고르지 않고 AI가 이유와 함께 추천합니다. 제작 단계에서 바뀔 수 있습니다.

## 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기 (키는 채팅/코드에 붙여넣지 말 것)
npm run dev
```

`MOCK_LLM=1`이면 키 없이 데모 데이터로 화면 흐름만 확인할 수 있습니다. 실제 사용 시 `0`으로 바꾸세요.

## 환경변수

| 이름 | 설명 |
|---|---|
| `OPENROUTER_API_KEY` | 후보·컨셉 생성용 LLM |
| `OPENROUTER_MODEL` | JSON schema 구조화 출력을 지원하는 모델 ID (기본 `anthropic/claude-haiku-5.5`) |
| `PIXABAY_API_KEY` | 스톡 영상 **검색 결과 수** 조회용 (다운로드 없음). 없으면 배지가 "소싱 미확인" |
| `STOCK_ENOUGH_HITS` | 이 건수 이상이면 스톡 충분으로 판단(기본 100). Pixabay 결과 수는 500에서 잘려서 거친 신호입니다 |
| `RATE_LIMIT_PER_10MIN`, `DAILY_LLM_LIMIT` | 남용 방지 한도 |

키는 서버(API 라우트)에서만 사용하며 브라우저로 내려가지 않습니다. Hugging Face 토큰은 이 모듈에서 쓰지 않습니다(영상 생성 단계 전용).

## 다음 단계로 넘기는 JSON

명세: [`docs/HANDOFF_SPEC.md`](docs/HANDOFF_SPEC.md) (현재 `schemaVersion: "3.0"`). 타입 정의는 [`src/lib/schemas.ts`](src/lib/schemas.ts)의 `Handoff`입니다. 필드를 바꾸면 `schemaVersion`을 올리세요.

## 구조

```
src/app/studio.tsx        화면 전체(3단계 + 상태 저장)
src/app/api/candidates    주제 후보 생성 + 스톡 탐침
src/app/api/concept       컨셉 카드 생성 + 주제 단위 스톡 탐침
src/lib/llm.ts            OpenRouter 구조화 출력 호출(검증·재시도)
src/lib/pixabay.ts        Pixabay 영상 검색 결과 수 조회(캐시)
src/lib/prompts.ts        프롬프트
src/lib/schemas.ts        요청/응답/인계 스키마
docs/HANDOFF_SPEC.md      인계 JSON 명세
```
