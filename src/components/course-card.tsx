import Link from "next/link";
import { Arrow } from "@/components/ui";
import { CourseArt } from "@/components/course-art";
import { duration, rupees } from "@/lib/format";
import { priceOf, type CatalogCourse } from "@/lib/catalog";

export function CourseCard({ course }: { course: CatalogCourse }) {
  const price = priceOf(course.product);
  const onSale = course.product?.sale_price_paise != null && course.product.sale_price_paise < course.product.price_paise;
  const tag = course.exam.code.split("_")[0];
  return (
    <Link href={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-paper transition-[box-shadow,transform,border-color] duration-300 ease-[var(--ease-apple)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift">
      <CourseArt title={course.title} slug={course.slug} tag={tag} className="aspect-[16/9]" />
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold text-ink-3">{tag} <span className="px-1">·</span> {course.exam.name}</p>
        <h3 className="mt-2 text-lg font-bold leading-snug tracking-tight">{course.title}</h3>
        {course.subtitle && <p className="mt-1 line-clamp-2 text-sm text-ink-3">{course.subtitle}</p>}
        <p className="mt-4 flex items-center gap-4 text-xs text-ink-3">
          <span>{course.stats?.lecture_count ?? 0} lectures</span>
          <span>{duration(course.stats?.total_duration_seconds)}</span>
          {(course.stats?.free_preview_count ?? 0) > 0 && <span className="font-semibold text-violet-600">Free preview</span>}
        </p>
        <div className="mt-auto flex items-center justify-between pt-5">
          <p className="text-lg font-bold">
            {price == null ? "—" : rupees(price)}
            {onSale && <span className="ml-2 text-xs font-normal text-ink-3 line-through">{rupees(course.product!.price_paise)}</span>}
          </p>
          <span className="flex items-center gap-1.5 text-sm font-semibold">View course <Arrow className="transition-transform group-hover:translate-x-0.5" /></span>
        </div>
      </div>
    </Link>
  );
}
