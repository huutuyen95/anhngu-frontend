"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Ghi âm câu trả lời cho đề Nói — MỘT bản ghi chạy tại một thời điểm cho cả màn.
 * Bắt đầu ghi ở câu khác thì câu đang ghi tự dừng (và tự nộp bản ghi của nó).
 *
 * Mỗi trình duyệt xuất một định dạng khác nhau (Chrome/Android → webm/opus, Safari trên
 * iPhone/iPad/macOS → mp4, Firefox → ogg) nên KHÔNG ép mimeType: để trình duyệt tự chọn rồi
 * đặt đuôi file theo đúng thứ nó trả về. Backend nhận cả nhóm định dạng này.
 *
 * `getUserMedia` chỉ chạy ở ngữ cảnh bảo mật (HTTPS, hoặc localhost khi dev) — không có thì
 * `navigator.mediaDevices` là `undefined`, ta báo rõ thay vì để nút bấm im lặng không phản hồi.
 */

/** Đuôi file theo mimeType trình duyệt trả về — phải khớp danh sách `mimes` ở backend. */
function extensionFor(mimeType: string): string {
  const type = mimeType.split(";")[0].trim().toLowerCase();

  const map: Record<string, string> = {
    "audio/webm": "webm",
    "video/webm": "webm",
    "audio/mp4": "mp4",
    "video/mp4": "mp4",
    "audio/x-m4a": "m4a",
    "audio/aac": "aac",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/3gpp": "3gp",
  };

  return map[type] ?? "webm";
}

export function formatSeconds(total: number): string {
  if (!Number.isFinite(total) || total < 0) return "--:--";
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);

  return `${m}:${s.toString().padStart(2, "0")}`;
}

export type VoiceRecorder = {
  /** Câu đang được ghi âm, `null` nếu không ghi câu nào. */
  recordingFor: number | null;
  /** Số giây đã ghi của câu đang ghi. */
  elapsed: number;
  /** Câu đang tải bản ghi lên server. */
  uploadingFor: number | null;
  /** Lỗi micro/ghi âm, gắn với đúng câu gây lỗi. */
  error: { questionId: number; message: string } | null;
  start: (questionId: number, limitSeconds: number | null) => Promise<void>;
  stop: () => void;
  clearError: () => void;
};

export function useVoiceRecorder({
  onFinish,
}: {
  /** Có bản ghi mới cho câu — component cha upload rồi cập nhật đáp án. */
  onFinish: (questionId: number, file: File, seconds: number) => Promise<void>;
}): VoiceRecorder {
  const [recordingFor, setRecordingFor] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);
  const [error, setError] = useState<{ questionId: number; message: string } | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const limitRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  // Chờ bản ghi hiện tại đóng gói + upload xong rồi mới cho ghi câu tiếp theo.
  const finishedRef = useRef<(() => void) | null>(null);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const stopTicker = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  // Rời trang giữa chừng: tắt mic để đèn micro của máy không sáng mãi.
  useEffect(() => {
    return () => {
      stopTicker();
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, [stopTicker]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  /** Dừng câu đang ghi (nếu có) và đợi nó đóng gói + upload xong. */
  const stopAndWait = useCallback(async () => {
    if (recorderRef.current?.state !== "recording") return;

    const done = new Promise<void>((resolve) => {
      finishedRef.current = resolve;
    });
    stop();
    await done;
  }, [stop]);

  // Hết giới hạn thời lượng → tự dừng. Đặt ở effect (không phải setTimeout trong start) để
  // luôn dùng `limitSeconds` mới nhất và tự dọn khi component unmount.
  useEffect(() => {
    if (recordingFor === null || !limitRef.current) return;
    if (elapsed < limitRef.current) return;
    stop();
  }, [recordingFor, elapsed, stop]);

  const start = useCallback(
    async (questionId: number, limitSeconds: number | null) => {
      setError(null);

      // Chỉ một câu được ghi tại một thời điểm.
      await stopAndWait();

      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError({
          questionId,
          message:
            "Trình duyệt không cho ghi âm ở trang này. Em mở bằng đường dẫn https:// hoặc đổi trình duyệt (Chrome, Safari bản mới) — hoặc dùng nút Upload file nhé.",
        });
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        setError({
          questionId,
          message:
            name === "NotAllowedError"
              ? "Em chưa cho phép dùng micro. Bấm biểu tượng ổ khoá trên thanh địa chỉ để bật micro rồi thử lại — hoặc dùng nút Upload file để nộp tệp audio."
              : name === "NotFoundError"
                ? "Máy không tìm thấy micro nào. Em kiểm tra tai nghe / micro, hoặc dùng nút Upload file nhé."
                : "Không mở được micro. Em thử lại, hoặc dùng nút Upload file nhé.",
        });
        return;
      }

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      limitRef.current = limitSeconds;

      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);

      recorder.onstop = async () => {
        stopTicker();
        setRecordingFor(null);
        stream.getTracks().forEach((t) => t.stop());
        recorderRef.current = null;

        const seconds = elapsedRef.current;
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });

        if (blob.size > 0) {
          setUploadingFor(questionId);
          try {
            const file = new File([blob], `bai-noi.${extensionFor(mimeType)}`, { type: mimeType });
            await onFinishRef.current(questionId, file, seconds);
          } catch {
            setError({ questionId, message: "Tải bản ghi lên thất bại. Em thử ghi lại nhé." });
          } finally {
            setUploadingFor(null);
          }
        } else {
          setError({ questionId, message: "Bản ghi rỗng — em thử ghi lại nhé." });
        }

        finishedRef.current?.();
        finishedRef.current = null;
      };

      recorder.start();
      elapsedRef.current = 0;
      setElapsed(0);
      setRecordingFor(questionId);
      tickRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
    },
    [stopAndWait, stopTicker],
  );

  return {
    recordingFor,
    elapsed,
    uploadingFor,
    error,
    start,
    stop,
    clearError: useCallback(() => setError(null), []),
  };
}
