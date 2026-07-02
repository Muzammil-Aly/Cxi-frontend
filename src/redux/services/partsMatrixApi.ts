import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../baseQueryWithReauth";

export interface SectionMeta {
  key: string;
  label: string;
}

export interface SectionData {
  section: string;
  label: string;
  columns: string[];
  rows: (string | number | null)[][];
  total_records: number;
  current_page: number;
  page_size: number;
  total_pages: number;
}

export interface SearchResult {
  section: string;
  label: string;
  columns: string[];
  rows: (string | number | null)[][];
  match_count: number;
}

interface ApiResponse<T> {
  status: number;
  data: T;
  message: string;
}

export const partsMatrixApi = createApi({
  reducerPath: "partsMatrixApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getSections: builder.query<SectionMeta[], void>({
      query: () => "/parts-matrix/sections",
      transformResponse: (res: ApiResponse<SectionMeta[]>) => res.data,
    }),

    getSectionData: builder.query<
      SectionData,
      { section: string; q?: string; page?: number; page_size?: number }
    >({
      query: ({ section, q = "", page = 1, page_size = 300 }) => {
        const params = new URLSearchParams({ section, page: String(page), page_size: String(page_size) });
        if (q) params.set("q", q);
        return `/parts-matrix?${params.toString()}`;
      },
      transformResponse: (res: ApiResponse<SectionData>) => res.data,
    }),

    searchAllSections: builder.query<SearchResult[], { q: string }>({
      query: ({ q }) => `/parts-matrix/search?q=${encodeURIComponent(q)}`,
      transformResponse: (res: ApiResponse<SearchResult[]>) => res.data,
    }),
  }),
});

export const {
  useGetSectionsQuery,
  useGetSectionDataQuery,
  useSearchAllSectionsQuery,
} = partsMatrixApi;
