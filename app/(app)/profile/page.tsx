"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { KeyRound, MonitorSmartphone, LogOut, Lock, Camera, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getMe, updateProfile, uploadAvatar, deleteAvatar, logoutOthers } from "@/lib/api/profile";
import type { Gender, Profile } from "@/lib/types/profile";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AvatarCropper } from "@/features/profile/avatar-cropper";

type Form = {
  name: string;
  phone: string;
  birthday: string;
  gender: Gender | "";
  address: string;
  facebook_url: string;
};

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "unspecified", label: "Không muốn nêu" },
];

function toForm(p: Profile): Form {
  return {
    name: p.name ?? "",
    phone: p.phone ?? "",
    birthday: p.birthday ?? "",
    gender: p.gender ?? "",
    address: p.address ?? "",
    facebook_url: p.facebook_url ?? "",
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { refreshUser, logout } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Form>({ name: "", phone: "", birthday: "", gender: "", address: "", facebook_url: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [nowTs] = useState(() => Date.now());
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [confirmDeleteAvatar, setConfirmDeleteAvatar] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getMe()
      .then((p) => {
        setProfile(p);
        setForm(toForm(p));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Không tải được hồ sơ."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setForm(toForm(p));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Không tải được hồ sơ.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(() => (profile ? JSON.stringify(form) !== JSON.stringify(toForm(profile)) : false), [form, profile]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: "" }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Em nhập họ tên nhé";
    if (form.phone && !/^0[\d\s]{9,}$/.test(form.phone.trim())) e.phone = "Số điện thoại chưa đúng";
    if (form.birthday) {
      const d = new Date(form.birthday);
      if (d.getTime() > Date.now()) e.birthday = "Em kiểm tra lại ngày sinh nhé";
    }
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      await updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        birthday: form.birthday || null,
        gender: form.gender || null,
        address: form.address.trim() || null,
        facebook_url: form.facebook_url.trim() || null,
      });
      const fresh = await getMe();
      setProfile(fresh);
      setForm(toForm(fresh));
      setSavedAt(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
      await refreshUser();
      toast.success("Đã lưu hồ sơ");
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.errors)) mapped[k] = v[0];
        setFieldErrors(mapped);
      } else {
        toast.error(err instanceof ApiError ? err.message : "Không lưu được, thử lại nhé.");
      }
    } finally {
      setSaving(false);
    }
  }

  function pickAvatar() {
    fileRef.current?.click();
  }
  function onFilePicked(file: File) {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Chỉ nhận ảnh JPG hoặc PNG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh nặng quá 2MB, em chọn ảnh khác nhé.");
      return;
    }
    setCropFile(file);
  }
  async function onCropDone(blob: Blob) {
    setUploadingAvatar(true);
    try {
      await uploadAvatar(blob);
      const fresh = await getMe();
      setProfile(fresh);
      await refreshUser();
      setCropFile(null);
      toast.success("Đã đổi ảnh đại diện");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không tải được ảnh.");
    } finally {
      setUploadingAvatar(false);
    }
  }
  async function removeAvatar() {
    setConfirmDeleteAvatar(false);
    try {
      await deleteAvatar();
      const fresh = await getMe();
      setProfile(fresh);
      await refreshUser();
      toast.success("Đã xoá ảnh, dùng chữ cái đầu");
    } catch {
      toast.error("Không xoá được ảnh.");
    }
  }

  async function handleLogoutOthers() {
    try {
      const { revoked_count } = await logoutOthers();
      const fresh = await getMe();
      setProfile(fresh);
      toast.success(`Đã đăng xuất ${revoked_count} thiết bị khác`);
    } catch {
      toast.error("Không thực hiện được.");
    }
  }
  async function handleLogout() {
    setConfirmLogout(false);
    await logout();
    router.replace("/login");
  }

  if (loading) return <ProfileSkeleton />;
  if (error || !profile) {
    return (
      <div className="rounded-[var(--radius-lg)] border-[1.5px] border-danger/30 bg-danger-soft p-6 text-center">
        <p className="text-sm font-semibold text-danger">{error ?? "Không tải được hồ sơ."}</p>
        <button onClick={load} className="btn btn-primary mt-4">Thử lại</button>
      </div>
    );
  }

  const initial2 = (profile.name || "?").trim().split(/\s+/).map((w) => w[0]).slice(-2).join("").toUpperCase();
  const monthsSincePw = profile.password_changed_at
    ? Math.max(0, Math.round((nowTs - new Date(profile.password_changed_at).getTime()) / (30 * 86_400_000)))
    : null;

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-0">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[1.2px] text-accent-700">Tài khoản của em</p>
        <h1 className="mt-1 font-display text-[clamp(30px,5vw,46px)] font-bold leading-tight text-text">Hồ sơ cá nhân</h1>
        <p className="mt-2 max-w-[620px] text-base text-neutral-700">
          Cập nhật thông tin để cô Uyên liên lạc với em dễ hơn. Email đăng nhập không đổi được ở đây.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Cột trái */}
        <div className="flex flex-col gap-6">
          {/* Thông tin cá nhân */}
          <section className="rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 p-7">
            <h2 className="font-display text-xl font-bold text-text">Thông tin cá nhân</h2>
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field className="sm:col-span-2" label="Họ và tên" required error={fieldErrors.name} htmlFor="name">
                <input id="name" className="input" maxLength={100} value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  onBlur={() => { if (!form.name.trim()) setFieldErrors((x) => ({ ...x, name: "Em nhập họ tên nhé" })); }}
                  aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? "name-err" : undefined} />
              </Field>

              <Field className="sm:col-span-2" label="Email" htmlFor="email" hint="">
                <div className="relative">
                  <input id="email" className="input pr-10 cursor-not-allowed" style={{ background: "var(--color-neutral-200)" }}
                    value={profile.email} disabled aria-describedby="email-note" />
                  <Lock className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" strokeWidth={2.75} />
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-neutral-600">
                    <Lock className="size-3" strokeWidth={2.75} /> Không đổi được
                  </span>
                </div>
                <p id="email-note" className="mt-1 text-[11.5px] text-neutral-600">
                  Email là tên đăng nhập của em nên không sửa được. Cần đổi thì nhắn cô Uyên.
                </p>
              </Field>

              <Field label="Số điện thoại" htmlFor="phone" error={fieldErrors.phone}>
                <input id="phone" className="input" inputMode="tel" value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  onBlur={() => { if (form.phone && !/^0[\d\s]{9,}$/.test(form.phone.trim())) setFieldErrors((x) => ({ ...x, phone: "Số điện thoại chưa đúng" })); }}
                  aria-invalid={!!fieldErrors.phone} placeholder="0912 345 678" />
              </Field>

              <Field label="Ngày sinh" htmlFor="birthday" error={fieldErrors.birthday}>
                <input id="birthday" type="date" className="input" value={form.birthday}
                  onChange={(e) => set("birthday", e.target.value)} aria-invalid={!!fieldErrors.birthday} />
              </Field>

              <Field className="sm:col-span-2" label="Giới tính">
                <div className="seg mt-1 max-w-[420px]">
                  {GENDERS.map((g) => (
                    <label key={g.value} className="seg-opt">
                      <input type="radio" name="gender" checked={form.gender === g.value}
                        onChange={() => set("gender", g.value)} />
                      {g.label}
                    </label>
                  ))}
                </div>
              </Field>

              <Field className="sm:col-span-2" label="Địa chỉ" htmlFor="address">
                <input id="address" className="input" maxLength={255} value={form.address}
                  onChange={(e) => set("address", e.target.value)} />
              </Field>

              <Field className="sm:col-span-2" label="Link Facebook" htmlFor="fb" error={fieldErrors.facebook_url}
                hint={form.facebook_url && !form.facebook_url.toLowerCase().includes("facebook") ? "Trông không giống link Facebook, nhưng vẫn lưu được nếu là URL hợp lệ." : ""}>
                <input id="fb" className="input" value={form.facebook_url}
                  onChange={(e) => set("facebook_url", e.target.value)} placeholder="facebook.com/ten-cua-em" />
              </Field>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-divider pt-4">
              <p className="text-[12.5px] text-neutral-600">
                {savedAt ? `Đã lưu lúc ${savedAt}` : "Thay đổi được lưu khi em bấm nút."}
              </p>
              <div className="ml-auto flex gap-2">
                {dirty && (
                  <button type="button" onClick={() => profile && setForm(toForm(profile))} className="btn btn-ghost">
                    Hoàn tác
                  </button>
                )}
                <button type="button" onClick={handleSave} disabled={!dirty || saving} className="btn btn-primary min-w-[150px]">
                  {saving ? "Đang lưu…" : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </section>

          {/* Bảo mật */}
          <section className="rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 p-7">
            <h2 className="font-display text-xl font-bold text-text">Bảo mật</h2>
            <div className="mt-4 flex flex-col gap-3">
              <SecurityRow icon={KeyRound} title="Mật khẩu"
                desc={monthsSincePw !== null ? `Đổi lần cuối ${monthsSincePw} tháng trước` : "Em nên đổi mật khẩu định kỳ"}>
                <Link href="/profile/password" className="btn btn-secondary">Đổi mật khẩu</Link>
              </SecurityRow>

              <SecurityRow icon={MonitorSmartphone} title="Thiết bị đang đăng nhập"
                desc={profile.active_sessions_count > 1 ? `${profile.active_sessions_count} thiết bị đang đăng nhập` : "Chỉ có thiết bị này đang đăng nhập"}>
                <button type="button" onClick={handleLogoutOthers} disabled={profile.active_sessions_count <= 1}
                  className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50">
                  Đăng xuất máy khác
                </button>
              </SecurityRow>

              <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border-[1.5px] border-accent-300 bg-accent-100 px-4 py-3">
                <span className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-accent-200 text-accent-800">
                  <LogOut className="size-5" strokeWidth={2.75} />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[15px] font-bold text-accent-900">Đăng xuất khỏi thiết bị này</p>
                  <p className="text-[12.5px] text-accent-800">Kết thúc phiên trên trình duyệt này.</p>
                </div>
                <button type="button" onClick={() => setConfirmLogout(true)} className="btn btn-primary ml-auto">Đăng xuất</button>
              </div>
            </div>
          </section>
        </div>

        {/* Cột phải */}
        <div className="flex flex-col gap-6">
          {/* Avatar */}
          <section className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] bg-accent p-7 text-center">
            <div className="flex size-[112px] items-center justify-center overflow-hidden rounded-full border-4 font-display text-3xl font-bold text-bg"
              style={{ borderColor: "color-mix(in srgb, #fff 40%, transparent)", background: "color-mix(in srgb, #fff 18%, transparent)" }}>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Ảnh đại diện" className="size-full object-cover" />
              ) : (
                initial2
              )}
            </div>
            <p className="font-display text-2xl font-bold text-bg">{profile.name}</p>
            {profile.classroom && <p className="text-sm" style={{ color: "color-mix(in srgb, #fff 84%, transparent)" }}>{profile.classroom.name}</p>}

            <button type="button" onClick={pickAvatar} className="btn btn-secondary mt-1" style={{ background: "var(--color-bg)" }}>
              <Camera className="size-4" strokeWidth={2.75} /> Đổi ảnh đại diện
            </button>
            {profile.avatar_url && (
              <button type="button" onClick={() => setConfirmDeleteAvatar(true)} className="btn btn-ghost text-bg">
                <Trash2 className="size-4" strokeWidth={2.75} /> Xoá ảnh, dùng chữ cái
              </button>
            )}
            <p className="text-[11.5px]" style={{ color: "color-mix(in srgb, #fff 78%, transparent)" }}>JPG hoặc PNG, tối đa 2MB.</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFilePicked(f); e.target.value = ""; }} />
          </section>

          {/* Thông tin lớp */}
          <section className="rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 p-6">
            <h2 className="font-display text-lg font-bold text-text">Thông tin lớp</h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <InfoRow label="Mã học sinh" value={profile.student_code} />
              <InfoRow label="Lớp" value={profile.classroom?.name ?? "Chưa vào lớp"} />
              <InfoRow label="Giáo viên" value={profile.classroom?.teacher_name ?? "—"} />
              <InfoRow label="Vào lớp từ" value={profile.classroom?.joined_at ?? "—"} />
            </dl>
            <p className="mt-3 rounded-[var(--radius-lg)] bg-accent-2-200 px-3 py-2 text-[12px] text-accent-2-900">
              Thông tin lớp do cô giáo quản lý, em không tự đổi được.
            </p>
          </section>

          <button type="button" onClick={() => setConfirmLogout(true)}
            className="btn btn-secondary border-accent-400 text-accent-800">
            <LogOut className="size-4" strokeWidth={2.75} /> Đăng xuất
          </button>
        </div>
      </div>

      {/* Nút Lưu sticky đáy trên mobile */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-[66px] z-30 border-t border-divider bg-neutral-100 px-4 py-3 md:hidden">
          <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary btn-block">
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      )}

      {cropFile && (
        <AvatarCropper file={cropFile} uploading={uploadingAvatar} onCancel={() => setCropFile(null)} onDone={onCropDone} />
      )}
      <ConfirmDialog open={confirmDeleteAvatar} onClose={() => setConfirmDeleteAvatar(false)} onConfirm={removeAvatar}
        title="Xoá ảnh đại diện?" confirmLabel="Xoá ảnh" description="Ảnh sẽ được thay bằng chữ cái đầu tên em." />
      <ConfirmDialog open={confirmLogout} onClose={() => setConfirmLogout(false)} onConfirm={handleLogout}
        title="Đăng xuất?" confirmLabel="Đăng xuất"
        description={dirty ? "Em có thay đổi chưa lưu — đăng xuất sẽ mất thay đổi đó. Thoát luôn?" : "Em sẽ cần đăng nhập lại lần sau."} />
    </div>
  );
}

