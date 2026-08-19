"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { SubmitConfirmDialog, missingNumbers } from "@/features/tests/submit-confirm";
import { ExitWarnDialog, AutoSubmittedDialog } from "@/features/tests/exit-warn-dialog";
import { Modal } from "@/components/ui/modal";
import { OriginChip } from "@/features/tests/attempt-origin";
import { uploadAttemptAudio, deleteAttemptAudio } from "@/lib/api/tests";
import { ApiError } from "@/lib/api";
import { formatSeconds, useVoiceRecorder } from "@/features/tests/use-voice-recorder";
import {
  formatClock,
  formatRemaining,
  hasAnswer,
  partLabel,
  type Part,
  type Question,
  type Section,
  type TestDetail,
  type TestAttemptState,
} from "@/features/tests/use-test-attempt";

/* ────────────────────────────────────────────────────────────────────────────
   Màn làm bài ĐỀ NÓI (S8s) — một cột 920px, mỗi câu là MỘT khung khép kín 4 tầng:
     1. header  : số câu · loại câu + thời lượng · chip trạng thái · đề bài
     2. tư liệu : ảnh minh hoạ (trái) + gợi ý của cô (phải) — admin cài, thiếu thì ẩn
     3. hành động: nút Ghi âm + nút Upload file (LUÔN hiện cả hai) + meta
     4. nghe lại: chỉ hiện khi câu đã có bản ghi

   Chỉ dùng cho `test.skill === "speaking"`. Reading/Writing/đề hỗn hợp có màn riêng.

   Vòng đời lượt làm (đếm giờ, chống thoát tab, nộp bài) dùng chung `useTestAttempt`;
   riêng bản ghi âm đi qua endpoint audio của lượt, không qua autosave `PUT /answers`.
   ──────────────────────────────────────────────────────────────────────────── */

/** Nguồn bản ghi — quyết định chip ở hàng nghe lại. */
type AudioSource = "rec" | "file";

const UPLOAD_ACCEPT = ".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav";
const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const UPLOAD_HINT = "Chấp nhận .mp3 · .m4a · .wav, tối đa 10MB";

/**
 * Nguồn bản ghi. Server không lưu nguồn (file được đặt tên ngẫu nhiên khi store), nên
 * trong phiên làm bài thì lấy theo thao tác thật của em, còn sau khi tải lại trang thì
 * suy từ đuôi file: định dạng máy ghi ra (webm/mp4/ogg…) khác định dạng em tự tải lên.
 */
function audioSource(url: string, session: AudioSource | undefined): AudioSource {
  if (session) return session;
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  return ["mp3", "wav", "m4a"].includes(ext) ? "file" : "rec";
}

/** Gợi ý của cô: admin nhập mỗi ý một dòng trong ô "Gợi ý" của câu. */
function hintLines(hint: string | null | undefined): string[] {
  return (hint ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*\d.)\s]+/, "").trim())
    .filter(Boolean);
}

/** Kicker loại câu kèm thời lượng yêu cầu: "CÂU 1 · NÓI 45 GIÂY". */
function questionKicker(index: number, question: Question): string {
  const limit = question.record_limit_seconds;
  return limit ? `CÂU ${index} · NÓI ${limit} GIÂY` : `CÂU ${index} · BÀI NÓI`;
}

