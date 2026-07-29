"use client";

import { type FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { resetPasswordRequest } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBanner(null);
    setFieldErrors({});
    if (password !== confirm) {
      setFieldErrors({ password_confirmation: "Mật khẩu nhập lại không khớp." });
      return;
    }
    setSubmitting(true);
    try {
      await resetPasswordRequest({
        token,
        email,
        password,
        password_confirmation: confirm,
      });
      toast.success("Đặt lại mật khẩu thành công. Mời em đăng nhập.");
      router.replace("/login");
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.errors)) mapped[k] = v[0];
        setFieldErrors(mapped);
        if (err.errors.email) setBanner(err.errors.email[0]);
      } else {
        setBanner("Link không hợp lệ hoặc đã hết hạn.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-[400px] rounded-3xl border-[1.5px] border-border bg-surface p-8 shadow-[0_12px_40px_rgba(58,51,48,0.08)]">
      <h1 className="font-display text-xl font-bold text-text">Đặt lại mật khẩu</h1>
      <p className="mt-1 mb-6 text-sm text-text-secondary">
        Nhập mật khẩu mới cho tài khoản {email || "của em"}.
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
        <FormField
          htmlFor="password"
          label="Mật khẩu mới"
          required
          error={fieldErrors.password}
        >
          <PasswordInput
            id="password"
            className="h-12"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormField>
        <FormField
          htmlFor="password_confirmation"
          label="Nhập lại mật khẩu"
          required
          error={fieldErrors.password_confirmation}
        >
          <PasswordInput
            id="password_confirmation"
            className="h-12"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </FormField>
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Đặt lại mật khẩu
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 block text-center text-sm font-medium text-brand hover:underline"
      >
        Quay lại đăng nhập
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
