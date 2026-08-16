"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { DocumentViewer } from "@/features/documents/document-viewer";

function Inner() {
  const params = useParams<{ classId: string; id: string }>();
  const search = useSearchParams();
  const classId = Number(params.classId);
  const session = search.get("session");
  const q = session ? `?session=${session}` : "";
  return <DocumentViewer id={Number(params.id)} backHref={`/classes/${classId}${q}`} />;
}

export default function ClassDocumentPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl"><div className="mt-20 h-96 animate-pulse rounded-2xl bg-neutral-200" /></div>}>
      <Inner />
    </Suspense>
  );
}
