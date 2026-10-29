# 인계 JSON 명세 (컨셉 카드 → 다음 단계)

STEP 0(첫 영상 컨셉 잡기)이 다음 단계로 넘기는 데이터 계약입니다.

**이 단계가 정하는 것은 "주제"와 "콘텐츠 방향"까지입니다.** 장면 구성, 대사, 나레이션, 자막, 영상 소스 검색과 선택은 다음 단계에서 구체화하므로 이 JSON에 없습니다.

- **버전**: `schemaVersion: "3.0"`
- **정의 위치**: [`src/lib/schemas.ts`](../src/lib/schemas.ts)의 `Handoff` 타입. 이 문서와 어긋나면 코드가 기준입니다.
- **생성 위치**: `POST /api/concept` 응답의 `concept` 필드, 화면의 "JSON 복사/다운로드"
- **형식**: UTF-8 JSON, 한 번에 컨셉 카드 1개

## 1. 호환성 규칙

| 변경 | 버전 | 예 |
|---|---|---|
| 필드 추가 (모르는 쪽이 무시해도 됨) | minor (`3.1`) | 새 필드 `targetPlatformNotes` |
| 필드 삭제·이름 변경·의미 변경·열거값 추가/삭제 | major (`4.0`) | `recommendedLength`에 90 추가 |

- 받는 쪽은 **모르는 필드를 무시**해야 합니다.
- 받는 쪽은 `schemaVersion`의 major가 자기가 아는 값과 다르면 **처리를 거부**하고 사용자에게 알려야 합니다.

### 변경 이력

| 버전 | 변경 |
|---|---|
| 3.0 | 길이는 제작 단계에서 바뀔 수 있어 사용자가 고르지 않게 함. `length`(확정값) 삭제, `recommendedLength`(추천값)·`lengthReason` 추가 |
| 2.0 | 영상 구성은 다음 단계 몫이므로 `scenes`, `hook`, `aiDisclosureLikely` 삭제. 주제 단위의 `sourcingOutlook` 추가 |
| 1.0 | (미배포) 장면 단위 구성 포함 초안 |

## 2. 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `schemaVersion` | `"3.0"` | 명세 버전 |
| `createdAt` | string (ISO 8601, UTC) | 생성 시각 |
| `channelConcept` | string | 채널 한 줄 컨셉 |
| `topic` | string | 사용자가 고른 주제를 한 줄로 다듬은 것. 레퍼런스 탐색의 기본 주제 |
| `audience` | string | 주 시청자 |
| `tone` | string | 영상의 말투·분위기 **방향** (실제 대사 아님) |
| `recommendedLength` | `30 \| 45 \| 60` | AI가 추천하는 영상 길이(초). **사용자가 고른 값이 아니며**, 다음 단계가 제작 중에 바꿔도 됨. **열거형**, 다른 값은 오지 않음 |
| `lengthReason` | string | 그 길이를 추천한 이유 한 문장 |
| `visualStyle` | string | 영상 전체의 시각적 분위기 **방향** (색감·질감·느낌) |
| `firstVideoIdeas` | string[] (최대 3) | 이 채널에서 처음 올리기 좋은 영상 아이디어(제목 형태). 첫 번째가 이번에 만들 영상의 후보 |
| `difficulty` | object | 아래 참조 |
| `referenceKeywordsEn` | string[] (3~5) | 유튜브 레퍼런스 탐색용 키워드. 영어 위주, 한국어가 섞일 수 있음 |
| `sourcingOutlook` | object | 아래 참조 |

### `difficulty`

| 필드 | 타입 | 설명 |
|---|---|---|
| `level` | `"쉬움" \| "보통" \| "도전"` | 초심자 기준 난이도 (열거형) |
| `note` | string | 이유와 첫 영상에서의 팁 |

### `sourcingOutlook`

이 주제를 **무료 스톡 영상으로 만들기 쉬운지** 가늠하는 주제 단위 신호입니다. 장면별 판단은 다음 단계가 합니다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `level` | `"stock" \| "mixed" \| "ai" \| "unknown"` | `stock` 스톡으로 충분 / `mixed` 일부는 AI 생성 필요 / `ai` AI 생성 위주 / `unknown` 조회 불가 |
| `stockCoverage` | number (0~1) \| null | 대표 키워드 중 Pixabay 결과가 충분한 비율. 조회 불가 시 `null` |
| `stockKeywordsEn` | string[] (최대 3) | 위 판단에 쓴 대표 영어 키워드. 스톡 검색의 출발점으로 재사용 가능 |

