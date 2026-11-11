-- =============================================================================
-- V4 seed: the CAT exam + its official syllabus
-- Safe to re-run: existing rows are kept (matched by exam code / section name / slug).
-- Run AFTER supabase/migrations/20261111000000_init.sql.
-- =============================================================================

insert into public.exams (code, name, description, position) values
  ('CAT', 'CAT',
   'Common Admission Test — for admission to IIMs and other management programmes.', 1)
on conflict (code) do update set name = excluded.name, description = excluded.description;

-- Syllabus as JSON: { exam_code: [ {section, topics: [ name | {name, sub: [names]} ]} ] }
-- Add another exam later by adding a key here and a row above.
do $$
declare
  syllabus jsonb := $json$
{
  "CAT": [
    {"section": "VARC", "topics": [
      "Reading Comprehension", "Para Jumbles", "Para Summary", "Odd Sentence Out", "Para Completion"]},
    {"section": "DILR", "topics": [
      {"name": "Data Interpretation", "sub": [
        "Tables", "Bar Graphs", "Line Charts", "Pie Charts", "Caselets"]},
      {"name": "Logical Reasoning", "sub": [
        "Arrangements", "Puzzles", "Games and Tournaments", "Venn Diagrams",
        "Networks and Routes", "Scheduling"]}]},
    {"section": "QA", "topics": [
      {"name": "Arithmetic", "sub": [
        "Percentages", "Profit and Loss", "Simple and Compound Interest", "Ratio and Proportion",
        "Averages and Mixtures", "Time and Work", "Time, Speed and Distance"]},
      {"name": "Algebra", "sub": [
        "Linear and Quadratic Equations", "Inequalities", "Functions and Graphs", "Logarithms",
        "Progressions", "Polynomials"]},
      {"name": "Geometry and Mensuration", "sub": [
        "Lines and Triangles", "Circles", "Polygons", "Coordinate Geometry", "Mensuration", "Trigonometry"]},
      "Number System",
      {"name": "Modern Math", "sub": [
        "Permutations and Combinations", "Probability", "Set Theory", "Sequences and Series"]}]}
  ]
}
$json$;
  v_exam_code text;
  v_exam uuid;
  sec jsonb;
  sec_pos int;
  v_section uuid;
  tp jsonb;
  tp_pos int;
  v_topic uuid;
  sub jsonb;
  sub_pos int;

begin
  for v_exam_code in select jsonb_object_keys(syllabus) loop
    select id into v_exam from public.exams where code = v_exam_code;
    sec_pos := 0;
    for sec in select * from jsonb_array_elements(syllabus -> v_exam_code) loop
      sec_pos := sec_pos + 1;
      insert into public.syllabus_sections (exam_id, name, position)
      values (v_exam, sec ->> 'section', sec_pos)
      on conflict (exam_id, name) do update set position = excluded.position
      returning id into v_section;

      tp_pos := 0;
      for tp in select * from jsonb_array_elements(sec -> 'topics') loop
        tp_pos := tp_pos + 1;
        if jsonb_typeof(tp) = 'string' then
          tp := jsonb_build_object('name', tp #>> '{}', 'sub', '[]'::jsonb);
        end if;

        insert into public.topics (section_id, name, slug, position)
        values (v_section, tp ->> 'name',
                trim(both '-' from regexp_replace(lower(tp ->> 'name'), '[^a-z0-9]+', '-', 'g')), tp_pos)
        on conflict (section_id, slug) do update set name = excluded.name, position = excluded.position
        returning id into v_topic;

        sub_pos := 0;
        for sub in select * from jsonb_array_elements(coalesce(tp -> 'sub', '[]'::jsonb)) loop
          sub_pos := sub_pos + 1;
          insert into public.topics (section_id, parent_id, name, slug, position)
          values (v_section, v_topic, sub #>> '{}',
                  trim(both '-' from regexp_replace(lower(sub #>> '{}'), '[^a-z0-9]+', '-', 'g')), sub_pos)
          on conflict (section_id, slug) do update
             set name = excluded.name, parent_id = excluded.parent_id, position = excluded.position;
        end loop;
      end loop;
    end loop;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- First admin: sign up / create the user first (Dashboard → Authentication →
-- Users → Add user), then run with their email:
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- -----------------------------------------------------------------------------
