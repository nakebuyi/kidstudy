import { prisma } from "./prisma";
import { getChinaDateStr } from "./checkin-date";
import type { Subject } from "@/types";

export const VALID_SUBJECTS: Subject[] = [
  "literacy",
  "pinyin",
  "english",
  "math",
  "poetry",
];

export interface QuizAnswerInput {
  childId: string;
  subject: string;
  charId: string;
  correct: boolean;
}

/**
 * 记录一次测试题作答结果（对/错）。
 * 日期默认用北京时间（与打卡日期一致），由服务端计算。
 */
export async function recordQuizAnswer(
  input: QuizAnswerInput,
  date: string = getChinaDateStr()
) {
  return prisma.learningRecord.create({
    data: {
      childId: input.childId,
      subject: input.subject,
      charId: input.charId,
      type: "test",
      score: input.correct ? 1 : 0,
      accuracy: input.correct ? 100 : 0,
      date,
    },
  });
}

/** 提取内容项的展示题目文本（按科目）。 */
export function getItemPrompt(subject: string, data: any): string {
  switch (subject) {
    case "literacy":
      return data?.char ?? "";
    case "pinyin":
      return data?.pinyin ?? "";
    case "english":
      return data?.word ?? "";
    case "math":
      return data?.question ?? "";
    case "poetry":
      return data?.title ?? "";
    default:
      return data?.id ?? "";
  }
}

/** 提取正确答案文本；poetry 填空字运行时随机，无法恢复 → undefined。 */
export function getCorrectAnswer(
  subject: string,
  data: any
): string | undefined {
  switch (subject) {
    case "literacy":
      return data?.char;
    case "pinyin":
      return data?.pinyin;
    case "english":
      return data?.word;
    case "math":
      return String(data?.answer);
    default:
      return undefined;
  }
}

/**
 * 查询某科目某日的答题结果。
 * 记录按 charId 去重（保留最新），升序返回，join LearningContent 取题目/答案。
 */
export async function getSubjectResults(
  childId: string,
  subject: string,
  date: string
) {
  const records = await prisma.learningRecord.findMany({
    where: { childId, subject, date },
    orderBy: { createdAt: "asc" },
  });

  // 按 charId 去重：中途重做时保留最新一次作答
  const latestByCharId = new Map<string, (typeof records)[number]>();
  for (const r of records) latestByCharId.set(r.charId, r);
  const deduped = [...latestByCharId.values()].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  const ids = [...new Set(deduped.map((r) => r.charId))];
  const contents = await prisma.learningContent.findMany({
    where: { id: { in: ids } },
  });
  const contentMap = new Map(contents.map((c) => [c.id, JSON.parse(c.data) as any]));

  const items = deduped.map((r) => {
    const data = contentMap.get(r.charId);
    return {
      id: r.id,
      charId: r.charId,
      correct: r.score === 1,
      prompt: data ? getItemPrompt(subject, data) : r.charId,
      correctAnswer: data ? getCorrectAnswer(subject, data) : undefined,
      answeredAt: r.createdAt,
    };
  });

  return {
    subject,
    date,
    total: items.length,
    correctCount: items.filter((i) => i.correct).length,
    items,
  };
}
