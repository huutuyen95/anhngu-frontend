export type Gender = "male" | "female" | "unspecified";

export type Profile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  birthday: string | null;
  gender: Gender | null;
  address: string | null;
  facebook_url: string | null;
  avatar_url: string | null;
  password_changed_at: string | null;
  role: string;
  classroom: { id: number; name: string; teacher_name: string | null; joined_at: string | null } | null;
  student_code: string;
  active_sessions_count: number;
};

export type ProfileUpdate = {
  name: string;
  phone?: string | null;
  birthday?: string | null;
  gender?: Gender | null;
  address?: string | null;
  facebook_url?: string | null;
};
