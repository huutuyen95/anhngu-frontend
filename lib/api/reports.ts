import { api } from "@/lib/api";
import type { ClassReport } from "@/lib/types/classroom";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function getClassReport(classId: number, period: string): Promise<ClassReport> {
  return api(`/classrooms/${classId}/report?period=${period}`);
}

export function reportExportUrl(classId: number, period: string): string {
  return `${API_URL}/classrooms/${classId}/report/export?period=${period}`;
}
