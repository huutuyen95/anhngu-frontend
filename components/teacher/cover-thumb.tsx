import { cn } from "@/lib/utils";

const PRESET_GRADIENTS: Record<string, string> = {
  sunset: "linear-gradient(135deg,#F2793B,#FFC94D)",
  ocean: "linear-gradient(135deg,#56C2EE,#4F86C6)",
  forest: "linear-gradient(135deg,#7FAB2A,#3FA37A)",
  grape: "linear-gradient(135deg,#B06CD6,#E5604C)",
  candy: "linear-gradient(135deg,#F58BB0,#FFC94D)",
  sky: "linear-gradient(135deg,#8CC7F0,#B0A5F0)",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Ảnh bìa lớp: preset → gradient; URL → <img>; không có → brand-soft + chữ viết tắt. */
export function CoverThumb({
  cover,
  name,
  className,
}: {
  cover: string | null;
  name: string;
  className?: string;
}) {
  const isPreset = cover?.startsWith("preset:");
  const presetKey = isPreset ? cover!.slice(7) : null;

  if (presetKey && PRESET_GRADIENTS[presetKey]) {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        style={{ backgroundImage: PRESET_GRADIENTS[presetKey] }}
      >
        <span className="font-display text-xl font-extrabold text-white/90">
          {initials(name)}
        </span>
      </div>
    );
  }

  if (cover && !isPreset) {
    return (
      <img
        src={cover}
        alt={name}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-brand-soft",
        className
      )}
    >
      <span className="font-display text-xl font-extrabold text-brand">
        {initials(name)}
      </span>
    </div>
  );
}
