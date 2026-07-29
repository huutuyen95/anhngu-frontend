import { api } from "@/lib/api";
import type { ClassroomRef } from "@/lib/types/student";

export function listClassrooms(): Promise<{ data: ClassroomRef[] }> {
  return api("/classrooms");
}
