"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Lock, Check, Eye, EyeOff } from "lucide-react";
import { ApiError, setToken } from "@/lib/api";
import { changePassword } from "@/lib/api/profile";
import { cn } from "@/lib/utils";

export default function PasswordPage() {
  const router = useRouter();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const checks = useMemo(
    () => ({
      len: next.length >= 8,
      letter: /[A-Za-z]/.test(next),
      number: /\d/.test(next),
    }),
    [next],
  );
  const newValid = checks.len && checks.letter && checks.number;
  const canSubmit = current.length > 0 && newValid && confirm === next && confirm.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setErrors({});
    try {
      const { token } = await changePassword({
        current_password: current,
        password: next,
        password_confirmation: confirm,
      });
      // Giữ nguyên phiên: thay token mới, KHÔNG bắt đăng nhập lại.
      setToken(token);
      toast.success("Đã đổi mật khẩu");
      router.replace("/profile");
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.errors)) mapped[k] = v[0];
        setErrors(mapped);
      } else {
        toast.error(err instanceof ApiError ? err.message : "Không đổi được mật khẩu.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700 hover:text-accent-700">
        <ArrowLeft className="size-4" strokeWidth={2.75} /> Quay lại hồ sơ
      </Link>

      <div className="mt-4 rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 p-8">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent-100 text-accent-700">
          <Lock className="size-7" strokeWidth={2.75} />
        </span>
        <h2 className="mt-4 font-display text-[30px] font-bold text-text">Đổi mật khẩu</h2>
        <p className="mt-1 text-[14.5px] text-neutral-700">Đổi xong em vẫn ở trong ứng dụng, không phải đăng nhập lại.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <div className="field">
            <label htmlFor="current">Mật khẩu hiện tại</label>
            <div className="relative">
              <input id="current" type={show ? "text" : "password"} className="input pr-12" value={current}
                onChange={(e) => { setCurrent(e.target.value); setErrors((x) => ({ ...x, current_password: "" })); }}
                autoComplete="current-password" aria-invalid={!!errors.current_password} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-accent-700">
                {show ? <EyeOff className="size-5" strokeWidth={2.75} /> : <Eye className="size-5" strokeWidth={2.75} />}
              </button>
            </div>
            {errors.current_password && <span className="text-xs font-medium text-danger">{errors.current_password}</span>}
          </div>

          <div className="field">
            <label htmlFor="new">Mật khẩu mới</label>
            <input id="new" type={show ? "text" : "password"} className="input" value={next}
              onChange={(e) => { setNext(e.target.value); setErrors((x) => ({ ...x, password: "" })); }}
              autoComplete="new-password" aria-invalid={!!errors.password} />
            {errors.password && <span className="text-xs font-medium text-danger">{errors.password}</span>}
          </div>

          <div className="field">
            <label htmlFor="confirm">Nhập lại mật khẩu mới</label>
            <input id="confirm" type={show ? "text" : "password"} className="input" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => { if (confirm && confirm !== next) setErrors((x) => ({ ...x, confirm: "Hai mật khẩu chưa giống nhau" })); }}
              autoComplete="new-password" aria-invalid={!!errors.confirm} />
            {errors.confirm && <span className="text-xs font-medium text-danger">{errors.confirm}</span>}
          </div>

          {/* Checklist realtime */}
          <div className="rounded-[var(--radius-lg)] bg-accent-2-200 px-4 py-3">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-accent-2-900">Mật khẩu tốt nên có</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              <Rule ok={checks.len} text="Ít nhất 8 ký tự" />
              <Rule ok={checks.letter} text="Có chữ cái" />
              <Rule ok={checks.number} text="Có chữ số" />
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Link href="/profile" className="btn btn-ghost">Huỷ</Link>
            <button type="submit" disabled={!canSubmit || submitting} className="btn btn-primary min-w-[150px]">
              {submitting ? "Đang đổi…" : "Đổi mật khẩu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className={cn("flex size-5 items-center justify-center rounded-full", ok ? "bg-accent-2-600 text-neutral-100" : "bg-neutral-200 text-neutral-400")}>
        <Check className="size-3.5" strokeWidth={3} />
      </span>
      <span className={cn(ok ? "font-semibold text-accent-2-900" : "text-neutral-600")}>{text}</span>
    </li>
  );
}