function Field({ label, htmlFor, required, error, hint, className, children }: {
  label: string; htmlFor?: string; required?: boolean; error?: string; hint?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={cn("field", className)}>
      <label htmlFor={htmlFor}>{label}{required && <span className="text-danger"> *</span>}</label>
      {children}
      {error && <span id={htmlFor ? `${htmlFor}-err` : undefined} className="text-xs font-medium text-danger">{error}</span>}
      {!error && hint && <span className="text-[11.5px] text-neutral-500">{hint}</span>}
    </div>
  );
}

function SecurityRow({ icon: Icon, title, desc, children }: { icon: typeof KeyRound; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border-[1.5px] border-divider bg-neutral-100 px-4 py-3">
      <span className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-700">
        <Icon className="size-5" strokeWidth={2.75} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-[15px] font-bold text-text">{title}</p>
        <p className="text-[12.5px] text-neutral-600">{desc}</p>
      </div>
      <div className="ml-auto">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-neutral-600">{label}</dt>
      <dd className="font-semibold text-text">{value}</dd>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-neutral-200" />
        <div className="h-[420px] animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />
        <div className="h-48 animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-72 animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />
        <div className="h-48 animate-pulse rounded-[var(--radius-lg)] bg-neutral-200" />
      </div>
    </div>
  );
}
