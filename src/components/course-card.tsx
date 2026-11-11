import Link from "next/link";
import { Badge } from "@/components/ui";
import { duration, rupees } from "@/lib/format";
import { priceOf, type CatalogCourse } from "@/lib/catalog";

export function CourseCard({ course }: { course: CatalogCourse }) {
  const price = priceOf(course.product);
  const onSale = course.product?.sale_price_paise != null && course.product.sale_price_paise < course.product.price_paise;
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper transition-[box-shadow,transform] duration-300 ease-[var(--ease-apple)] hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="glow-violet flex aspect-[16/9] items-end bg-violet-50 p-5">
        <span className="text-4xl font-semibold tracking-tight text-grade line-clamp-2">{course.title}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2"><Badge tone="violet">{course.exam.name}</Badge></div>
        <h3 className="mt-3 text-lg font-semibold tracking-tight">{course.title}</h3>
        {course.subtitle && <p className="mt-1 line-clamp-2 text-sm text-ink-3">{course.subtitle}</p>}
        <div className="mt-auto flex items-end justify-between pt-5 text-sm text-ink-3">
          <span>
            {course.stats?.lecture_count ?? 0} lectures · {duration(course.stats?.total_duration_seconds)}
          </span>
          <span className="text-right">
            {onSale && <span className="mr-2 text-xs line-through">{rupees(course.product!.price_paise)}</span>}
            <span className="text-base font-semibold text-ink">{price == null ? "—" : rupees(price)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
