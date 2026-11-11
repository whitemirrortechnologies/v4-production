-- End-to-end checks of RLS, checkout, test engine, practice, doubts and storage rules.
-- Runs against a throwaway local Postgres (see supabase/tests/run.sh). Never on production.
\set ON_ERROR_STOP 1
-- ---------- helpers ----------
create or replace function public.t_as(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p)::text, false) $$;
create or replace function public.t_expect_error(p_sql text, p_like text) returns void language plpgsql as $$
begin
  begin execute p_sql; exception when others then
    if sqlerrm not ilike '%'||p_like||'%' then raise exception 'expected error like "%" but got "%" for: %', p_like, sqlerrm, p_sql; end if;
    raise notice 'ok (blocked): %', sqlerrm; return; end;
  raise exception 'expected error like "%" but statement succeeded: %', p_like, p_sql;
end $$;
grant execute on function public.t_as(uuid), public.t_expect_error(text,text) to anon, authenticated, service_role;

-- ---------- users ----------
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','admin@v4.test','{"full_name":"Admin"}'),
 ('00000000-0000-0000-0000-00000000000f','faculty@v4.test','{"full_name":"Faculty"}'),
 ('00000000-0000-0000-0000-000000000001','s1@v4.test','{"full_name":"Student One"}'),
 ('00000000-0000-0000-0000-000000000002','s2@v4.test','{"full_name":"Student Two"}');
update public.profiles set role='admin' where email='admin@v4.test';
update public.profiles set role='faculty' where email='faculty@v4.test';
do $$ begin assert (select count(*) from public.profiles)=4, 'profiles via trigger'; end $$;

-- ---------- faculty builds content ----------
set role authenticated; select public.t_as('00000000-0000-0000-0000-00000000000f');
begin;
insert into public.courses (id, exam_id, slug, title, status)
  select '11111111-0000-0000-0000-000000000001', id, 'algorithms-gate-cs', 'Algorithms for GATE CS', 'published' from public.exams where code='GATE_CS';
insert into public.course_subjects (id, course_id, title) values ('11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001','Algorithms');
insert into public.course_modules (id, subject_id, title) values ('11111111-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000002','Graphs');
insert into public.course_chapters (id, module_id, title) values ('11111111-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000003','Shortest Paths');
insert into public.lectures (id, chapter_id, title, status, is_free_preview, duration_seconds, video_status, video_path) values
 ('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000004','Intro (free)','published',true,600,'ready','22222222-0000-0000-0000-000000000001/v.mp4'),
 ('22222222-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000004','Dijkstra','published',false,1000,'ready','22222222-0000-0000-0000-000000000002/v.mp4');
-- MCQ
insert into public.questions (id, exam_id, topic_id, type, stem, marks, negative_marks, status, is_pyq, pyq_year, pyq_paper)
  select '33333333-0000-0000-0000-000000000001', e.id, t.id, 'mcq', 'Dijkstra complexity with binary heap?', 1, 0.33, 'published', true, 2023, 'GATE CS 2023'
  from public.exams e join public.syllabus_sections s on s.exam_id=e.id join public.topics t on t.section_id=s.id
  where e.code='GATE_CS' and t.slug='shortest-paths';
insert into public.question_options (id, question_id, label, content) values
 ('44444444-0000-0000-0000-00000000000a','33333333-0000-0000-0000-000000000001','A','O(V^2)'),
 ('44444444-0000-0000-0000-00000000000b','33333333-0000-0000-0000-000000000001','B','O((V+E) log V)');
insert into public.question_keys (question_id, correct_option_ids, explanation) values
 ('33333333-0000-0000-0000-000000000001','{44444444-0000-0000-0000-00000000000b}','Heap ops are log V.');
-- MSQ
insert into public.questions (id, exam_id, topic_id, type, stem, marks, status)
  select '33333333-0000-0000-0000-000000000002', e.id, t.id, 'msq', 'Which are greedy?', 2, 'published'
  from public.exams e join public.syllabus_sections s on s.exam_id=e.id join public.topics t on t.section_id=s.id
  where e.code='GATE_CS' and t.slug='greedy-algorithms';