export function SpeakingTestAttempt({
  attempt,
  test,
}: {
  attempt: TestAttemptState;
  test: TestDetail;
}) {
  const [zoomed, setZoomed] = useState<string | null>(null);
  const [sources, setSources] = useState<Record<number, AudioSource>>({});
  const [savedAt, setSavedAt] = useState<Record<number, string>>({});
  const [lengths, setLengths] = useState<Record<number, number>>({});
  const [uploadError, setUploadError] = useState<Record<number, string>>({});

  const sortedParts = useMemo(() => test.parts.slice().sort((a, b) => a.order - b.order), [test]);
  const groups = useMemo(() => buildGroups(sortedParts), [sortedParts]);
  const allQuestions = useMemo(() => groups.flatMap((g) => g.questions), [groups]);
  const questionIndex = useMemo(
    () => new Map(allQuestions.map((q, i) => [q.id, i + 1])),
    [allQuestions],
  );

  const showPartHeader = sortedParts.length > 1;
  const showSectionHeader = groups.length > 1;
  const answeredCount = allQuestions.filter((q) => hasAnswer(attempt.answers[q.id])).length;
  // Danh sách câu còn trống — hiện rõ trong hộp xác nhận nộp bài để em không bỏ sót.
  const missingList = missingNumbers(allQuestions, (q) => hasAnswer(attempt.answers[q.id]));

  const remainingMs = attempt.deadline ? Math.max(0, attempt.deadline - attempt.now) : null;
  const urgent = remainingMs !== null && remainingMs < 5 * 60_000;

  const setAudioAnswer = attempt.setAudioAnswer;

  /** Bản ghi mới (ghi âm hoặc upload) → thay bản cũ của chính câu đó. */
  const saveAudio = useCallback(
    async (questionId: number, file: File, source: AudioSource, seconds?: number) => {
      const { url } = await uploadAttemptAudio(attempt.attemptId, questionId, file);
      setAudioAnswer(questionId, url);
      setSources((prev) => ({ ...prev, [questionId]: source }));
      setSavedAt((prev) => ({ ...prev, [questionId]: formatClock(new Date()) }));
      if (seconds) setLengths((prev) => ({ ...prev, [questionId]: seconds }));
      setUploadError((prev) => ({ ...prev, [questionId]: "" }));
    },
    [attempt.attemptId, setAudioAnswer],
  );

  const recorder = useVoiceRecorder({
    onFinish: useCallback(
      (questionId: number, file: File, seconds: number) =>
        saveAudio(questionId, file, "rec", seconds),
      [saveAudio],
    ),
  });

  // Hết giờ → hệ thống tự nộp; dừng luôn bản ghi đang chạy để không mất mic.
  const stopRecorder = recorder.stop;
  useEffect(() => {
    if (attempt.submitting) stopRecorder();
  }, [attempt.submitting, stopRecorder]);

  async function handleUpload(question: Question, file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["mp3", "m4a", "wav"].includes(ext)) {
      setUploadError((prev) => ({
        ...prev,
        [question.id]: "Tệp phải là .mp3, .m4a hoặc .wav. Bản ghi cũ vẫn được giữ nguyên.",
      }));
      return;
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      setUploadError((prev) => ({
        ...prev,
        [question.id]: "Tệp nặng quá 10MB. Em nén lại hoặc ghi âm trực tiếp nhé.",
      }));
      return;
    }

    try {
      await saveAudio(question.id, file, "file");
    } catch (err) {
      setUploadError((prev) => ({
        ...prev,
        [question.id]:
          err instanceof ApiError ? err.message : "Không tải được tệp lên. Em thử lại nhé.",
      }));
    }
  }

  async function handleDelete(question: Question) {
    await deleteAttemptAudio(attempt.attemptId, question.id);
    setAudioAnswer(question.id, null);
    setSources((prev) => ({ ...prev, [question.id]: undefined as unknown as AudioSource }));
    setSavedAt((prev) => ({ ...prev, [question.id]: "" }));
  }

  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-[18px] pb-2">
      {/* ── Hàng tiêu đề ── */}
      <div className="flex flex-wrap items-center gap-3.5">
        <Link
          href={attempt.routes.list}
          className="shrink-0 text-[13px] font-bold text-text-secondary transition-colors hover:text-brand-bold"
        >
          ← Thoát
        </Link>
        <h1 className="min-w-0 truncate font-display text-[22px] font-bold leading-tight text-text">
          {test.title}
        </h1>
        <span className="shrink-0 rounded-full bg-brand-soft px-3 py-[5px] text-[11.5px] font-bold text-brand-bold">
          {`BÀI NÓI · ${allQuestions.length} CÂU`}
        </span>
        <OriginChip origin={attempt.origin} />

        {/* Đồng hồ · tiến độ · Nộp bài nằm CÙNG một hàng (đặc tả §3). Đừng xếp chồng
            đồng hồ với dòng tiến độ thành cột: cột đó cao hơn nút 42px nên căn giữa
            xong đồng hồ bị trồi lên, lệch hẳn với nút Nộp bài. */}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div className="flex h-[42px] items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface px-4">
            <span aria-hidden className="text-[13px] text-text-muted">
              ⏱
            </span>
            <span
              className="font-display text-[16px] font-bold tabular-nums"
              style={{ color: urgent ? "#C1442F" : "#3A3330" }}
            >
              {remainingMs !== null ? formatRemaining(remainingMs) : "Không giới hạn"}
            </span>
          </div>

          <p className="whitespace-nowrap text-xs font-semibold text-text-muted">
            Đã ghi {answeredCount}/{allQuestions.length} câu
          </p>

          <button
            type="button"
            onClick={() => attempt.setConfirmSubmit(true)}
            disabled={attempt.submitting}
            className="flex h-[42px] items-center rounded-full bg-brand px-6 text-sm font-bold text-white shadow-[0_3px_0_#D65F27] transition-all hover:bg-brand-bold active:translate-y-[3px] active:shadow-none disabled:opacity-60"
          >
            {attempt.submitting ? "Đang nộp..." : "Nộp bài"}
          </button>
        </div>
      </div>

      {attempt.error && (
        <p className="text-sm font-semibold text-[#C1442F]">{attempt.error}</p>
      )}

      {/* ── Part / Section / khung câu ── */}
      {groups.map((group) => (
        <div key={group.section.id} className="flex flex-col gap-[18px]">
          {showPartHeader && group.isFirstOfPart && (
            <div className="flex items-center gap-3">
              <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 font-display text-xs font-bold uppercase text-brand-bold">
                Part {group.partNumber}
              </span>
              <span className="shrink-0 font-display text-[15px] font-bold text-text">
                {partLabel(group.part)}
              </span>
              <span className="h-[1.5px] flex-1 bg-border" />
            </div>
          )}

          {showSectionHeader && (
            <div className="flex flex-wrap items-baseline gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">
                Section {group.sectionLetter}
              </span>
              {group.section.instruction && (
                <span className="text-xs font-semibold text-text-muted">
                  {group.section.instruction}
                </span>
              )}
            </div>
          )}

          {group.questions.map((question) => (
            <QuestionFrame
              key={question.id}
              question={question}
              index={questionIndex.get(question.id) ?? question.order}
              recordedUrl={attempt.answers[question.id]?.answer_file_url ?? null}
              source={sources[question.id]}
              savedAt={savedAt[question.id]}
              knownLength={lengths[question.id]}
              recorder={recorder}
              uploadError={uploadError[question.id]}
              locked={attempt.submitting}
              onStartRecord={() => recorder.start(question.id, question.record_limit_seconds ?? null)}
              onStopRecord={recorder.stop}
              onUpload={(file) => handleUpload(question, file)}
              onDelete={() => handleDelete(question)}
              onZoom={setZoomed}
            />
          ))}
        </div>
      ))}

      {/* ── Hàng hành động cuối trang ── */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[12.5px] font-semibold text-text-secondary">
          Mỗi câu em có thể ghi lại nhiều lần, cô chỉ nghe bản cuối.
        </p>
        <div className="ml-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={attempt.saveNow}
            className="flex h-11 items-center rounded-full border-[1.5px] border-border bg-surface px-5 text-sm font-bold text-text transition-colors hover:border-brand hover:text-brand-bold"
          >
            Lưu nháp
          </button>
          <button
            type="button"
            onClick={() => attempt.setConfirmSubmit(true)}
            disabled={attempt.submitting}
            className="flex h-11 items-center rounded-full bg-brand px-6 text-sm font-bold text-white shadow-[0_3px_0_#D65F27] transition-all hover:bg-brand-bold active:translate-y-[3px] active:shadow-none disabled:opacity-60"
          >
            {attempt.submitting ? "Đang nộp..." : "Nộp bài"}
          </button>
        </div>
      </div>

      {/* Xem ảnh minh hoạ cỡ lớn */}
      <Modal open={zoomed !== null} onClose={() => setZoomed(null)} size="lg" title="Hình minh hoạ">
        {zoomed && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoomed} alt="Hình minh hoạ" className="max-h-[70vh] w-full object-contain" />
            <button
              type="button"
              onClick={() => setZoomed(null)}
              aria-label="Đóng ảnh"
              className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-surface/90 text-text-secondary hover:text-text"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </Modal>

      <SubmitConfirmDialog
        open={attempt.confirmSubmit}
        onClose={() => attempt.setConfirmSubmit(false)}
        onConfirm={() => {
          attempt.setConfirmSubmit(false);
          attempt.handleSubmit();
        }}
        missing={missingList}
        total={allQuestions.length}
        verb="chưa ghi âm"
      />

      <ExitWarnDialog
        open={attempt.exitWarn !== null && !attempt.autoSubmitted}
        onClose={() => attempt.setExitWarn(null)}
        count={attempt.exitWarn?.count ?? 0}
        limit={attempt.exitWarn?.limit ?? attempt.exitLimit}
        action={attempt.exitAction}
      />

      <AutoSubmittedDialog
        open={attempt.autoSubmitted}
        onClose={attempt.goToResult}
        limit={attempt.exitLimit}
      />
    </div>
  );
}

