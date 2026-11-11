-- =============================================================================
-- Hide GATE everywhere on an existing V4 database (CAT-only platform).
-- Run once in Supabase → SQL Editor. Reversible: nothing is deleted.
--   * the GATE exam disappears from the site, menus, practice and tests pages
--   * GATE courses, tests and test series are archived (hidden from students)
--   * GATE questions are archived (excluded from practice)
-- Students who already bought a GATE course keep their purchase records.
-- =============================================================================
begin;

update public.exams set is_active = false
 where code like 'GATE%';

update public.courses set status = 'archived'
 where exam_id in (select id from public.exams where code like 'GATE%');

update public.tests set status = 'archived'
 where exam_id in (select id from public.exams where code like 'GATE%');

update public.test_series set status = 'archived'
 where exam_id in (select id from public.exams where code like 'GATE%');

update public.questions set status = 'archived'
 where exam_id in (select id from public.exams where code like 'GATE%');

update public.profiles set target_exam_id = (select id from public.exams where code = 'CAT')
 where target_exam_id in (select id from public.exams where code like 'GATE%');

commit;

-- Check: should return only CAT.
select code, name from public.exams where is_active;

-- To undo:
--   update public.exams set is_active = true where code like 'GATE%';
--   (then re-publish the courses/tests/questions you want from the admin console)
