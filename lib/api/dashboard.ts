import { api } from "@/lib/api";
import type { DashboardData } from "@/lib/types/classroom";

export function getDashboard(): Promise<DashboardData> {
  return api("/dashboard");
}