insert into public.question_options (id, question_id, label, content) values
 ('44444444-0000-0000-0000-0000000000c1','33333333-0000-0000-0000-000000000002','A','Prim'),
 ('44444444-0000-0000-0000-0000000000c2','33333333-0000-0000-0000-000000000002','B','Kruskal'),
 ('44444444-0000-0000-0000-0000000000c3','33333333-0000-0000-0000-000000000002','C','Floyd-Warshall');
insert into public.question_keys (question_id, correct_option_ids) values
 ('33333333-0000-0000-0000-000000000002','{44444444-0000-0000-0000-0000000000c1,44444444-0000-0000-0000-0000000000c2}');
-- NAT
insert into public.questions (id, exam_id, topic_id, type, stem, marks, status)
  select '33333333-0000-0000-0000-000000000003', e.id, t.id, 'nat', 'Edges in K5?', 2, 'published'
  from public.exams e join public.syllabus_sections s on s.exam_id=e.id join public.topics t on t.section_id=s.id
  where e.code='GATE_CS' and t.slug='graphs' and s.name='Programming and Data Structures';
insert into public.question_keys (question_id, nat_min, nat_max) values ('33333333-0000-0000-0000-000000000003', 10, 10);
-- Test
insert into public.tests (id, exam_id, slug, title, duration_minutes, status, max_attempts)
  select '55555555-0000-0000-0000-000000000001', id, 'gate-mock-1', 'GATE Mock 1', 180, 'published', 2 from public.exams where code='GATE_CS';
insert into public.test_sections (id, test_id, name) values ('55555555-0000-0000-0000-0000000000a1','55555555-0000-0000-0000-000000000001','Computer Science');
insert into public.test_questions (test_id, section_id, question_id, position)
  select '55555555-0000-0000-0000-000000000001','55555555-0000-0000-0000-0000000000a1', id, row_number() over (order by id) from public.questions;
insert into public.course_tests (course_id, test_id) values ('11111111-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000001');
commit;
do $$ begin assert (select course_id from public.lectures where id='22222222-0000-0000-0000-000000000002')='11111111-0000-0000-0000-000000000001', 'lecture.course_id trigger'; end $$;

-- publishing an incomplete question fails at commit
select public.t_expect_error($q$
  do $d$ begin
    insert into public.questions (exam_id, topic_id, type, stem, status)
      select exam_id, topic_id, 'mcq', 'no key', 'published' from public.questions limit 1;
    set constraints all immediate;
  end $d$ $q$, 'without an answer key');
-- faculty can publish but not price
select public.t_expect_error($q$ insert into public.products (type, course_id, price_paise) values ('course','11111111-0000-0000-0000-000000000001',100) $q$, 'row-level security');
reset role;

-- ---------- admin sets price + coupon ----------
set role authenticated; select public.t_as('00000000-0000-0000-0000-00000000000a');
insert into public.products (id, type, course_id, price_paise, validity_days) values
  ('66666666-0000-0000-0000-000000000001','course','11111111-0000-0000-0000-000000000001', 49900, 365);
insert into public.coupons (code, discount_type, discount_value, max_discount_paise, max_redemptions) values ('gate50','percent',50,20000,10);
update public.products set price_paise = 59900, sale_price_paise = 49900 where id='66666666-0000-0000-0000-000000000001';
select public.t_expect_error($q$ update public.profiles set role='student' where id='00000000-0000-0000-0000-00000000000a' $q$, 'last admin');
reset role;
do $$ begin assert exists(select 1 from public.coupons where code='GATE50'), 'coupon upper'; 
            assert exists(select 1 from public.audit_log where action='product.pricing'), 'price audit'; end $$;

