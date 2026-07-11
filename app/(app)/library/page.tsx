import Link from "next/link";

const LIBRARY_ITEMS = [
  {
    label: "Từ vựng",
    description: "Học từ vựng bằng flashcard",
    icon: "🗂️",
    href: "/library/vocab",
    active: true,
  },
  {
    label: "Đề thi",
    description: "Sắp ra mắt",
    icon: "📝",
    href: "#",
    active: false,
  },
  {
    label: "Bài viết",
    description: "Sắp ra mắt",
    icon: "📚",
    href: "#",
    active: false,
  },
];

export default function LibraryPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Thư viện</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LIBRARY_ITEMS.map((item) =>
          item.active ? (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 text-3xl">{item.icon}</div>
              <h2 className="text-lg font-semibold text-slate-900">
                {item.label}
              </h2>
              <p className="text-sm text-slate-500">{item.description}</p>
            </Link>
          ) : (
            <div
              key={item.label}
              className="cursor-not-allowed rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 opacity-60"
            >
              <div className="mb-3 text-3xl">{item.icon}</div>
              <h2 className="text-lg font-semibold text-slate-900">
                {item.label}
              </h2>
              <p className="text-sm text-slate-500">{item.description}</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
