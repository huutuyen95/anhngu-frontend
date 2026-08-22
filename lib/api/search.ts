import { api } from "@/lib/api";
import type { SearchResults } from "@/lib/types/search";

export function searchContent(q: string): Promise<SearchResults> {
  return api<SearchResults>(`/me/search?q=${encodeURIComponent(q)}`);
}
