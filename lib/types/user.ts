export type UserRole = "admin" | "teacher" | "student";

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_super_admin: boolean;
  avatar_url: string | null;
};

export function isTeacher(role: UserRole): boolean {
  return role === "teacher" || role === "admin";
}

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}
