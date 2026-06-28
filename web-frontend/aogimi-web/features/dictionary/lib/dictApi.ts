import { apiGet } from '@/lib/api';
import type { DetailsResponse, SearchResponse } from '@/lib/types';

export function searchDictionary(q: string, signal?: AbortSignal): Promise<SearchResponse> {
  return apiGet<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`, signal);
}

export function getWordDetails(
  id: number | string,
  signal?: AbortSignal,
): Promise<DetailsResponse> {
  return apiGet<DetailsResponse>(`/api/words/${encodeURIComponent(String(id))}/details`, signal);
}
