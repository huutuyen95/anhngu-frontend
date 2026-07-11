"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken } from "@/lib/api";

export type UserRole = "admin" | "teacher" | "student";

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Khôi phục phiên đăng nhập từ token đã lưu, nếu có
    if (!getToken()) {
      setLoading(false);
      return;
    }

    api<User>("/auth/me")
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const data = await api<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // Bỏ qua lỗi mạng — vẫn xoá phiên cục bộ để đăng xuất được
    } finally {
      setToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth phải được dùng bên trong <AuthProvider>.");
  }
  return ctx;
}
