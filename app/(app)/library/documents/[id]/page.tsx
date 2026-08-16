"use client";

import { use } from "react";
import { DocumentViewer } from "@/features/documents/document-viewer";

export default function DocumentViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DocumentViewer id={Number(id)} backHref="/library/documents" />;
}
