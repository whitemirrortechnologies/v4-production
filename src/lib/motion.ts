import type { CSSProperties } from "react";
/** Stagger delay for [data-reveal] elements. */
export const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
