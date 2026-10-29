/**
 * 사용자에게 보이는 글에 업계 용어가 남아 있으면 쉬운 말로 바꾼다.
 * 프롬프트로 막아도 AI가 가끔 용어를 쓰기 때문에 마지막 안전장치로 둔다.
 * 바꾼 말 뒤의 조사(이/가, 은/는, 을/를, 과/와, 으로/로)는 받침에 맞게 고친다.
 */
const PARTICLES = "이|가|은|는|을|를|과|와|으로|로";

const RULES: [RegExp, string][] = [
  [new RegExp(`(?:무료\\s*)?스톡\\s*(?:영상|비디오|푸티지|클립)(${PARTICLES})?`, "g"), "무료 영상"],
  [new RegExp(`(?:무료\\s*)?스톡\\s*(?:자료|소스|사이트|이미지)(${PARTICLES})?`, "g"), "무료 영상 자료"],
  [new RegExp(`(?:무료\\s*)?스톡(${PARTICLES})?`, "g"), "무료 영상"],
  [new RegExp(`소싱(${PARTICLES})?`, "g"), "자료 구하기"],
  [new RegExp(`레퍼런스(?:\\s*영상)?(${PARTICLES})?`, "g"), "참고 영상"],
];

function attach(word: string, particle: string | undefined): string {
  if (!particle) return word;
  const code = word.charCodeAt(word.length - 1);
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  const jong = isHangul ? (code - 0xac00) % 28 : 0;
  const hasBatchim = jong !== 0;
  switch (particle) {
    case "이":
    case "가":
      return word + (hasBatchim ? "이" : "가");
    case "은":
    case "는":
      return word + (hasBatchim ? "은" : "는");
    case "을":
    case "를":
      return word + (hasBatchim ? "을" : "를");
    case "과":
    case "와":
      return word + (hasBatchim ? "과" : "와");
    case "으로":
    case "로":
      return word + (hasBatchim && jong !== 8 ? "으로" : "로");
    default:
      return word + particle;
  }
}

export function plainify(text: string): string {
  return RULES.reduce((acc, [re, to]) => acc.replace(re, (_m, p?: string) => attach(to, p)), text);
}
