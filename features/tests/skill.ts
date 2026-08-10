import type { Skill } from "@/lib/types/test";

/** Chip màu theo kỹ năng — dùng token §2.1, không hex thô. */
export const SKILL_CHIP: Record<Skill, string> = {
  reading: "bg-skill-reading-soft text-skill-reading",
  listening: "bg-skill-listening-soft text-info",
  writing: "bg-skill-writing-soft text-success-bold",
  speaking: "bg-skill-speaking-soft text-skill-speaking",
  mixed: "bg-brand-soft text-brand",
};

// Nhãn loại đề nằm ở SKILL_LABEL (@/lib/types/test) — file này chỉ giữ phần màu sắc.
