const SKIP = new Set(["for", "of", "the", "and", "to", "in", "a", "an", "with", "essentials", "complete", "course", "core", "basics", "fundamentals", "masterclass", "gate", "cat", "cs", "it"]);

/** Short label for course art: "Operating Systems Essentials" → "OS", "Algorithms for GATE CS" → "ALGO". */
export function courseCode(title: string): string {
  const words = title.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const keep = words.filter((w) => !SKIP.has(w.toLowerCase()));
  const base = keep.length ? keep : words;
  if (base.length >= 2) return base.slice(0, 4).map((w) => w[0]).join("").toUpperCase();
  return (base[0] ?? "V4").slice(0, 4).toUpperCase();
}
