import Image from "next/image";
import clsx from "clsx";

/**
 * The V4 "Learning Simplified" logo.
 * - default: the emblem only (works on light and dark surfaces)
 * - `full`: emblem + tagline (its tagline is white, so use it on dark surfaces only)
 * Size it with a height class, e.g. className="h-11".
 */
export function Logo({ name = "V4", full, className }: { name?: string; full?: boolean; className?: string; light?: boolean }) {
  return full
    ? <Image src="/logo-full.png" alt={`${name}: Learning Simplified`} width={800} height={680} priority className={clsx("h-28 w-auto select-none", className)} />
    : <Image src="/logo-mark.png" alt={name} width={560} height={439} priority className={clsx("h-11 w-auto select-none", className)} />;
}
