import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { memo } from "react";
import clsx from "clsx";
import "katex/dist/katex.min.css";

/**
 * Markdown + LaTeX ($inline$ and $$block$$). Raw HTML is never rendered, so content is safe.
 */
export const Rich = memo(function Rich({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text) return null;
  return (
    <div className={clsx("rich", className)}>
      <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{text}</Markdown>
    </div>
  );
});
