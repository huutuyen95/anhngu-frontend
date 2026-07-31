"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Deep-link mở sẵn modal tạo lớp trên nền danh sách.
export default function NewClassPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/teacher/classes?new=1");
  }, [router]);
  return null;
}
