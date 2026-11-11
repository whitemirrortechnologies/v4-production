-- =============================================================================
-- PERMANENTLY delete GATE and everything under it from an existing V4 database.
-- THIS CANNOT BE UNDONE. To only hide GATE instead, use Admin → Exams → Hide from students.
-- Run in Supabase → SQL Editor. Runs in one transaction: any error rolls it all back.
--
-- Deletes: GATE exam, its syllabus sections/topics, courses (+ subjects, modules, chapters,
-- lectures, progress, doubts), tests (+ sections, attempts, responses), test series,
-- questions (+ options, keys, bookmarks, reports, practice answers), and the products,
-- orders, enrollments and coupon redemptions that point at them.
-- Video/notes files in Storage are NOT removed here (see the last step).
-- =============================================================================
begin;

create temp table _gate on commit drop as
  select id from public.exams where code like 'GATE%';

-- commerce first (products reference courses / series)
delete from public.coupon_redemptions where order_id in (
  select o.id from public.orders o join public.products p on p.id = o.product_id
   where p.course_id in (select id from public.courses where exam_id in (select id from _gate))
      or p.test_series_id in (select id from public.test_series where exam_id in (select id from _gate)));
delete from public.orders where product_id in (
  select id from public.products
   where course_id in (select id from public.courses where exam_id in (select id from _gate))
      or test_series_id in (select id from public.test_series where exam_id in (select id from _gate)));
delete from public.products
 where course_id in (select id from public.courses where exam_id in (select id from _gate))
    or test_series_id in (select id from public.test_series where exam_id in (select id from _gate));

-- tests and everything that references questions
delete from public.tests where exam_id in (select id from _gate);
-- a test of another exam may still include a GATE question: take it out of that test
delete from public.test_questions where question_id in (select id from public.questions where exam_id in (select id from _gate));
delete from public.test_series where exam_id in (select id from _gate);
delete from public.practice_sessions where exam_id in (select id from _gate);
delete from public.questions where exam_id in (select id from _gate);
delete from public.question_groups where exam_id in (select id from _gate);

-- courses cascade to subjects, modules, chapters, lectures, progress, doubts
delete from public.courses where exam_id in (select id from _gate);

-- syllabus, students' target exam, and finally the exam itself
update public.profiles set target_exam_id = (select id from public.exams where code = 'CAT')
 where target_exam_id in (select id from _gate);
delete from public.exams where id in (select id from _gate);

commit;

-- Check: should list CAT only.
select code, name from public.exams;

-- Optional clean-up of orphaned files: Supabase → Storage → lecture-videos / lecture-notes →
-- delete the folders of lectures that no longer exist.
