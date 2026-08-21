import { api } from "@/lib/api";
import type { ReportPeriod, ReportScope, StudentReport } from "@/lib/types/report";

/** Báo cáo học sinh — scope=overview (mọi lớp) | class (1 lớp). */
export function getStudentReport(params: {
  scope: ReportScope;
  classroom_id?: number | null;
  period: ReportPeriod;
}): Promise<StudentReport> {
  const qs = new URLSearchParams({ scope: params.scope, period: params.period });
  if (params.scope === "class" && params.classroom_id) qs.set("classroom_id", String(params.classroom_id));
  return api<StudentReport>(`/me/report?${qs.toString()}`);
}
