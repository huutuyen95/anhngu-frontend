"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { roleHome } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

const RESET_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PASSWORD_RESET === "true";

const STATS = [
  { n: "42", label: "ĐỀ LUYỆN" },
  { n: "214", label: "TỪ VỰNG" },
  { n: "8", label: "NGÀY LIỀN" },
];

export default function StudentLoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);

  useEffect(() => {
    if (!loading && user) router.replace(roleHome(user.role));
  }, [loading, user, router]);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const t = setTimeout(() => setLockSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockSeconds]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (lockSeconds > 0 || submitting) return;
    setBanner(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const loggedIn = await login(email, password, remember);
      router.replace(roleHome(loggedIn.role));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) setBanner("Email hoặc mật khẩu không đúng.");
        else if (err.status === 422 && err.errors) {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(err.errors)) mapped[k] = v[0];
          setFieldErrors(mapped);
        } else if (err.status === 403) setBanner("Tài khoản đang tạm khoá, liên hệ cô giáo.");
        else if (err.status === 429) { setLockSeconds(60); setBanner("Thử lại sau 60 giây."); }
        else setBanner(err.message);
      } else setBanner("Không thể đăng nhập, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="organic flex min-h-screen bg-bg">
      {/* Cột trái — terracotta */}
      <aside className="hidden w-[48%] flex-col bg-accent p-14 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-[46px] items-center justify-center rounded-full bg-bg font-display text-lg font-extrabold text-accent">AU</span>
          <span className="font-display text-xl font-bold text-bg">Anh ngữ Mrs Uyên</span>
        </div>

        <div className="mt-auto">
          <p className="text-xs font-extrabold uppercase tracking-[1.2px]" style={{ color: "color-mix(in srgb, #fff 75%, transparent)" }}>
            LỚP HỌC CỦA CÔ UYÊN
          </p>
          <h1 className="mt-3 font-display text-[46px] font-bold leading-[1.1] text-bg">Học tiếng Anh mỗi ngày một chút</h1>
          <p className="mt-4 max-w-md text-base" style={{ color: "color-mix(in srgb, #fff 85%, transparent)" }}>
            Làm đề, ôn từ vựng và theo dõi tiến bộ của em — tất cả ở một nơi, đúng lộ trình cô giao.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-3">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-[16px] px-4 py-4 text-center" style={{ background: "color-mix(in srgb, #fff 16%, transparent)" }}>
              <p className="font-display text-3xl font-bold text-bg">{s.n}</p>
              <p className="mt-1 text-[11px] font-bold tracking-wide" style={{ color: "color-mix(in srgb, #fff 80%, transparent)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* Cột phải — form */}
      <div className="flex flex-1 items-center justify-center bg-bg px-6 py-10">
        <div className="w-full max-w-[420px] rounded-[28px] bg-neutral-100 p-10 elev-md">
          <h2 className="font-display text-[32px] font-bold text-text">Chào mừng em quay lại</h2>
          <p className="mt-1 text-[14.5px] text-neutral-700">Đăng nhập bằng tài khoản cô giáo đã cấp cho em.</p>

          {banner && (
            <div role="alert" className="mt-5 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
              {banner}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" className="input" placeholder="minhanh@lophoc.vn"
                value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!fieldErrors.email} required />
              {fieldErrors.email && <span className="text-xs font-medium text-danger">{fieldErrors.email}</span>}
            </div>

            <div className="field">
              <label htmlFor="password">Mật khẩu</label>
              <div className="relative">
                <input id="password" type={showPw ? "text" : "password"} autoComplete="current-password" className="input pr-12"
                  value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!fieldErrors.password} required />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-accent-700">
                  {showPw ? <EyeOff className="size-5" strokeWidth={2.75} /> : <Eye className="size-5" strokeWidth={2.75} />}
                </button>
              </div>
              {fieldErrors.password && <span className="text-xs font-medium text-danger">{fieldErrors.password}</span>}
            </div>

            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setRemember((v) => !v)} className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                <span className={cn("flex size-[19px] items-center justify-center rounded-[6px] border-[1.5px] transition-colors",
                  remember ? "border-accent bg-accent text-bg" : "border-neutral-400 bg-neutral-100")}>
                  {remember && <Check className="size-3.5" strokeWidth={3.5} />}
                </span>
                Ghi nhớ đăng nhập
              </button>
              {RESET_ENABLED && (
                <Link href="/forgot-password" className="text-sm font-semibold text-accent-700 hover:underline">Quên mật khẩu?</Link>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-block" style={{ height: 52 }} disabled={submitting || lockSeconds > 0}>
              {submitting ? "Đang vào…" : lockSeconds > 0 ? `Thử lại sau ${lockSeconds}s` : "Vào học thôi"}
              {!submitting && lockSeconds === 0 && <ArrowRight className="size-5" strokeWidth={2.75} />}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-neutral-600">Chưa có tài khoản? Liên hệ cô giáo để được cấp.</p>
        </div>
      </div>
    </div>
  );
}
