import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../baseQueryWithReauth";

export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getCustomerOrders: builder.query<
      any,
      {
        page?: number;
        page_size?: number;
        customer_email?: string;
        source?: string;
        order_id?: string;
        customer_id?: string;
        customer_name?: string;
        customer_reference_no?: string;
        shipping_address?: string;
        tracking?: string;
        order_date?: string;
        profit_name?: string;
        retailer?: string;
        fulfillment_status?: string;
        order_status?: string;
        psi_number?: string;
        customer_no?: string;
        phone_no?: string;
        your_reference?: string;
        entered_by?: string;
      }
    >({
      query: ({
        page = 1,
        page_size = 10,
        source,
        order_id,
        customer_id,
        customer_name,
        customer_reference_no,
        shipping_address,
        tracking,
        customer_email,
        order_date,
        profit_name,
        retailer,
        fulfillment_status,
        order_status,
        psi_number,
        customer_no,
        phone_no,
        your_reference,
        entered_by,
      }) => {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("page_size", page_size.toString());
        if (source) params.set("source", source);
        if (order_id) params.set("order_id", order_id);
        if (customer_id) params.set("customer_id", customer_id);
        if (customer_name) params.set("customer_name", customer_name);
        if (customer_reference_no)
          params.set("customer_reference_no", customer_reference_no);
        if (shipping_address) params.set("shipping_address", shipping_address);
        if (tracking) params.set("tracking", tracking);
        if (customer_email) params.set("customer_email", customer_email);
        if (order_date) params.set("order_date", order_date);
        if (profit_name) params.set("profit_name", profit_name);
        if (retailer) params.set("retailer", retailer);
        if (fulfillment_status)
          params.set("fulfillment_status", fulfillment_status);
        if (order_status) params.set("order_status", order_status);
        if (psi_number) params.set("psi_number", psi_number);
        if (customer_no) params.set("customer_no", customer_no);
        if (phone_no) params.set("phone_no", phone_no);
        if (your_reference) params.set("your_reference", your_reference);
        if (entered_by) params.set("entered_by", entered_by);

        return `/customer_orders?${params.toString()}`;
      },
    }),

    getOrderItems: builder.query<any, { orderId: string; source?: string }>({
      query: ({ orderId, source }) =>
        `customer_order_items?order_id=${orderId}&source=${source || "orders"}`,
    }),

    getReturns: builder.query<any, { customer_id: string; source?: string }>({
      query: ({ customer_id, source }) =>
        `customer_orders_return?customer_id=${customer_id}${source ? `&source=${source}` : ""}`,
    }),

    getRefunds: builder.query<any, { customer_id: string; source?: string }>({
      query: ({ customer_id, source }) =>
        `customer_orders_refund?customer_id=${customer_id}${source ? `&source=${source}` : ""}`,
    }),
  }),
});

export const {
  useGetCustomerOrdersQuery,
  useGetOrderItemsQuery,
  useGetReturnsQuery,
  useGetRefundsQuery,
} = orderApi;
