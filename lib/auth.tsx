"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getToken, setToken, areaForRole } from "@/lib/api";
import {
  loginRequest,
  logoutRequest,
  meRequest,
} from "@/lib/api/auth";
import type { User, UserRole } from "@/lib/types/user";

export type { User, UserRole };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<User>;
  logout: () => Promise<void>;
  clearSession: () => void;
  /** Nạp lại user từ server (dùng sau khi đổi tên/avatar để header cập nhật ngay). */
  refreshUser: () => Promise<void>;
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

    meRequest()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Token hết hạn giữa phiên (bắt ở lib/api.ts) → xoá user khỏi context.
    function onExpired() {
      setUser(null);
    }
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  async function login(email: string, password: string, remember = false) {
    const data = await loginRequest(email, password, remember);
    // Lưu theo khu của role (không theo trang login) → teacher đăng nhập ở đâu cũng vào key teacher.
    setToken(data.token, areaForRole(data.user.role));
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await logoutRequest();
    } catch {
      // Bỏ qua lỗi mạng — vẫn xoá phiên cục bộ để đăng xuất được
    } finally {
      setToken(null);
      setUser(null);
    }
  }

  function clearSession() {
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    try {
      setUser(await meRequest());
    } catch {
      // Bỏ qua — giữ user hiện tại nếu không nạp lại được.
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, clearSession, refreshUser }}>
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
