"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { ApiError } from "@/lib/api";
import { forgotPasswordRequest } from "@/lib/api/auth";

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
    <div className="organic flex min-h-screen items-center justify-center bg-bg px-6 py-10">
      <div className="w-full max-w-[460px] rounded-[28px] bg-neutral-100 p-10 elev-md">
        {sent ? (
          <div className="flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-accent-2-200 text-accent-2-800">
              <MailCheck className="size-7" strokeWidth={2.75} />
            </span>
            <h2 className="mt-4 font-display text-[30px] font-bold text-text">Đã gửi rồi nhé</h2>
            <p className="mt-2 text-[15px] text-neutral-700">
              Nếu email tồn tại trong hệ thống, em sẽ nhận được link đặt lại mật khẩu. Hãy kiểm tra cả hộp thư rác.
            </p>
            <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700 hover:underline">
              <ArrowLeft className="size-4" strokeWidth={2.75} /> Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <>
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700 hover:text-accent-700">
              <ArrowLeft className="size-4" strokeWidth={2.75} /> Quay lại đăng nhập
            </Link>
            <span className="mt-5 flex size-14 items-center justify-center rounded-full bg-accent-100 text-accent-700">
              <Mail className="size-7" strokeWidth={2.75} />
            </span>
            <h2 className="mt-4 font-display text-[30px] font-bold text-text">Quên mật khẩu?</h2>
            <p className="mt-1 text-[15px] text-neutral-700">Nhập email cô cấp, hệ thống sẽ gửi link đặt lại mật khẩu.</p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="email" className="input" placeholder="minhanh@lophoc.vn"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
                {fieldError && <span className="text-xs font-medium text-danger">{fieldError}</span>}
              </div>
              <button type="submit" className="btn btn-primary btn-block" style={{ height: 52 }} disabled={submitting}>
                {submitting ? "Đang gửi…" : "Gửi link đặt lại"}
              </button>
            </form>

            <div className="mt-4 rounded-[16px] bg-accent-2-200 px-4 py-3 text-sm text-accent-2-900">
              Link có hiệu lực 30 phút. Nếu không thấy email, em kiểm tra hộp thư rác hoặc nhắn cô Uyên nhé.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
