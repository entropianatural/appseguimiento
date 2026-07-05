export type RecordType = "positive" | "negative";

export type ThemePreference = "light" | "dark" | "system";

export type Profile = {
  id: string;
  full_name: string | null;
  sound_enabled: boolean;
  theme: ThemePreference;
  created_at: string;
};

export type ClassGroup = {
  id: string;
  teacher_id: string;
  name: string;
  academic_year: string | null;
  description: string | null;
  created_at: string;
  archived_at: string | null;
};

export type Student = {
  id: string;
  teacher_id: string;
  class_id: string;
  first_name: string;
  last_name: string;
  list_number: number | null;
  external_id: string | null;
  avatar_key: string | null;
  created_at: string;
  archived_at: string | null;
};

export type SkillCategory = {
  id: string;
  teacher_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
};

export type Skill = {
  id: string;
  teacher_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  default_type: RecordType;
  default_value: number;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
};

export type BehaviorRecord = {
  id: string;
  teacher_id: string;
  class_id: string;
  student_id: string;
  skill_id: string | null;
  record_date: string;
  recorded_at: string;
  type: RecordType;
  value: number;
  note: string | null;
};