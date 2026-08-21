"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useOperationProgress() {
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  const start = useCallback(() => {
    stopTimer();
    setProgress(1);
    setRunning(true);
    timer.current = setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current;
        return Math.min(92, current + Math.max(1, Math.ceil((92 - current) / 10)));
      });
    }, 450);
  }, [stopTimer]);

  const update = useCallback((value: number) => {
    setProgress((current) => Math.max(current, Math.min(99, Math.round(value))));
  }, []);

  const complete = useCallback(() => {
    stopTimer();
    setProgress(100);
  }, [stopTimer]);

  const reset = useCallback(() => {
    stopTimer();
    setRunning(false);
    setProgress(0);
  }, [stopTimer]);

  useEffect(() => stopTimer, [stopTimer]);

  return { progress, running, start, update, complete, reset };
}
