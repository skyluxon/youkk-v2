"use client";

import { useCallback, useEffect, useState } from "react";
import type { Candidate, Handoff, Profile } from "@/lib/schemas";

// 인계 JSON 구조가 바뀌면(스키마 major) 이전에 저장된 상태가 깨지지 않도록 키를 올린다.
const STORAGE_KEY = "youkk-v2-state-v3";
const MAX_ROUNDS = 3;

const INTERESTS = ["요리·음식", "여행", "운동·건강", "공부·자기계발", "재테크", "반려동물", "게임", "패션·뷰티", "IT·테크", "취미·DIY", "일상·감성", "자연·풍경"];
const TONES = ["차분한", "유쾌한", "감성적", "정보 전달", "몰입감 있는"];
type Stage = "intro" | "profile" | "candidates" | "concept";
type Reaction = "up" | "down";

type State = {
  stage: Stage;
  profile: Profile;
  candidates: Candidate[];
  reactions: Record<string, Reaction>;
  shownTitles: string[];
  rounds: number;
  chosen: Candidate | null;
  handoff: Handoff | null;
};

const EMPTY_PROFILE: Profile = { interests: [], interestsExtra: "", strengths: "", tones: [] };
const INITIAL: State = {
  stage: "intro",
  profile: EMPTY_PROFILE,
  candidates: [],
  reactions: {},
  shownTitles: [],
  rounds: 0,
  chosen: null,
  handoff: null,
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? "요청에 실패했어요.");
  return json as T;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
        active
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-stone-300 bg-white text-stone-700 hover:border-indigo-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
      }`}
    >
      {children}
    </button>
  );
}

const btnPrimary =
  "rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
const btnGhost =
  "rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800";
const card = "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900";
const input =
  "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-stone-700 dark:bg-stone-900";

const STEPS: { stage: Stage; label: string }[] = [
  { stage: "profile", label: "나 알아보기" },
  { stage: "candidates", label: "주제 고르기" },
  { stage: "concept", label: "컨셉 카드" },
];

export function Studio() {
  const [s, setS] = useState<State>(INITIAL);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [tweak, setTweak] = useState("");
  const [copied, setCopied] = useState(false);

  // 저장된 진행 상태 복원. 브라우저 저장소가 막혀 있어도 동작해야 한다.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // 마운트 후 복원해야 서버 렌더와 어긋나지 않는다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setS({ ...INITIAL, ...(JSON.parse(raw) as State) });
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {}
  }, [s, loaded]);

  const patch = useCallback((p: Partial<State>) => setS((prev) => ({ ...prev, ...p })), []);
  const go = (stage: Stage) => {
    setError(null);
    patch({ stage });
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했어요.");
    } finally {
      setBusy(null);
    }
  };

  const fetchCandidates = (base: State, fresh: boolean) =>
    run("주제 후보를 찾고 있어요", async () => {
      const titleOf = (id: string) => base.candidates.find((c) => c.id === id)?.title ?? "";
      const liked = Object.entries(base.reactions).filter(([, r]) => r === "up").map(([id]) => titleOf(id));
      const disliked = Object.entries(base.reactions).filter(([, r]) => r === "down").map(([id]) => titleOf(id));
      const res = await post<{ candidates: Candidate[]; demo: boolean }>("/api/candidates", {
        profile: base.profile,
        liked: fresh ? [] : liked,
        disliked: fresh ? [] : disliked,
        exclude: fresh ? [] : base.shownTitles,
      });
      setDemo(res.demo);
      setS((prev) => ({
        ...prev,
        stage: "candidates",
        candidates: res.candidates,
        reactions: {},
        shownTitles: [...(fresh ? [] : base.shownTitles), ...res.candidates.map((c) => c.title)],
        rounds: fresh ? 1 : base.rounds + 1,
        chosen: null,
        handoff: null,
      }));
    });

  const makeConcept = (base: State, tweakText?: string) =>
    run("컨셉 카드를 만들고 있어요", async () => {
      if (!base.chosen) return;
      const c = base.chosen;
      const res = await post<{ concept: Handoff; demo: boolean }>("/api/concept", {
        profile: base.profile,
        candidate: { title: c.title, hook: c.hook, audience: c.audience, firstIdeas: c.firstIdeas, stockKeywordsEn: c.stockKeywordsEn },
        tweak: tweakText || undefined,
        previous: tweakText && base.handoff ? JSON.stringify(base.handoff).slice(0, 12000) : undefined,
      });
      setDemo(res.demo);
      setTweak("");
      patch({ stage: "concept", handoff: res.concept });
    });

  const reset = () => {
    setError(null);
    setTweak("");
    setS(INITIAL);
  };

  const react = (id: string, r: Reaction) =>
    setS((prev) => {
      const next = { ...prev.reactions };
      if (next[id] === r) delete next[id];
      else next[id] = r;
      return { ...prev, reactions: next };
    });

  const stageIndex = STEPS.findIndex((x) => x.stage === s.stage);
  const profileValid = s.profile.interests.length > 0;

  if (!loaded) return null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:px-6">
      <header className="mb-6">
        <p className="text-xs font-semibold tracking-wide text-indigo-600">STEP 0 · 첫 영상 컨셉 잡기</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">뭘 만들지 몰라도 괜찮아요</h1>
      </header>

      {demo && (
        <div role="status" className="mb-4 rounded-xl bg-amber-100 px-4 py-2.5 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          데모 모드예요. 지금 보이는 결과는 실제 AI가 만든 것이 아니라 예시 데이터입니다.
        </div>
      )}

      {s.stage !== "intro" && (
        <nav aria-label="진행 단계" className="mb-6 flex flex-wrap gap-2">
          {STEPS.map((step, i) => {
            const reachable = i < stageIndex;
            return (
              <button
                key={step.stage}
                disabled={!reachable || !!busy}
                onClick={() => go(step.stage)}
                aria-current={i === stageIndex ? "step" : undefined}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  i === stageIndex
                    ? "bg-indigo-600 text-white"
                    : reachable
                      ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-200"
                      : "bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-500"
                }`}
              >
                {i + 1}. {step.label}
              </button>
            );
          })}
        </nav>
      )}

      {error && (
        <div role="alert" className="mb-4 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}
      {busy && (
        <div role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          {busy}…
        </div>
      )}

      {s.stage === "intro" && (
        <section className={card}>
          <p className="text-base leading-relaxed">
            몇 가지 질문에 답하면, 나에게 맞는 숏폼 주제 후보를 보여드려요. 마음에 드는 것을 고르면 <b>첫 영상의 컨셉 카드</b>가 완성됩니다. 약 5분이 걸려요.
          </p>
          <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-stone-600 dark:text-stone-400">
            <li>직접 촬영하지 않고, 무료 영상 자료와 AI가 만든 영상으로 만들 수 있는 주제만 추천해요.</li>
            <li>첫 영상에 어울리는 길이도 함께 추천해 드려요.</li>
          </ul>
          <button className={`${btnPrimary} mt-6`} onClick={() => go("profile")}>
            시작하기
          </button>
        </section>
      )}

      {s.stage === "profile" && (
        <section className="space-y-6">
          <div className={card}>
            <h2 className="font-semibold">요즘 관심 있는 것을 골라주세요 <span className="text-xs font-normal text-stone-500">(여러 개 가능)</span></h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {INTERESTS.map((it) => (
                <Chip
                  key={it}
                  active={s.profile.interests.includes(it)}
                  onClick={() =>
                    patch({
                      profile: {
                        ...s.profile,
                        interests: s.profile.interests.includes(it)
                          ? s.profile.interests.filter((x) => x !== it)
                          : [...s.profile.interests, it].slice(0, 8),
                      },
                    })
                  }
                >
                  {it}
                </Chip>
              ))}
            </div>
            <label className="mt-4 block text-sm">
              <span className="text-stone-600 dark:text-stone-400">그 밖에 좋아하는 것 (선택)</span>
              <input
                className={`${input} mt-1`}
                maxLength={200}
                value={s.profile.interestsExtra}
                onChange={(e) => patch({ profile: { ...s.profile, interestsExtra: e.target.value } })}
                placeholder="예: 보드게임, 야구, 빈티지 소품"
              />
            </label>
          </div>

          <div className={card}>
            <label className="block">
              <span className="font-semibold">남들보다 조금 더 잘하거나 경험이 있는 게 있나요? <span className="text-xs font-normal text-stone-500">(선택)</span></span>
              <textarea
                className={`${input} mt-2`}
                rows={2}
                maxLength={300}
                value={s.profile.strengths}
                onChange={(e) => patch({ profile: { ...s.profile, strengths: e.target.value } })}
                placeholder="예: 자취 5년차라 간단한 요리를 잘해요"
              />
            </label>
          </div>

          <div className={`${card} space-y-5`}>
            <fieldset>
              <legend className="font-semibold">끌리는 분위기는? <span className="text-xs font-normal text-stone-500">(선택, 여러 개 가능)</span></legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <Chip
                    key={t}
                    active={s.profile.tones.includes(t)}
                    onClick={() =>
                      patch({
                        profile: {
                          ...s.profile,
                          tones: s.profile.tones.includes(t) ? s.profile.tones.filter((x) => x !== t) : [...s.profile.tones, t].slice(0, 5),
                        },
                      })
                    }
                  >
                    {t}
                  </Chip>
                ))}
              </div>
            </fieldset>
          </div>

          <button className={btnPrimary} disabled={!profileValid || !!busy} onClick={() => fetchCandidates(s, true)}>
            주제 후보 보기
          </button>
          {!profileValid && <p className="text-xs text-stone-500">관심 있는 것을 하나 이상 골라주세요.</p>}
        </section>
      )}

      {s.stage === "candidates" && (
        <section className="space-y-4">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            👍 / 👎 로 반응을 남기면 다음 추천에 반영돼요. 마음에 드는 주제는 &ldquo;이 주제로 정하기&rdquo;를 눌러주세요.
          </p>
          {s.candidates.map((c) => {
            const r = s.reactions[c.id];
            return (
              <article key={c.id} className={`${card} ${r === "down" ? "opacity-50" : ""}`}>
                <h3 className="text-lg font-bold">{c.title}</h3>
                <p className="mt-1 text-sm">{c.hook}</p>
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">💡 {c.whyFit}</p>
                <p className="mt-1 text-xs text-stone-500">시청자: {c.audience}</p>
                <ul className="mt-3 space-y-1 text-sm">
                  {c.firstIdeas.map((idea, i) => (
                    <li key={i} className="flex gap-2"><span className="text-indigo-600">▶</span>{idea}</li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    aria-label="좋아요"
                    aria-pressed={r === "up"}
                    className={`${btnGhost} ${r === "up" ? "!border-indigo-600 !bg-indigo-50 dark:!bg-indigo-950" : ""}`}
                    onClick={() => react(c.id, "up")}
                  >
                    👍
                  </button>
                  <button
                    aria-label="별로예요"
                    aria-pressed={r === "down"}
                    className={`${btnGhost} ${r === "down" ? "!border-red-500 !bg-red-50 dark:!bg-red-950" : ""}`}
                    onClick={() => react(c.id, "down")}
                  >
                    👎
                  </button>
                  <button className={`${btnPrimary} ml-auto`} onClick={() => {
                      patch({ chosen: c });
                      makeConcept({ ...s, chosen: c });
                    }}
                    disabled={!!busy}>
                    이 주제로 정하기
                  </button>
                </div>
              </article>
            );
          })}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              className={btnGhost}
              disabled={!!busy || s.rounds >= MAX_ROUNDS}
              onClick={() => fetchCandidates(s, false)}
            >
              반응 반영해서 다시 추천받기 ({s.rounds}/{MAX_ROUNDS})
            </button>
            {s.rounds >= MAX_ROUNDS && <span className="text-xs text-stone-500">추천은 최대 {MAX_ROUNDS}번까지 받을 수 있어요. 관심사를 바꾸려면 1단계로 돌아가세요.</span>}
          </div>
        </section>
      )}

      {s.stage === "concept" && s.handoff && (
        <ConceptStage
          h={s.handoff}
          tweak={tweak}
          setTweak={setTweak}
          busy={!!busy}
          copied={copied}
          onTweak={() => makeConcept(s, tweak.trim())}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(JSON.stringify(s.handoff, null, 2));
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              setError("복사하지 못했어요. 「파일로 저장하기」를 이용해 주세요.");
            }
          }}
          onReset={reset}
          onPickOther={() => go("candidates")}
        />
      )}
    </main>
  );
}