-- ---------- student: locked out of answers & admin things ----------
set role authenticated; select public.t_as('00000000-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from public.question_keys)=0, 'student sees keys!';
  assert (select count(*) from public.questions)=0, 'student sees questions!';
  assert (select count(*) from public.coupons)=0, 'student sees coupons!';
  assert (select count(*) from public.lectures)=2, 'student sees curriculum';
  assert (select count(*) from public.profiles)=1, 'student sees only own profile';
  assert (select count(*) from public.profile_cards)=4, 'profile cards';
  assert (select lecture_count from public.course_stats)=2 and (select total_duration_seconds from public.course_stats)=1600, 'course_stats';
end $$;
select public.t_expect_error($q$ update public.profiles set role='admin' where id=auth.uid() $q$, 'Only admins');
select public.t_expect_error($q$ select public.start_test_attempt('55555555-0000-0000-0000-000000000001') $q$, 'do not have access');
select public.t_expect_error($q$ select public.save_lecture_progress('22222222-0000-0000-0000-000000000002', 10, 10) $q$, 'do not have access');
select public.save_lecture_progress('22222222-0000-0000-0000-000000000001', 30, 30);  -- free preview ok
select public.t_expect_error($q$ select public.mark_order_paid(gen_random_uuid()) $q$, 'permission denied');
select public.t_expect_error($q$ insert into public.enrollments (user_id, product_id) values (auth.uid(),'66666666-0000-0000-0000-000000000001') $q$, 'row-level security');
select public.t_expect_error($q$ insert into public.orders (user_id, product_id, list_price_paise, amount_paise) values (auth.uid(),'66666666-0000-0000-0000-000000000001',0,0) $q$, 'row-level security');
do $$ declare j jsonb := public.preview_price('66666666-0000-0000-0000-000000000001','Gate50');
begin assert (j->>'amount_paise')::int = 29900, 'coupon math: '||j; end $$;
select public.create_order('66666666-0000-0000-0000-000000000001','GATE50') as order_json \gset
reset role;

-- ---------- server confirms payment ----------
set role service_role;
select public.mark_order_paid((:'order_json'::jsonb->>'order_id')::uuid, 'demo_pay_1');
select public.mark_order_paid((:'order_json'::jsonb->>'order_id')::uuid, 'demo_pay_1'); -- idempotent
reset role;
do $$ begin
  assert (select count(*) from public.enrollments where user_id='00000000-0000-0000-0000-000000000001')=1, 'enrolled';
  assert (select expires_at::date from public.enrollments) = (now() + interval '365 days')::date, 'validity';
  assert (select count(*) from public.coupon_redemptions)=1, 'redemption recorded once';
end $$;

-- ---------- student takes the test ----------
select (select id from public.test_questions where question_id='33333333-0000-0000-0000-000000000001') as tq1,
       (select id from public.test_questions where question_id='33333333-0000-0000-0000-000000000002') as tq2,
       (select id from public.test_questions where question_id='33333333-0000-0000-0000-000000000003') as tq3 \gset
select set_config('t.tq1', :'tq1', false);
set role authenticated; select public.t_as('00000000-0000-0000-0000-000000000001');
select public.t_expect_error($q$ select public.create_order('66666666-0000-0000-0000-000000000001') $q$, 'already have access');
select public.start_test_attempt('55555555-0000-0000-0000-000000000001') as attempt \gset
select set_config('t.attempt', :'attempt', false);
do $$ declare p jsonb := public.get_attempt_paper(current_setting('t.attempt')::uuid); begin
  assert jsonb_array_length(p->'questions')=3, 'paper has 3 questions';
  assert p::text not ilike '%correct_option_ids%' and p::text not ilike '%explanation%', 'paper leaks key!';
end $$;
-- resume returns same attempt
do $$ begin assert public.start_test_attempt('55555555-0000-0000-0000-000000000001') = current_setting('t.attempt')::uuid, 'resume'; end $$;
select public.t_expect_error($q$ select public.get_attempt_result(current_setting('t.attempt')::uuid) $q$, 'after the test is submitted');
-- answers: MCQ wrong (-0.33), MSQ partial (0), NAT right (+2)
select public.save_test_response(:'attempt', :'tq1',
  'answered', '{44444444-0000-0000-0000-00000000000a}', null, null, 40);
select public.save_test_response(:'attempt', :'tq2',
  'answered_and_marked', '{44444444-0000-0000-0000-0000000000c1}', null, null, 60);
select public.save_test_response(:'attempt', :'tq3',
  'marked_for_review', null, 10, null, 9999);
select public.t_expect_error($q$ select public.save_test_response(current_setting('t.attempt')::uuid,
  current_setting('t.tq1')::uuid, 'answered',
  '{44444444-0000-0000-0000-0000000000c1}') $q$, 'Invalid option');
do $$ declare r jsonb := public.submit_test_attempt(current_setting('t.attempt')::uuid); begin
  raise notice 'result: score=% max=% correct=% wrong=% rank=% pct=% topics=%', r->>'score', r->>'max_score', r->>'correct', r->>'wrong', r->>'rank', r->>'percentile', jsonb_array_length(r->'topics');
  assert (r->>'score')::numeric = 1.67, 'score';
  assert (r->>'max_score')::numeric = 5, 'max score';
  assert (r->>'correct')::int = 1 and (r->>'wrong')::int = 2, 'counts';
  assert (r->>'rank')::int = 1 and (r->>'total_candidates')::int = 1, 'rank';
  assert r->'questions'->0 ? 'explanation', 'result has solutions';
end $$;
select public.t_expect_error($q$ select public.save_test_response(current_setting('t.attempt')::uuid,
  (select id from public.test_questions limit 1)) $q$, 'already been submitted');
-- 2nd attempt allowed (max 2), 3rd not
select public.submit_test_attempt(public.start_test_attempt('55555555-0000-0000-0000-000000000001')) is not null;
select public.t_expect_error($q$ select public.start_test_attempt('55555555-0000-0000-0000-000000000001') $q$, 'No attempts left');
do $$ begin assert (select count(*) from public.get_test_leaderboard('55555555-0000-0000-0000-000000000001'))=1, 'leaderboard first attempts only'; end $$;

-- practice
select public.start_practice_session((select id from public.exams where code='GATE_CS'), null, null, '{mcq}') as ps \gset
select set_config('t.ps', :'ps', false);
do $$ declare s jsonb; r jsonb; begin
  s := public.get_practice_session(current_setting('t.ps')::uuid);
  assert jsonb_array_length(s->'questions')=1 and (s->'questions'->0->'answer') = 'null'::jsonb, 'practice paper hides answer';
  r := public.answer_practice_question(current_setting('t.ps')::uuid, '33333333-0000-0000-0000-000000000001', '{44444444-0000-0000-0000-00000000000b}');
  assert (r->>'is_correct')::boolean, 'practice correct';
  s := public.get_practice_session(current_setting('t.ps')::uuid);
  assert s->'questions'->0->'answer'->>'explanation' = 'Heap ops are log V.', 'explanation after answer';
  assert s->>'ended_at' is not null, 'session ended when all answered';
end $$;

-- progress: completes at 90%
do $$ declare j jsonb; begin
  for i in 1..8 loop j := public.save_lecture_progress('22222222-0000-0000-0000-000000000002', i*120, 120); end loop;
  assert (j->>'completed')::boolean, 'completed at 90%: '||j;
  assert (select completed_lectures from public.course_progress where user_id=auth.uid())=1, 'course_progress';
end $$;

-- doubts + report
insert into public.lecture_doubts (id, lecture_id, user_id, body, video_timestamp_seconds) values
 ('77777777-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000002', auth.uid(), 'Why log V?', 125);
insert into public.question_reports (question_id, user_id, reason, message) values ('33333333-0000-0000-0000-000000000001', auth.uid(), 'typo', 'typo in stem');
select public.t_expect_error($q$ update public.lecture_doubts set is_pinned = true $q$, 'row-level security');
reset role;

-- student 2 (not enrolled) sees no doubts, no paid video
insert into storage.objects (bucket_id, name, metadata) values
 ('lecture-videos','22222222-0000-0000-0000-000000000001/v.mp4','{"size": 1000}'),
 ('lecture-videos','22222222-0000-0000-0000-000000000002/v.mp4','{"size": 5000}');
set role authenticated; select public.t_as('00000000-0000-0000-0000-000000000002');
do $$ begin
  assert (select count(*) from public.lecture_doubts)=0, 's2 sees doubts';
  assert (select count(*) from storage.objects where bucket_id='lecture-videos')=1, 's2 should see free preview only';
  assert (select count(*) from public.test_attempts)=0, 's2 sees others attempts';
end $$;
select public.t_expect_error($q$ select public.admin_daily_activity() $q$, 'Admins only');
reset role;
set role anon; select set_config('request.jwt.claims', '', false);
do $$ begin
  assert (select count(*) from storage.objects)=1, 'anon free preview only';
  assert (select count(*) from public.courses)=1, 'anon catalog';
end $$;
reset role;
set role authenticated; select public.t_as('00000000-0000-0000-0000-000000000001');
do $$ begin assert (select count(*) from storage.objects where bucket_id='lecture-videos')=2, 'enrolled sees both videos'; end $$;
reset role;

-- faculty answers doubt
set role authenticated; select public.t_as('00000000-0000-0000-0000-00000000000f');
insert into public.doubt_replies (doubt_id, user_id, body) values ('77777777-0000-0000-0000-000000000001', auth.uid(), 'Heap.');
do $$ begin
  assert (select status from public.lecture_doubts)='answered', 'doubt answered';
  assert (select is_staff_answer from public.doubt_replies), 'staff answer flag';
  assert (select attempts from public.question_stats where question_id='33333333-0000-0000-0000-000000000001')=2, 'question_stats';
  assert (select count(*) from public.profiles)=1, 'faculty cannot read emails';
end $$;
reset role;

-- ---------- CAT-style timed sections + auto-expire ----------
insert into public.tests (id, exam_id, slug, title, duration_minutes, status, is_free)
  select '55555555-0000-0000-0000-000000000002', id, 'cat-free-mock', 'CAT Free Mock', 120, 'published', true from public.exams where code='CAT';
insert into public.test_sections (id, test_id, name, position, duration_minutes) values
 ('55555555-0000-0000-0000-0000000000b1','55555555-0000-0000-0000-000000000002','VARC',1,40),
 ('55555555-0000-0000-0000-0000000000b2','55555555-0000-0000-0000-000000000002','QA',2,40);
insert into public.test_questions (test_id, section_id, question_id, position) values
 ('55555555-0000-0000-0000-000000000002','55555555-0000-0000-0000-0000000000b1','33333333-0000-0000-0000-000000000001',1),
 ('55555555-0000-0000-0000-000000000002','55555555-0000-0000-0000-0000000000b2','33333333-0000-0000-0000-000000000003',1);
select set_config('t.catq2', (select id::text from public.test_questions where section_id='55555555-0000-0000-0000-0000000000b2'), false);
set role authenticated; select public.t_as('00000000-0000-0000-0000-000000000002');
select public.start_test_attempt('55555555-0000-0000-0000-000000000002') as cat \gset
select set_config('t.cat', :'cat', false);
do $$ declare p jsonb := public.get_attempt_paper(current_setting('t.cat')::uuid); begin
  assert jsonb_array_length(p->'questions')=1 and p->'questions'->0->>'section_id' like '%b1', 'only VARC visible';
  assert (p->>'deadline_at')::timestamptz - (p->>'started_at')::timestamptz = interval '80 minutes', 'deadline = sum of sections';
end $$;
select public.t_expect_error($q$ select public.save_test_response(current_setting('t.cat')::uuid,
  current_setting('t.catq2')::uuid, 'answered', null, 10) $q$, 'locked');
reset role;
update public.test_attempts set section_deadline_at = now() - interval '1 minute' where id = :'cat';
set role authenticated; select public.t_as('00000000-0000-0000-0000-000000000002');
do $$ declare p jsonb := public.get_attempt_paper(current_setting('t.cat')::uuid); begin
  assert p->>'current_section_id' like '%b2', 'auto-advanced to QA';
end $$;
reset role;
update public.test_attempts set deadline_at = now() - interval '1 minute', section_deadline_at = now() - interval '1 minute' where id = :'cat';
set role service_role;
select public.expire_overdue_attempts() as expired;
reset role;
do $$ begin assert (select status from public.test_attempts where id=current_setting('t.cat')::uuid)='expired', 'auto-expired'; end $$;

-- admin analytics
set role authenticated; select public.t_as('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert (select sum(revenue_paise) from public.admin_daily_activity(7)) = 29900, 'revenue';
  assert (select total_bytes from public.admin_storage_usage() where bucket_id='lecture-videos') = 6000, 'storage meter';
  assert (select count(*) from public.audit_log) >= 2, 'audit log visible to admin';
end $$;
reset role;
\echo ALL E2E CHECKS PASSED
