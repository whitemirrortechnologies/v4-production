-- =============================================================================
-- V4 seed: exams + official syllabus (GATE CS/IT, CAT)
-- Safe to re-run: existing rows are kept (matched by exam code / section name / slug).
-- Run AFTER supabase/migrations/20261111000000_init.sql.
-- =============================================================================

insert into public.exams (code, name, description, position) values
  ('GATE_CS', 'GATE Computer Science & IT',
   'Graduate Aptitude Test in Engineering — CS paper (Computer Science and Information Technology).', 1),
  ('CAT', 'CAT',
   'Common Admission Test — for admission to IIMs and other management programmes.', 2)
on conflict (code) do update set name = excluded.name, description = excluded.description;

-- Syllabus as JSON: { exam_code: [ {section, topics: [ name | {name, sub: [names]} ]} ] }
do $$
declare
  syllabus jsonb := $json$
{
  "GATE_CS": [
    {"section": "General Aptitude", "topics": [
      "Verbal Aptitude", "Quantitative Aptitude", "Analytical Aptitude", "Spatial Aptitude"]},
    {"section": "Engineering Mathematics", "topics": [
      {"name": "Discrete Mathematics", "sub": [
        "Propositional and First Order Logic", "Sets, Relations and Functions",
        "Partial Orders and Lattices", "Monoids and Groups",
        "Graphs: Connectivity, Matching, Colouring",
        "Combinatorics: Counting, Recurrence Relations, Generating Functions"]},
      {"name": "Linear Algebra", "sub": [
        "Matrices and Determinants", "System of Linear Equations",
        "Eigenvalues and Eigenvectors", "LU Decomposition"]},
      {"name": "Calculus", "sub": [
        "Limits, Continuity and Differentiability", "Maxima and Minima",
        "Mean Value Theorem", "Integration"]},
      {"name": "Probability and Statistics", "sub": [
        "Random Variables", "Probability Distributions", "Mean, Median, Mode and Standard Deviation",
        "Conditional Probability and Bayes Theorem"]}]},
    {"section": "Digital Logic", "topics": [
      "Boolean Algebra", "Combinational Circuits", "Sequential Circuits", "Minimization",
      "Number Representations and Computer Arithmetic"]},
    {"section": "Computer Organization and Architecture", "topics": [
      "Machine Instructions and Addressing Modes", "ALU, Data-path and Control Unit",
      "Instruction Pipelining and Hazards", "Memory Hierarchy: Cache, Main Memory, Secondary Storage",
      "I/O Interface: Interrupt and DMA"]},
    {"section": "Programming and Data Structures", "topics": [
      "Programming in C", "Recursion", "Arrays", "Stacks and Queues", "Linked Lists",
      "Trees and Binary Search Trees", "Binary Heaps", "Graphs"]},
    {"section": "Algorithms", "topics": [
      "Searching, Sorting and Hashing", "Asymptotic Complexity",
      "Greedy Algorithms", "Dynamic Programming", "Divide and Conquer",
      "Graph Traversals", "Minimum Spanning Trees", "Shortest Paths"]},
    {"section": "Theory of Computation", "topics": [
      "Regular Expressions and Finite Automata", "Context-Free Grammars and Push-Down Automata",
      "Regular and Context-Free Languages, Pumping Lemma", "Turing Machines and Undecidability"]},
    {"section": "Compiler Design", "topics": [
      "Lexical Analysis", "Parsing", "Syntax-Directed Translation", "Runtime Environments",
      "Intermediate Code Generation", "Local Optimisation", "Data Flow Analysis"]},
    {"section": "Operating System", "topics": [
      "System Calls, Processes and Threads", "Inter-Process Communication",
      "Concurrency and Synchronization", "Deadlock", "CPU and I/O Scheduling",
      "Memory Management and Virtual Memory", "File Systems"]},
    {"section": "Databases", "topics": [
      "ER Model", "Relational Algebra and Tuple Calculus", "SQL", "Integrity Constraints and Normal Forms",
      "File Organization and Indexing (B and B+ Trees)", "Transactions and Concurrency Control"]},
    {"section": "Computer Networks", "topics": [
      "Layering: OSI and TCP/IP", "Packet, Circuit and Virtual Circuit Switching",
      "Data Link Layer: Framing, Error Detection, MAC, Ethernet Bridging",
      "Routing Protocols: Shortest Path, Flooding, Distance Vector, Link State",
      "IP Addressing: IPv4, CIDR, Fragmentation", "ARP, DHCP, ICMP and NAT",
      "Transport Layer: Flow and Congestion Control, UDP, TCP, Sockets",
      "Application Layer: DNS, SMTP, HTTP, FTP, Email"]}
  ],
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
