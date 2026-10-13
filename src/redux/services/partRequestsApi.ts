import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../baseQueryWithReauth";

export type PartRequestTab = "needs_review" | "submitted" | "all";

export interface PartRequestHeader {
  id: string;
  customer_type: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  order_no: string | null;
  status: string | null;
  review_type: string | null;
  retailer_name: string | null;
  zendesk_ticket_id: string | null;
  store: string | null;
  reason_code: string | null;
  shopify_draft_order_id: string | null;
  cxi_picked_up_at: string | null;
  submitted_at: string | null;
  created_at: string | null;
}

export interface PartRequestPart {
  id: number;
  item_id: number;
  part_no: number | null;
  part_number: string | null;
  part_name: string | null;
  part_sku: string | null;
  quantity: number | null;
  refund_cat: string | null;
  refund_percent: number | null;
  refund_max: number | null;
  created_at: string | null;
}

export interface PartRequestItem {
  id: number;
  request_id: string;
  item_no: number | null;
  source: string | null;
  sku: string | null;
  product_name: string | null;
  lot_number: string | null;
  parent_category: string | null;
  order_line_id: string | null;
  reason: string | null;
  description: string | null;
  request_type: string | null;
  image_urls: string[] | null;
  item_price: number | null;
  item_total_refund_amount: number | null;
  return_reason_code: string | null;
  created_at: string | null;
  parts: PartRequestPart[];
}

export interface PartRequestDetail {
  header: PartRequestHeader & Record<string, unknown>;
  items: PartRequestItem[];
}

export interface PartRequestListResponse {
  data: PartRequestHeader[];
  total_records: number;
  current_page: number;
  page_size: number;
  total_pages: number;
}

interface ApiResponse<T> {
  status: number;
  data: T;
  message: string;
}

export const partRequestsApi = createApi({
  reducerPath: "partRequestsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["PartRequest"],
  endpoints: (builder) => ({
    getPartRequests: builder.query<
      PartRequestListResponse,
      { tab: PartRequestTab; q?: string; page?: number; page_size?: number }
    >({
      query: ({ tab, q = "", page = 1, page_size = 50 }) => {
        const params = new URLSearchParams({
          tab,
          page: String(page),
          page_size: String(page_size),
        });
        if (q) params.set("q", q);
        return `/part-requests?${params.toString()}`;
      },
      transformResponse: (res: ApiResponse<PartRequestListResponse>) => res.data,
      providesTags: ["PartRequest"],
    }),

    getPartRequestDetail: builder.query<PartRequestDetail, string>({
      query: (id) => `/part-requests/${id}`,
      transformResponse: (res: ApiResponse<PartRequestDetail>) => res.data,
      providesTags: (_result, _error, id) => [{ type: "PartRequest", id }],
    }),

    // Called only after a Shopify draft order or refund has already
    // succeeded, from the Part Request dialog — never from Create Order.
    markPartRequestSubmitted: builder.mutation<
      PartRequestHeader,
      { id: string; shopify_draft_order_id?: string | null }
    >({
      query: ({ id, shopify_draft_order_id }) => ({
        url: `/part-requests/${id}/submitted`,
        method: "PATCH",
        body: { shopify_draft_order_id: shopify_draft_order_id ?? null },
      }),
      transformResponse: (res: ApiResponse<PartRequestHeader>) => res.data,
      invalidatesTags: (_result, _error, { id }) => ["PartRequest", { type: "PartRequest", id }],
    }),
  }),
});

export const {
  useGetPartRequestsQuery,
  useGetPartRequestDetailQuery,
  useMarkPartRequestSubmittedMutation,
} = partRequestsApi;
