import type { QuestionType } from "@/lib/types";

/** Default marking. CAT: MCQ +3/−1, TITA +3/0. Other exams: +marks, −1/3 for a wrong MCQ. */
export function defaultMarking(examCode: string, type: QuestionType, marks?: number) {
  if (examCode.toUpperCase().startsWith("CAT")) return { marks: 3, negative: type === "mcq" ? 1 : 0 };
  const m = marks && marks > 0 ? marks : 1;
  return { marks: m, negative: type === "mcq" ? Math.round((m / 3) * 100) / 100 : 0 };
}

export const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: "MCQ · single correct", msq: "MSQ · multiple correct", nat: "NAT · numerical", tita: "TITA · type in answer",
};
export const TYPE_SHORT: Record<QuestionType, string> = { mcq: "MCQ", msq: "MSQ", nat: "NAT", tita: "TITA" };
