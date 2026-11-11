import type { QuestionType } from "@/lib/types";

/** Official default marking: GATE MCQ −1/3 or −2/3, CAT MCQ +3/−1, MSQ/NAT/TITA no negatives. */
export function defaultMarking(examCode: string, type: QuestionType, marks?: number) {
  const cat = examCode.toUpperCase().startsWith("CAT");
  if (cat) return { marks: 3, negative: type === "mcq" ? 1 : 0 };
  const m = marks === 2 ? 2 : 1;
  return { marks: m, negative: type === "mcq" ? (m === 2 ? 0.67 : 0.33) : 0 };
}

export const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: "MCQ · single correct", msq: "MSQ · multiple correct", nat: "NAT · numerical", tita: "TITA · type in answer",
};
export const TYPE_SHORT: Record<QuestionType, string> = { mcq: "MCQ", msq: "MSQ", nat: "NAT", tita: "TITA" };
