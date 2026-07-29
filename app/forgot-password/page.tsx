"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { ApiError } from "@/lib/api";
import { forgotPasswordRequest } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldError(null);
    setSubmitting(true);
    try {
      await forgotPasswordRequest(email);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.errors?.email) {
        setFieldError(err.errors.email[0]);
      } else {
        // Không lộ email tồn tại — vẫn coi như đã gửi.
        setSent(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-[400px] rounded-3xl border-[1.5px] border-border bg-surface p-8 shadow-[0_12px_40px_rgba(58,51,48,0.08)]">
        {sent ? (
          <div className="flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-success-soft text-success">
              <MailCheck className="size-7" />
            </span>
            <h1 className="mt-4 font-display text-xl font-bold text-text">
              Đã gửi link vào email của em
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Nếu email tồn tại trong hệ thống, em sẽ nhận được link đặt lại mật khẩu.
              Hãy kiểm tra cả hộp thư rác.
            </p>
            <Link
              href="/login"
              className="mt-6 text-sm font-medium text-brand hover:underline"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-xl font-bold text-text">Quên mật khẩu</h1>
            <p className="mt-1 mb-6 text-sm text-text-secondary">
              Nhập email, hệ thống sẽ gửi link đặt lại mật khẩu.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <FormField htmlFor="email" label="Email" required error={fieldError}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </FormField>
              <Button type="submit" size="lg" fullWidth loading={submitting}>
                Gửi link đặt lại
              </Button>
            </form>
            <Link
              href="/login"
              className="mt-6 block text-center text-sm font-medium text-brand hover:underline"
            >
              Quay lại đăng nhập
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