- `level` 기준: `stockCoverage >= 0.66` → `stock`, `>= 0.33` → `mixed`, 그 미만 → `ai`.
- "충분함"은 검색 결과 수가 `STOCK_ENOUGH_HITS`(기본 100) 이상일 때입니다.
- **거친 신호입니다.** Pixabay `totalHits`는 500에서 잘리고 임의의 단어 조합도 많이 잡힙니다. "건수가 많다 = 맞는 영상이 있다"는 보장이 아니므로, 다음 단계가 실제 결과를 확인해야 합니다. 강제가 아니라 힌트입니다.

## 3. 보장되는 것 / 보장되지 않는 것

**보장**
- 위 필드는 모두 존재하고 타입이 맞음 (서버가 스키마로 검증하고, 실패하면 재시도)
- `recommendedLength`, `difficulty.level`, `sourcingOutlook.level`은 정의된 열거값만 사용
- `firstVideoIdeas`는 3개 이하, `referenceKeywordsEn`은 5개 이하

**보장되지 않음**
- 문자열 필드의 형식·길이·문체 (LLM이 생성한 자연어)
- `referenceKeywordsEn`이 순수 영어라는 것
- `firstVideoIdeas`가 그대로 업로드 제목으로 쓸 만하다는 것

## 4. 예시

실제 생성 결과입니다.

```json
{
  "schemaVersion": "3.0",
  "createdAt": "2026-10-29T02:28:21.464Z",
  "channelConcept": "10분 안에 끝나는 초간단 한 그릇 요리를 알려주는 채널",
  "topic": "자취생을 위한 10분 간단 한 그릇 요리",
  "audience": "요리 경험이 적고 시간이 부족한 1인 가구 및 자취 입문자",
  "tone": "친근하고 담백한 조언자 톤으로, 짧고 명확하게 핵심만 전달하는 분위기",
  "recommendedLength": 30,
  "lengthReason": "한 가지 요리만 보여주면 되는 내용이라 30초면 충분하고, 처음에는 짧게 끝까지 완성하기 쉬워요.",
  "visualStyle": "따뜻한 주방 조명과 자연광이 어우러진 실사 위주의 밝고 깔끔한 질감, 음식 클로즈업 중심",
  "firstVideoIdeas": [
    "10분 볶음밥, 냉장고 재료로 끝내기",
    "프라이팬 달걀 요리 3가지 입문편",
    "라면 말고 한 그릇 인스턴트 누들 레시피"
  ],
  "difficulty": {
    "level": "쉬움",
    "note": "음식과 주방 장면은 스톡 영상으로 풍부하게 구할 수 있어 제작이 수월합니다. ..."
  },
  "referenceKeywordsEn": [
    "10 minute cooking",
    "easy fried rice recipe shorts",
    "egg pan recipe for beginners",
    "one bowl instant noodle hack",
    "quick meals for one"
  ],
  "sourcingOutlook": {
    "level": "stock",
    "stockCoverage": 1,
    "stockKeywordsEn": ["fried rice", "cooking egg pan", "instant noodles bowl"]
  }
}
```

## 5. 다음 단계에서 쓰는 방법 (제안)

| 다음 단계 | 쓰는 필드 |
|---|---|
| 레퍼런스 탐색 | `topic`, `referenceKeywordsEn`, `audience` |
| 영상 구성·대사 작성 | `channelConcept`, `topic`, `audience`, `tone`, `firstVideoIdeas[0]`, `recommendedLength`(시작 기본값) |
| 자료 수집 | `visualStyle`, `sourcingOutlook` (스톡 우선으로 갈지, AI 생성 비중을 높일지의 시작점) |

## 6. 팀과 확정이 필요한 항목

1. 클립 길이 등 영상 생성 모델의 제약은 다음 단계의 입력이므로, 이 JSON에는 담지 않았습니다. 필요한 값이 있으면 알려주세요.
2. 전달 방식: 현재는 화면의 복사/다운로드와 `/api/concept` 응답입니다. 같은 서버에서 직접 호출할지, 파일로 넘길지 정해야 합니다.
3. `firstVideoIdeas`의 몇 번째를 "이번에 만들 영상"으로 지정할지(현재는 첫 번째 관례)를 필드로 분리할지 여부.
