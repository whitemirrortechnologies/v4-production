const SKIP = new Set(["for", "of", "the", "and", "to", "in", "a", "an", "with", "essentials", "complete", "course", "core", "basics", "fundamentals", "masterclass", "cat"]);

/** Short label for course art: "Quant: Arithmetic Core" → "QA", "Reading Comprehension" → "RC". */
export function courseCode(title: string): string {
  const words = title.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const keep = words.filter((w) => !SKIP.has(w.toLowerCase()));
  const base = keep.length ? keep : words;
  if (base.length >= 2) return base.slice(0, 4).map((w) => w[0]).join("").toUpperCase();
  return (base[0] ?? "V4").slice(0, 4).toUpperCase();
}
