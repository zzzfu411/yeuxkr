import type { Question } from "./quiz.ts";
import type { SrsCard, SrsState } from "./srs.ts";

export interface MistakeInsight {
  id: string;
  itemId: string;
  prompt: string;
  answer: string;
  correct: number;
  wrong: number;
  box: number;
  dueAt: number;
  lastSeenAt: number | null;
  due: boolean;
  sourceLabel: string;
  statusLabel: string;
  severity: number;
}

export interface MistakeSummary {
  total: number;
  due: number;
  repeated: number;
  stabilizing: number;
  mastered: number;
}

export function buildMistakeInsights(state: SrsState, now = Date.now()): MistakeInsight[] {
  return Object.values(state.cards)
    .filter((card) => card.payload.kind === "mistake" && Boolean(card.payload.prompt && card.payload.answer))
    .map((card) => buildMistakeInsight(card, now))
    .sort((a, b) => {
      return Number(b.due) - Number(a.due) ||
        b.severity - a.severity ||
        b.wrong - a.wrong ||
        a.dueAt - b.dueAt ||
        a.id.localeCompare(b.id);
    });
}

export function summarizeMistakes(state: SrsState, now = Date.now()): MistakeSummary {
  const insights = buildMistakeInsights(state, now);
  return {
    total: insights.length,
    due: insights.filter((item) => item.due).length,
    repeated: insights.filter((item) => item.wrong >= 2).length,
    stabilizing: insights.filter((item) => item.box > 0 && item.box < 5).length,
    mastered: insights.filter((item) => item.box >= 5 && item.correct >= item.wrong).length
  };
}

export function buildRetrainQuestions(state: SrsState, ids: string[] | null = null, limit = 8): Question[] {
  const wanted = ids ? new Set(ids) : null;
  return buildMistakeInsights(state)
    .filter((insight) => (wanted ? wanted.has(insight.id) : true))
    .slice(0, Math.max(1, limit))
    .map((insight): Question | null => {
      const payload = state.cards[insight.id]?.payload;
      if (!payload?.prompt || !payload.answer) return null;
      return {
        id: insight.id,
        type: payload.type ?? "type",
        prompt: payload.prompt,
        answer: payload.answer,
        acceptable: payload.acceptable,
        choices: payload.choices,
        explain: payload.explain ?? "这是之前答错过的题，重新做对后会按间隔延后复习。",
        speak: payload.speak,
        clozeText: payload.clozeText,
        hint: payload.hint
      } satisfies Question;
    })
    .filter((question): question is Question => Boolean(question));
}

function buildMistakeInsight(card: SrsCard, now: number): MistakeInsight {
  const due = card.dueAt <= now;
  const severity = card.wrong * 4 + (due ? 3 : 0) - card.correct - card.box;
  return {
    id: card.id,
    itemId: card.payload.itemId,
    prompt: card.payload.prompt ?? "",
    answer: card.payload.answer ?? "",
    correct: card.correct,
    wrong: card.wrong,
    box: card.box,
    dueAt: card.dueAt,
    lastSeenAt: card.lastSeenAt,
    due,
    sourceLabel: sourceLabelForItem(card.payload.itemId),
    statusLabel: statusLabelForCard(card, due),
    severity
  };
}

function statusLabelForCard(card: SrsCard, due: boolean) {
  if (due) return "现在该处理";
  if (card.box >= 5 && card.correct >= card.wrong) return "基本稳住";
  if (card.wrong >= 2 && card.wrong > card.correct) return "反复出错";
  return "巩固中";
}

function sourceLabelForItem(itemId: string) {
  if (itemId.startsWith("hq:")) return "韩文结构";
  if (itemId.startsWith("pq:")) return "发音辨析";
  if (itemId.startsWith("vq:")) return "词汇题";
  if (itemId.startsWith("gq:")) return "语法题";
  if (itemId.startsWith("nq:")) return "自然表达";
  if (itemId.startsWith("mq:")) return "情境听读";
  if (itemId.startsWith("oq:")) return "输出改写";
  if (itemId.startsWith("scq:")) return "音变辨析";
  if (itemId.startsWith("lesson:")) return "课程练习";
  if (itemId.startsWith("progress:")) return "综合测验";
  if (itemId.startsWith("native:")) return "自然表达";
  if (itemId.startsWith("material:")) return "情境听读";
  if (itemId.startsWith("output:")) return "输出改写";
  if (itemId.startsWith("hangul:")) return "韩文结构";
  if (itemId.startsWith("pronunciation:")) return "发音辨析";
  if (itemId.startsWith("soundChange:")) return "音变辨析";
  return "错题回收";
}