function ConceptStage(props: {
  h: Handoff;
  tweak: string;
  setTweak: (v: string) => void;
  busy: boolean;
  copied: boolean;
  onTweak: () => void;
  onCopy: () => void;
  onReset: () => void;
  onPickOther: () => void;
}) {
  const { h } = props;

  const download = () => {
    const blob = new Blob([JSON.stringify(h, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "concept-card.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4">
      <article className={`${card} space-y-5`}>
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white">
          <p className="text-xs font-bold text-white/80">📺 채널 컨셉</p>
          <h2 className="mt-1.5 break-keep text-xl font-bold leading-snug">{h.channelConcept}</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoCard emoji="🎯" label="주제" tone="indigo">{h.topic}</InfoCard>
          <InfoCard emoji="👥" label="시청자" tone="sky">{h.audience}</InfoCard>
          <InfoCard emoji="🗣️" label="말투·분위기" tone="rose">{h.tone}</InfoCard>
          <InfoCard emoji="🎨" label="화면 느낌" tone="amber">{h.visualStyle}</InfoCard>
          <InfoCard emoji="⏱️" label="추천 길이" tone="emerald">
            <span className="text-2xl font-extrabold leading-none">{h.recommendedLength}</span>
            <span className="ml-0.5 font-bold">초</span>
            <span className="mt-1.5 block text-stone-600 dark:text-stone-400">{h.lengthReason}</span>
          </InfoCard>
          <InfoCard emoji={LEVEL_STYLE[h.difficulty.level].emoji} label="난이도" tone="violet">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${LEVEL_STYLE[h.difficulty.level].pill}`}>
              {h.difficulty.level}
            </span>
            <span className="mt-1.5 block text-stone-600 dark:text-stone-400">{h.difficulty.note}</span>
          </InfoCard>
        </div>

        <div>
          <p className="text-sm font-bold">💡 첫 영상 아이디어</p>
          <ol className="mt-2 grid gap-3 sm:grid-cols-3">
            {h.firstVideoIdeas.map((x, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <span className="break-keep text-sm font-medium leading-relaxed">{x}</span>
              </li>
            ))}
          </ol>
        </div>
      </article>

      <article className={card}>
        <label className="block text-sm font-semibold" htmlFor="tweak">고치고 싶은 부분이 있나요?</label>
        <textarea
          id="tweak"
          className={`${input} mt-2`}
          rows={2}
          maxLength={400}
          value={props.tweak}
          onChange={(e) => props.setTweak(e.target.value)}
          placeholder="예: 좀 더 유쾌한 분위기로, 시청자를 20대 직장인으로 좁혀줘"
        />
        <button className={`${btnGhost} mt-2`} disabled={props.busy || !props.tweak.trim()} onClick={props.onTweak}>
          이렇게 고쳐줘
        </button>
      </article>

      <div className="flex flex-wrap gap-2">
        <button className={btnPrimary} onClick={props.onCopy}>{props.copied ? "복사했어요 ✓" : "결과 복사하기"}</button>
        <button className={btnGhost} onClick={download}>파일로 저장하기</button>
        <button className={btnGhost} disabled={props.busy} onClick={props.onPickOther}>다른 주제 고르기</button>
        <button className={btnGhost} onClick={props.onReset}>처음부터 다시</button>
      </div>
    </section>
  );
}

const TONE_STYLE = {
  indigo: { box: "bg-indigo-50 dark:bg-indigo-950/40", icon: "bg-indigo-100 dark:bg-indigo-900", label: "text-indigo-700 dark:text-indigo-300" },
  sky: { box: "bg-sky-50 dark:bg-sky-950/40", icon: "bg-sky-100 dark:bg-sky-900", label: "text-sky-700 dark:text-sky-300" },
  rose: { box: "bg-rose-50 dark:bg-rose-950/40", icon: "bg-rose-100 dark:bg-rose-900", label: "text-rose-700 dark:text-rose-300" },
  amber: { box: "bg-amber-50 dark:bg-amber-950/40", icon: "bg-amber-100 dark:bg-amber-900", label: "text-amber-700 dark:text-amber-300" },
  emerald: { box: "bg-emerald-50 dark:bg-emerald-950/40", icon: "bg-emerald-100 dark:bg-emerald-900", label: "text-emerald-700 dark:text-emerald-300" },
  violet: { box: "bg-violet-50 dark:bg-violet-950/40", icon: "bg-violet-100 dark:bg-violet-900", label: "text-violet-700 dark:text-violet-300" },
} as const;

const LEVEL_STYLE = {
  쉬움: { emoji: "🌱", pill: "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100" },
  보통: { emoji: "🌿", pill: "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100" },
  도전: { emoji: "🔥", pill: "bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100" },
} as const;

function InfoCard({
  emoji,
  label,
  tone,
  children,
}: {
  emoji: string;
  label: string;
  tone: keyof typeof TONE_STYLE;
  children: React.ReactNode;
}) {
  const s = TONE_STYLE[tone];
  return (
    <div className={`rounded-2xl p-4 ${s.box}`}>
      <div className="flex items-center gap-2">
        <span aria-hidden className={`flex h-8 w-8 items-center justify-center rounded-full text-base ${s.icon}`}>
          {emoji}
        </span>
        <p className={`text-xs font-bold ${s.label}`}>{label}</p>
      </div>
      <div className="mt-2.5 break-keep text-sm leading-relaxed">{children}</div>
    </div>
  );
}
