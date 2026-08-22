"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Palette,
  ShieldCheck,
  Target,
  Bell,
  Mail,
  Settings as SettingsIcon,
  History,
  RotateCcw,
  Save,
  Send,
  AlertTriangle,
  Monitor,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { useRequireSuperAdmin } from "@/lib/access-guard";
import {
  getSettings,
  updateSettings,
  resetSettingsGroup,
  uploadSettingFile,
  deleteSettingFile,
  testMail,
} from "@/lib/api/settings";
import type { SettingsResponse, SettingValue } from "@/lib/types/setting";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SettingControl } from "@/features/settings/setting-control";
import { SettingsHistoryModal } from "@/features/settings/settings-history-modal";
import { applyPrimaryColor } from "@/components/branding-loader";

const GROUP_ICON: Record<string, typeof Palette> = {
  palette: Palette,
  shield: ShieldCheck,
  target: Target,
  bell: Bell,
  mail: Mail,
  settings: SettingsIcon,
};

const ICON_BG: Record<string, string> = {
  brand: "bg-brand-soft text-brand-bold",
  exam: "bg-info-soft text-info",
  grading: "bg-success-soft text-success-bold",
  notify: "bg-warning-soft text-warning",
  mail: "bg-skill-speaking-soft text-skill-speaking",
  system: "bg-surface-alt text-text-secondary",
};

function norm(v: SettingValue): string | boolean {
  if (typeof v === "boolean") return v;
  if (v === null || v === undefined) return "";
  return String(v);
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsInner />
    </Suspense>
  );
}

function SettingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Không phải super admin → tự đưa về dashboard (không hiện màn "không có quyền").
  const { allowed, ready } = useRequireSuperAdmin("/teacher");

  const [data, setData] = useState<SettingsResponse | null>(null);
  const [draft, setDraft] = useState<Record<string, SettingValue>>({});
  const [initial, setInitial] = useState<Record<string, SettingValue>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [mailVerified, setMailVerified] = useState(false);

  const [mailTestOpen, setMailTestOpen] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [mailTesting, setMailTesting] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);

  const activeGroup = searchParams.get("group") ?? "brand";

  const applyData = useCallback((res: SettingsResponse) => {
    setData(res);
    const map: Record<string, SettingValue> = {};
    for (const g of res.groups) for (const f of g.fields) map[f.key] = f.value;
    setDraft(map);
    setInitial({ ...map });
    setMailVerified(res.meta.mail_verified);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getSettings()
      .then(applyData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Không tải được cài đặt."))
      .finally(() => setLoading(false));
  }, [applyData]);

  // Chỉ tải khi đã xác thực và đủ quyền (guard sẽ điều hướng nếu thiếu quyền).
  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    getSettings()
      .then((res) => !cancelled && applyData(res))
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Không tải được cài đặt.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [allowed, applyData]);

  const dirtyKeys = useMemo(
    () => Object.keys(draft).filter((k) => norm(draft[k]) !== norm(initial[k])),
    [draft, initial],
  );

  const dirtyByGroup = useMemo(() => {
    const out: Record<string, number> = {};
    if (!data) return out;
    for (const g of data.groups) out[g.key] = g.fields.filter((f) => dirtyKeys.includes(f.key)).length;
    return out;
  }, [data, dirtyKeys]);

  // Xem thử màu hệ thống ngay khi chọn (chưa cần Lưu). Rời trang / reload mà không lưu →
  // cleanup áp lại màu đã lưu (initial), nên màu preview không dính lại.
  const previewColor = draft["brand.primary_color"];
  const savedColor = initial["brand.primary_color"];
  useEffect(() => {
    if (typeof previewColor === "string") applyPrimaryColor(previewColor);
    return () => {
      if (typeof savedColor === "string") applyPrimaryColor(savedColor);
    };
  }, [previewColor, savedColor]);

  // Cảnh báo khi rời trang còn thay đổi chưa lưu.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyKeys.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyKeys.length]);

  function setValue(key: string, value: SettingValue) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      // Chọn Gmail → tự điền máy chủ.
      if (key === "mail.provider" && value === "gmail") {
        next["mail.host"] = "smtp.gmail.com";
        next["mail.port"] = 587;
        next["mail.encryption"] = "tls";
      }
      return next;
    });
  }

  function switchGroup(g: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("group", g);
    router.replace(`/teacher/settings?${params.toString()}`);
  }

  async function handleSave() {
    if (dirtyKeys.length === 0) return;
    setSaving(true);
    const payload: Record<string, SettingValue> = {};
    for (const k of dirtyKeys) payload[k] = draft[k];
    try {
      await updateSettings(payload);
      toast.success(`Đã lưu ${dirtyKeys.length} thay đổi`);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const first = Object.values(err.errors)[0]?.[0];
        toast.error(first ?? err.message);
      } else {
        toast.error(err instanceof ApiError ? err.message : "Không lưu được cài đặt.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleResetGroup() {
    setConfirmReset(false);
    try {
      await resetSettingsGroup(activeGroup);
      toast.success("Đã khôi phục mặc định cho nhóm này.");
      load();
    } catch {
      toast.error("Không khôi phục được.");
    }
  }

  async function handleUpload(key: string, file: File) {
    try {
      const { url } = await uploadSettingFile(key, file);
      setValue(key, url); // chỉ vào draft — ghi vào settings khi bấm Lưu
      toast.success("Đã tải ảnh lên. Nhớ bấm Lưu để áp dụng.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không tải được ảnh.");
    }
  }

  async function handleDeleteFile(key: string) {
    try {
      await deleteSettingFile(key);
      toast.success("Đã xoá tệp.");
      load();
    } catch {
      toast.error("Không xoá được tệp.");
    }
  }

  async function runMailTest() {
    setMailTesting(true);
    setMailError(null);
    const cfg: Record<string, SettingValue> = {};
    for (const k of ["mail.host", "mail.port", "mail.encryption", "mail.username", "mail.password", "mail.from_name", "mail.from_address"]) {
      cfg[k] = draft[k];
    }
    try {
      const res = await testMail(mailTo, cfg);
      toast.success(res.message);
      setMailVerified(true);
      setMailTestOpen(false);
    } catch (err) {
      setMailError(err instanceof ApiError ? err.message : "Không gửi được email thử.");
    } finally {
      setMailTesting(false);
    }
  }

  // Chưa xác thực xong, hoặc thiếu quyền (đang được guard điều hướng về dashboard).
  if (!ready || !allowed) return <SettingsSkeleton />;

  if (loading) return <SettingsSkeleton />;

  if (error || !data) {
    return (
      <div className="rounded-[20px] border-[1.5px] border-danger/30 bg-danger-soft p-8 text-center">
        <p className="text-sm font-semibold text-danger">{error ?? "Không tải được cài đặt."}</p>
        <button onClick={load} className="mt-4 rounded-full bg-brand px-5 py-2 text-sm font-bold text-white shadow-[0_3px_0_var(--color-brand-bold)]">
          Thử lại
        </button>
      </div>
    );
  }

  const group = data.groups.find((g) => g.key === activeGroup) ?? data.groups[0];
  const totalDirty = dirtyKeys.length;

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* Banner màn hình nhỏ */}
      <div className="mb-4 flex items-center gap-2 rounded-2xl border-[1.5px] border-warning/40 bg-warning-soft px-4 py-3 text-sm font-medium text-text-secondary md:hidden">
        <Monitor className="size-4 shrink-0" /> Đổi cài đặt trên máy tính để có trải nghiệm đầy đủ nhé.
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-text">Cài đặt hệ thống</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Thay đổi có hiệu lực ngay với cả khu quản trị và khu học sinh
            {data.meta.last_saved_at && (
              <> · lần lưu gần nhất {new Date(data.meta.last_saved_at).toLocaleString("vi-VN")}</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {group.key === "mail" && (
            <button
              onClick={() => { setMailError(null); setMailTestOpen(true); }}
              className="inline-flex items-center gap-1.5 rounded-full bg-info px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <Send className="size-4" /> Gửi email thử
            </button>
          )}
          <button
            onClick={() => setHistoryOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface px-4 py-2 text-sm font-semibold text-text-secondary hover:border-border-strong"
          >
            <History className="size-4" /> Lịch sử thay đổi
          </button>
          <button
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface px-4 py-2 text-sm font-semibold text-text-secondary hover:border-border-strong"
          >
            <RotateCcw className="size-4" /> Khôi phục mặc định
          </button>
          <button
            onClick={handleSave}
            disabled={totalDirty === 0 || saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-sm font-bold text-white shadow-[0_3px_0_var(--color-brand-bold)] transition-all active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:shadow-none"
          >
            <Save className="size-4" /> {saving ? "Đang lưu…" : "Lưu cấu hình"}
            {totalDirty > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-bold">{totalDirty}</span>
            )}
          </button>
        </div>
      </div>

      {/* Dropdown nhóm (màn nhỏ) */}
      <div className="mt-5 lg:hidden">
        <Select block value={activeGroup} onChange={(e) => switchGroup(e.target.value)}>
          {data.groups.map((g) => (
            <option key={g.key} value={g.key}>{g.label} ({g.fields.length} mục)</option>
          ))}
        </Select>
      </div>

      <div className="mt-5 flex gap-6">
        {/* Cột trái */}
        <aside className="hidden w-[250px] shrink-0 flex-col gap-2 lg:flex">
          {data.groups.map((g) => {
            const Icon = GROUP_ICON[g.icon] ?? SettingsIcon;
            const isActive = g.key === activeGroup;
            const dirt = dirtyByGroup[g.key] ?? 0;
            return (
              <button
                key={g.key}
                onClick={() => switchGroup(g.key)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                  isActive ? "bg-brand-soft" : "hover:bg-surface-alt",
                )}
              >
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", ICON_BG[g.key] ?? "bg-surface-alt text-text-secondary")}>
                  <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm font-semibold", isActive ? "text-brand-bold" : "text-text")}>{g.label}</span>
                  <span className="block text-xs text-text-muted">{g.fields.length} mục</span>
                </span>
                {dirt > 0 && <span className="size-2 shrink-0 rounded-full bg-brand" />}
              </button>
            );
          })}
          {totalDirty > 0 && (
            <p className="mt-1 px-2 text-xs text-text-muted">
              <span className="mr-1 inline-block size-2 rounded-full bg-brand align-middle" />
              Chấm cam = nhóm có thay đổi chưa lưu.
            </p>
          )}
        </aside>

        {/* Cột phải */}
        <div className="min-w-0 flex-1">
          <section className="overflow-hidden rounded-[20px] border-[1.5px] border-border bg-surface">
            <header className="border-b-[1.5px] border-border bg-surface-alt px-6 py-4">
              <h2 className="font-display text-lg font-bold text-text">{group.label}</h2>
              {group.desc && <p className="mt-0.5 text-sm text-text-secondary">{group.desc}</p>}
            </header>
            <div className="divide-y divide-border">
              {group.fields.map((field) => (
                <div key={field.key} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 sm:max-w-[46%]">
                    <label htmlFor={field.key} className="block text-sm font-semibold text-text">
                      {field.label}
                      {field.required && <span className="ml-0.5 text-danger">*</span>}
                      {dirtyKeys.includes(field.key) && <span className="ml-2 inline-block size-1.5 rounded-full bg-brand align-middle" />}
                    </label>
                    {field.hint && <p className="mt-0.5 text-[11px] leading-snug text-text-muted">{field.hint}</p>}
                  </div>
                  <div className="sm:pt-0.5">
                    {field.key === "mail.enabled" && !mailVerified ? (
                      <div className="flex flex-col items-start gap-1">
                        <div className="opacity-50" title="Cần gửi email thử thành công trước">
                          <SettingControl field={field} value={false} onChange={() => {}} onUpload={handleUpload} onDeleteFile={handleDeleteFile} />
                        </div>
                        <span className="text-[11px] text-text-muted">Gửi email thử thành công để mở khoá.</span>
                      </div>
                    ) : (
                      <SettingControl
                        field={field}
                        value={draft[field.key]}
                        onChange={setValue}
                        onUpload={handleUpload}
                        onDeleteFile={handleDeleteFile}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <SettingsHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} onReverted={load} />

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleResetGroup}
        title="Khôi phục mặc định?"
        confirmLabel="Khôi phục"
        danger
        description={`Chỉ nhóm "${group.label}" sẽ trở về giá trị mặc định. Các nhóm khác giữ nguyên.`}
      />

      {/* Modal gửi email thử */}
      <Modal
        open={mailTestOpen}
        onClose={() => setMailTestOpen(false)}
        title="Gửi email thử"
        footer={
          <>
            <button onClick={() => setMailTestOpen(false)} className="rounded-full border-[1.5px] border-border px-4 py-2 text-sm font-semibold text-text-secondary">Huỷ</button>
            <button
              onClick={runMailTest}
              disabled={mailTesting || !mailTo}
              className="rounded-full bg-info px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {mailTesting ? "Đang gửi…" : "Gửi thử"}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">Gửi một thư mẫu bằng cấu hình đang nhập (chưa cần lưu) để kiểm tra.</p>
        <input
          type="email"
          value={mailTo}
          onChange={(e) => setMailTo(e.target.value)}
          placeholder="email-nhan-thu@vidu.com"
          className="mt-3 h-11 w-full rounded-full border-[1.5px] border-border bg-surface px-4 text-sm outline-none focus:border-brand"
        />
        {mailError && (
          <div className="mt-3 rounded-2xl border-[1.5px] border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="size-4" /> Gửi thất bại</p>
            <p className="mt-1 break-words font-mono text-[12px]">{mailError}</p>
            <p className="mt-2 text-[12px] text-text-secondary">Thường gặp: sai mật khẩu ứng dụng, sai cổng, hoặc chưa bật xác minh 2 bước cho Gmail.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-surface-alt" />
      <div className="mt-5 flex gap-6">
        <div className="hidden w-[250px] shrink-0 flex-col gap-2 lg:flex">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface-alt" />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-[20px] bg-surface-alt" />
          ))}
        </div>
      </div>
    </div>
  );
}
