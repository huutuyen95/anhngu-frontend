"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { roleHome } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";

export default function TeacherLoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);

  // Đã đăng nhập mà vào trang login → đưa về đúng khu.
  useEffect(() => {
    if (!loading && user) router.replace(roleHome(user.role));
  }, [loading, user, router]);

  // Đếm ngược khi bị rate-limit (429).
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const t = setTimeout(() => setLockSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockSeconds]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (lockSeconds > 0) return;
    setBanner(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const loggedIn = await login(email, password, remember);
      if (loggedIn.role === "student") {
        toast.info("Tài khoản học sinh — đã chuyển về khu học tập.");
        router.replace("/missions");
      } else {
        router.replace("/teacher");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setBanner("Email hoặc mật khẩu không đúng.");
        } else if (err.status === 422 && err.errors) {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(err.errors)) mapped[k] = v[0];
          setFieldErrors(mapped);
        } else if (err.status === 403) {
          setBanner("Tài khoản đang tạm khoá, vui lòng liên hệ dev để được mở.");
        } else if (err.status === 429) {
          setLockSeconds(60);
          setBanner("Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 60 giây.");
        } else {
          setBanner(err.message);
        }
      } else {
        setBanner("Không thể đăng nhập, vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Cột trái thương hiệu — ẩn ở mobile */}
      <aside className="hidden w-[560px] shrink-0 flex-col justify-between bg-brand p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 font-display text-lg font-extrabold">
            AU
          </span>
          <span className="font-display text-lg font-bold">Anh ngữ Mrs Uyên</span>
        </div>
        <div>
          <h1 className="font-display text-[32px] leading-tight font-extrabold">
            Khu vực quản trị
          </h1>
          <p className="mt-3 max-w-sm text-white/85">
            Quản lý học sinh, lớp học, nội dung và theo dõi kết quả học tập ở một nơi.
          </p>
        </div>
      </aside>

      {/* Cột phải — form căn giữa */}
      <div className="flex w-full flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px] rounded-[26px] border-[1.5px] border-border bg-surface p-9 shadow-[0_12px_40px_rgba(58,51,48,0.08)]">
          <h2 className="font-display text-2xl font-bold text-text">
            Đăng nhập quản trị
          </h2>
          <p className="mt-1 mb-6 text-sm text-text-secondary">
            Dành riêng cho giáo viên
          </p>

          {banner && (
            <div
              role="alert"
              className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
            >
              {banner}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <FormField htmlFor="email" label="Email" required error={fieldErrors.email}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                required
              />
            </FormField>

            <FormField
              htmlFor="password"
              label="Mật khẩu"
              required
              error={fieldErrors.password}
            >
              <PasswordInput
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!fieldErrors.password}
                required
              />
            </FormField>

            <Checkbox
              checked={remember}
              onCheckedChange={setRemember}
              label="Ghi nhớ đăng nhập trên máy này"
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={submitting}
              disabled={lockSeconds > 0}
            >
              {lockSeconds > 0 ? `Thử lại sau ${lockSeconds}s` : "Đăng nhập"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
