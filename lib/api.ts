const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// Token lưu tách theo KHU (teacher / student) để 2 tab trong cùng trình duyệt không đè phiên
// của nhau. Khu suy từ URL: mọi path dưới /teacher là khu giáo viên, còn lại là khu học sinh.
export type AuthArea = "teacher" | "student";

const TOKEN_KEY_PREFIX = "auth_token";

export function areaForPath(pathname: string): AuthArea {
  return pathname === "/teacher" || pathname.startsWith("/teacher/") ? "teacher" : "student";
}

export function areaForRole(role: string): AuthArea {
  return role === "student" ? "student" : "teacher";
}

function currentArea(): AuthArea {
  if (typeof window === "undefined") return "student";
  return areaForPath(window.location.pathname);
}

function tokenKey(area: AuthArea): string {
  return `${TOKEN_KEY_PREFIX}_${area}`;
}

/** Đọc token của khu hiện tại (theo URL), hoặc của khu chỉ định. */
export function getToken(area?: AuthArea): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(tokenKey(area ?? currentArea()));
}

/** Ghi/xoá token cho khu chỉ định (mặc định là khu hiện tại theo URL). */
export function setToken(token: string | null, area?: AuthArea): void {
  if (typeof window === "undefined") return;
  const key = tokenKey(area ?? currentArea());
  if (token) {
    localStorage.setItem(key, token);
  } else {
    localStorage.removeItem(key);
  }
}

/**
 * Tải file (export Excel…) từ endpoint cần auth: fetch kèm Bearer token rồi lưu blob.
 * Không dùng <a href> trực tiếp vì trình duyệt không gửi header Authorization.
 * `url` là đường dẫn tuyệt đối (đã gồm API_URL).
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error("Tải file thất bại.");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  // Laravel trả 204 cho vài action (vd. logout không nội dung)
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // 401 giữa phiên (đã có token) = token hết hạn → dọn phiên + báo cho app.
    if (response.status === 401 && token) {
      setToken(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:expired"));
      }
    }

    throw new ApiError(
      response.status,
      data?.message ?? "Đã có lỗi xảy ra, vui lòng thử lại.",
      data?.errors,
    );
  }

  return data as T;
}

/**
 * Upload multipart (FormData). Không set Content-Type để browser gắn boundary.
 */
export async function apiForm<T>(
  path: string,
  form: FormData,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    ...options,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: form,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token) {
      setToken(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:expired"));
      }
    }
    throw new ApiError(
      response.status,
      data?.message ?? "Đã có lỗi xảy ra, vui lòng thử lại.",
      data?.errors,
    );
  }

  return data as T;
}
