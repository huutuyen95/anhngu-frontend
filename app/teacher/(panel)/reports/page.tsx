"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Báo cáo là TAB trong lớp, không phải màn riêng — điều hướng về Tổng quan.
export default function ReportsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/teacher");
  }, [router]);
  return null;
}
