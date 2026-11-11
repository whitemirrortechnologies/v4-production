export type Role = "student" | "faculty" | "admin";
export type ContentStatus = "draft" | "published" | "archived";
export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "mcq" | "msq" | "nat" | "tita";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  target_exam_id: string | null;
  is_blocked: boolean;
  created_at: string;
}
export interface Exam { id: string; code: string; name: string; description: string | null; is_active: boolean; position: number }
export interface Section { id: string; exam_id: string; name: string; position: number }
export interface Topic { id: string; section_id: string; parent_id: string | null; name: string; slug: string; position: number }

export interface Course {
  id: string; exam_id: string; slug: string; title: string; subtitle: string | null;
  description: string | null; thumbnail_path: string | null; status: ContentStatus; published_at: string | null;
}
export interface Subject { id: string; course_id: string; title: string; position: number }
export interface Module { id: string; subject_id: string; title: string; position: number }
export interface Chapter { id: string; module_id: string; title: string; position: number }
export interface Lecture {
  id: string; chapter_id: string; course_id: string; title: string; description: string | null; position: number;
  is_free_preview: boolean; video_provider: string; video_path: string | null;
  video_status: "none" | "uploading" | "ready" | "failed"; video_size_bytes: number | null;
  duration_seconds: number | null; notes_path: string | null; status: ContentStatus;
}
export interface Product {
  id: string; type: "course" | "test_series" | "bundle"; course_id: string | null; test_series_id: string | null;
  price_paise: number; sale_price_paise: number | null; validity_days: number | null; access_until: string | null;
  is_active: boolean;
}
export interface CourseStats {
  course_id: string; subject_count: number; lecture_count: number; total_duration_seconds: number;
  free_preview_count: number; test_count: number; free_test_count: number;
}

export interface Question {
  id: string; exam_id: string; topic_id: string; group_id: string | null; type: QuestionType; difficulty: Difficulty;
  stem: string; marks: number; negative_marks: number; is_pyq: boolean; pyq_year: number | null; pyq_paper: string | null;
  is_free_practice: boolean; status: ContentStatus; created_at: string; updated_at: string;
}
export interface QuestionOption { id: string; question_id: string; label: string; content: string; position: number }
export interface QuestionKey {
  question_id: string; correct_option_ids: string[] | null; nat_min: number | null; nat_max: number | null;
  tita_answer: string | null; explanation: string | null;
}
export interface QuestionGroup { id: string; exam_id: string; title: string; content: string }
