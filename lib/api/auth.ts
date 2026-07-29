import { api } from "@/lib/api";
import type { User, UserRole } from "@/lib/types/user";

export type LoginResponse = { user: User; token: string };

export function loginRequest(
  email: string,
  password: string,
  remember = false,
): Promise<LoginResponse> {
  return api<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, remember }),
  });
}

export function meRequest(): Promise<User> {
  return api<User>("/auth/me");
}

export function logoutRequest(): Promise<void> {
  return api<void>("/auth/logout", { method: "POST" });
}

export function forgotPasswordRequest(email: string): Promise<{ message: string }> {
  return api("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPasswordRequest(payload: {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  return api("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Trang chủ theo vai trò sau khi đăng nhập. */
export function roleHome(role: UserRole): string {
  return role === "student" ? "/missions" : "/teacher";
}
