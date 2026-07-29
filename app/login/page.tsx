"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { roleHome } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

const RESET_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PASSWORD_RESET === "true";

export default function StudentLoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (lockSeconds > 0) return;
    setBanner(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const loggedIn = await login(email, password);
      router.replace(roleHome(loggedIn.role));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) setBanner("Email hoặc mật khẩu không đúng.");
        else if (err.status === 422 && err.errors) {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(err.errors)) mapped[k] = v[0];
          setFieldErrors(mapped);
        } else if (err.status === 403)
          setBanner("Tài khoản đang tạm khoá, vui lòng liên hệ cô giáo.");
        else if (err.status === 429) {
          setLockSeconds(60);
          setBanner("Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 60 giây.");
        } else setBanner(err.message);
      } else {
        setBanner("Không thể đăng nhập, vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-[400px] rounded-3xl border-[1.5px] border-border bg-surface p-8 shadow-[0_12px_40px_rgba(58,51,48,0.08)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand text-white">
            <GraduationCap className="size-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-text">
            Chào mừng trở lại!
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Đăng nhập để tiếp tục học nhé
          </p>
        </div>

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
              className="h-12"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldErrors.email}
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
              className="h-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password}
              required
            />
          </FormField>

          {RESET_ENABLED && (
            <div className="-mt-1 text-right">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-brand hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={lockSeconds > 0}
          >
            {lockSeconds > 0 ? `Thử lại sau ${lockSeconds}s` : "Đăng nhập"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-text-muted">
          Chưa có tài khoản? Liên hệ cô giáo để được cấp.
        </p>
      </div>
    </div>
  );
}