/* ── Khung câu hỏi 4 tầng ─────────────────────────────────────────────────── */

function QuestionFrame({
  question,
  index,
  recordedUrl,
  source,
  savedAt,
  knownLength,
  recorder,
  uploadError,
  locked,
  onStartRecord,
  onStopRecord,
  onUpload,
  onDelete,
  onZoom,
}: {
  question: Question;
  index: number;
  recordedUrl: string | null;
  source: AudioSource | undefined;
  savedAt: string | undefined;
  knownLength: number | undefined;
  recorder: ReturnType<typeof useVoiceRecorder>;
  uploadError: string | undefined;
  locked: boolean;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onUpload: (file: File) => void;
  onDelete: () => Promise<void>;
  onZoom: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const recording = recorder.recordingFor === question.id;
  const uploading = recorder.uploadingFor === question.id;
  const recorderError =
    recorder.error?.questionId === question.id ? recorder.error.message : undefined;

  const images = question.images ?? [];
  const hints = hintLines(question.hint);
  const hasMedia = images.length > 0 || hints.length > 0;

  const borderColor = recording ? "#F2793B" : recordedUrl ? "#DCEBBC" : "#EFE7D4";

  const status = recording
    ? { label: "Đang ghi âm…", bg: "#FDEBDD", fg: "#D65F27" }
    : recordedUrl
      ? { label: "Đã có bài nói", bg: "#F1F8DE", fg: "#5E8418" }
      : { label: "Chưa trả lời", bg: "#F5EFDF", fg: "#8A8073" };

  const meta = recording
    ? 'Em bấm "Dừng ghi" khi nói xong'
    : uploading
      ? "Đang tải bản ghi lên…"
      : recordedUrl
        ? savedAt
          ? `Đã lưu nháp ${savedAt}`
          : "Đã có bài nói"
        : UPLOAD_HINT;

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article
      className="overflow-hidden rounded-[22px] bg-surface"
      style={{ border: `2px solid ${borderColor}` }}
    >
      {/* Tầng 1 — header */}
      <div
        className="px-6 py-5"
        style={{
          background: recording ? "#FDEBDD" : "#FDFBF3",
          borderBottom: `1.5px solid ${recording ? "#F7C6A4" : "#EFE7D4"}`,
        }}
      >
        <div className="flex items-center gap-[11px]">
          <span
            className="flex size-[30px] shrink-0 items-center justify-center rounded-[10px] font-display text-[13.5px] font-bold"
            style={
              recordedUrl
                ? { background: "#F2793B", color: "#FFFFFF" }
                : { background: "#F5EFDF", color: "#8A8073" }
            }
          >
            {index}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">
            {questionKicker(index, question)}
          </span>
          <span
            className="ml-auto shrink-0 rounded-full px-3 py-1 text-[11.5px] font-bold"
            style={{ background: status.bg, color: status.fg }}
          >
            {status.label}
          </span>
        </div>

        {question.content && (
          <p className="mt-2.5 font-display text-[19px] font-bold leading-[1.45] text-text [text-wrap:pretty]">
            {question.content}
          </p>
        )}
      </div>

      {/* Tầng 2 — hình minh hoạ + gợi ý (admin cài; thiếu thì ẩn hẳn) */}
      {hasMedia && (
        <div className="flex gap-5 px-6 py-5">
          {images.length > 0 && (
            <div className="w-[250px] shrink-0">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">
                Hình minh hoạ
              </p>
              <button
                type="button"
                onClick={() => onZoom(images[0])}
                aria-label="Xem hình minh hoạ cỡ lớn"
                className="block overflow-hidden rounded-[16px] border-[1.5px] border-border transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[0]}
                  alt="Hình minh hoạ của câu hỏi"
                  className="h-[168px] w-[250px] object-cover"
                />
              </button>
              {images.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {images.slice(1).map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      type="button"
                      onClick={() => onZoom(url)}
                      aria-label={`Xem hình minh hoạ ${i + 2}`}
                      className="overflow-hidden rounded-xl border-[1.5px] border-border transition-colors hover:border-brand"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="size-[54px] object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {hints.length > 0 && (
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">
                Gợi ý của cô
              </p>
              <div className="flex flex-col gap-2.5 rounded-[16px] border-[1.5px] border-border bg-surface-alt px-[18px] py-4">
                {hints.map((line, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold"
                      style={{ background: "#F1F8DE", color: "#5E8418" }}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 text-sm font-semibold leading-[1.65] text-text">
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tầng 3 — hàng hành động: LUÔN có cả Ghi âm và Upload file */}
      <div className="border-t-[1.5px] border-border bg-surface-alt px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={recording ? onStopRecord : onStartRecord}
            disabled={locked || uploading}
            className="flex h-[46px] items-center gap-2.5 rounded-full px-[22px] text-sm font-bold transition-all disabled:opacity-60"
            style={
              recording
                ? { background: "#FFFFFF", border: "2px solid #C1442F", color: "#C1442F" }
                : {
                    background: "#F2793B",
                    border: "2px solid #F2793B",
                    color: "#FFFFFF",
                    boxShadow: "0 3px 0 #D65F27",
                  }
            }
          >
            <span
              aria-hidden
              className="size-[11px] shrink-0 rounded-full"
              style={{ background: recording ? "#C1442F" : "#FFFFFF" }}
            />
            {recording ? "Dừng ghi" : recordedUrl ? "Ghi âm lại" : "Ghi âm"}
          </button>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={locked || recording || uploading}
            className="flex h-[46px] items-center rounded-full border-[1.5px] border-border bg-surface px-5 text-sm font-bold text-text transition-colors hover:border-brand hover:text-brand-bold disabled:opacity-60"
          >
            ↑ Upload file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={UPLOAD_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ""; // chọn lại đúng tệp vừa lỗi vẫn kích hoạt onChange
              if (file) onUpload(file);
            }}
          />

          {recording && <RecordingWave />}

          <span className="ml-auto text-[11.5px] font-semibold text-text-muted">
            {recording ? `${meta} · ${formatSeconds(recorder.elapsed)}` : meta}
          </span>
        </div>

        {(uploadError || recorderError) && (
          <p className="mt-2.5 text-[12.5px] font-semibold text-[#C1442F]">
            {uploadError || recorderError}
          </p>
        )}
      </div>

      {/* Tầng 4 — nghe lại (chỉ khi đã có bản ghi) */}
      {recordedUrl && !recording && (
        <PlaybackRow
          url={recordedUrl}
          source={audioSource(recordedUrl, source)}
          knownLength={knownLength}
          deleting={deleting}
          canDelete={!locked}
          onDelete={handleDelete}
        />
      )}
    </article>
  );
}

/** 5 vạch sóng âm, chỉ hiện lúc đang ghi. */
function RecordingWave() {
  return (
    <span aria-hidden className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="w-[3.5px] rounded-full"
          style={{
            height: 26,
            background: "#F2793B",
            animation: "speaking-wave 0.9s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <style>{`@keyframes speaking-wave{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}`}</style>
    </span>
  );
}

/* ── Hàng nghe lại ────────────────────────────────────────────────────────── */

function PlaybackRow({
  url,
  source,
  knownLength,
  deleting,
  canDelete,
  onDelete,
}: {
  url: string;
  source: AudioSource;
  knownLength: number | undefined;
  deleting: boolean;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);

  // MediaRecorder (Chrome) hay trả duration = Infinity cho webm → dùng độ dài đã đo
  // lúc ghi làm số hiển thị, thanh tua vẫn chạy theo currentTime.
  const total = duration ?? knownLength ?? null;

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }

  function seek(event: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !total) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * total;
    setCurrent(audio.currentTime);
  }

  const progress = total ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div className="flex items-center gap-[13px] border-t-[1.5px] border-border bg-surface px-6 py-3.5">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const value = e.currentTarget.duration;
          setDuration(Number.isFinite(value) && value > 0 ? value : null);
        }}
      />

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Tạm dừng" : "Nghe lại bài nói"}
        className="flex size-[38px] shrink-0 items-center justify-center rounded-full text-sm"
        style={{ background: "#FDEBDD", color: "#D65F27" }}
      >
        {playing ? "⏸" : "▶"}
      </button>

      <div
        role="presentation"
        onClick={seek}
        className="h-2 flex-1 cursor-pointer rounded-full"
        style={{ background: "#F0EADA" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${progress}%`, background: "#F2793B" }}
        />
      </div>

      <span className="shrink-0 font-display text-[13.5px] font-bold text-text-secondary">
        {total ? formatSeconds(total) : "--:--"}
      </span>

      <span
        className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold"
        style={
          source === "file"
            ? { background: "#E4F5FD", color: "#2380A8" }
            : { background: "#FDEBDD", color: "#D65F27" }
        }
      >
        {source === "file" ? "Tệp đã tải lên" : "Ghi âm trên web"}
      </span>

      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="shrink-0 text-[12.5px] font-bold text-text-secondary transition-colors hover:text-[#C1442F] disabled:opacity-60"
        >
          {deleting ? "Đang xoá…" : "Xoá"}
        </button>
      )}
    </div>
  );
}

/* ── Gom part/section/câu theo thứ tự hiển thị (chỉ giữ section có câu) ── */

type Group = {
  part: Part;
  partNumber: number;
  section: Section;
  sectionLetter: string;
  isFirstOfPart: boolean;
  questions: Question[];
};

function buildGroups(sortedParts: Part[]): Group[] {
  const groups: Group[] = [];
  let sectionOrdinal = 0;

  sortedParts.forEach((part, partIdx) => {
    let isFirstOfPart = true;

    part.sections
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((section) => {
        const questions = section.questions.slice().sort((a, b) => a.order - b.order);
        if (questions.length === 0) return;

        groups.push({
          part,
          partNumber: partIdx + 1,
          section,
          sectionLetter: String.fromCharCode(65 + sectionOrdinal),
          isFirstOfPart,
          questions,
        });
        sectionOrdinal += 1;
        isFirstOfPart = false;
      });
  });

  return groups;
}
