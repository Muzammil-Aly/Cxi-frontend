// src/services/shopifyApi.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../baseQueryWithReauth";

export type ShopifyStore =
  | "store1"
  | "store2"
  | "store3"
  | "store4"
  | "store5"
  | "store6";

export interface ProductVariant {
  id: string; // gid://shopify/ProductVariant/...
  title: string;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  inventoryQuantity: number;
  availableForSale: boolean;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  tags: string[];
  variants: { edges: { node: ProductVariant }[] };
  images: { edges: { node: { url: string; altText: string } }[] };
}

export interface ShopifyOrderAddress {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  provinceCode: string;
  countryCode: string;
  zip: string;
  phone?: string;
}

export interface ShopifyOrder {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  displayFinancialStatus: string;
  tags: string[];
  shippingAddress: ShopifyOrderAddress | null;
}

export const shopifyApi = createApi({
  reducerPath: "shopifyApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["DraftOrder", "Product"],
  endpoints: (builder) => ({
    getProducts: builder.query<ShopifyProduct[], ShopifyStore>({
      query: (store = "store1") => ({
        url: `/shopify/products?store=${store}&limit=250`,
        method: "GET",
      }),
      transformResponse: (response: { data: ShopifyProduct[] }) =>
        response.data,
      providesTags: (result, error, store) => [{ type: "Product", id: store }],
    }),
    createOrder: builder.mutation<
      any,
      {
        store?: ShopifyStore;
        email: string;
        financialStatus?: string;
        note?: string;
        tags?: string[];
        lineItems: {
          variantId?: string;
          quantity: number;
          title?: string;
          price?: string;
          sku?: string;
          properties?: { name: string; value: string }[];
        }[];
        shippingAddress: {
          firstName: string;
          lastName: string;
          address1: string;
          address2?: string;
          company?: string;
          city: string;
          provinceCode: string;
          countryCode: string;
          zip: string;
          phone?: string;
        };
        inventoryBehaviour?: "BYPASS" | "DECREMENT" | "RELEASE";
        sendReceipt?: boolean;
        sendFulfillmentReceipt?: boolean;
        vendor?: string;
      }
    >({
      query: ({
        store = "store1",
        email,
        financialStatus,
        note,
        tags = [],
        lineItems,
        shippingAddress,
        inventoryBehaviour = "BYPASS",
        sendReceipt = false,
        sendFulfillmentReceipt = false,
        vendor,
      }) => ({
        url: `/shopify/create-order?store=${store}`,
        method: "POST",
        body: {
          order: {
            email,
            financialStatus,
            note,
            tags,
            lineItems,
            shippingAddress,
          },
          inventoryBehaviour,
          sendReceipt,
          sendFulfillmentReceipt,
          vendor,
        },
      }),
    }),
    createDraftOrder: builder.mutation<
      any,
      {
        store?: ShopifyStore;
        email: string;
        note?: string;
        tags?: string[];
        washWholeUnit?: boolean;
        lineItems: {
          variantId?: string;
          quantity: number;
          title?: string;
          price?: string;
          sku?: string;
          properties?: { name: string; value: string }[];
        }[];
        shippingAddress: {
          firstName: string;
          lastName: string;
          address1: string;
          address2?: string;
          company?: string;
          city: string;
          provinceCode: string;
          countryCode: string;
          zip: string;
          phone?: string;
        };
        vendor?: string;
      }
    >({
      query: ({
        store = "store1",
        email,
        note,
        tags = [],
        washWholeUnit = false,
        lineItems,
        shippingAddress,
        vendor,
      }) => ({
        url: `/shopify/create-smart-draft-order?store=${store}`,
        method: "POST",
        body: {
          draftOrder: {
            email,
            note,
            tags,
            washWholeUnit,
            lineItems,
            shippingAddress,
          },
          vendor,
        },
      }),
    }),

    updateOrder: builder.mutation<
      any,
      {
        orderId: string;
        store?: ShopifyStore;
        email?: string;
        shippingAddress?: Partial<{
          firstName: string;
          lastName: string;
          company: string;
          address1: string;
          address2: string;
          city: string;
          provinceCode: string;
          countryCode: string;
          zip: string;
          phone: string;
        }>;
        customAttributes?: { key: string; value: string }[];
        tags?: string[];
        vendor?: string;
      }
    >({
      query: ({
        orderId,
        store = "store1",
        email,
        shippingAddress,
        customAttributes,
        tags,
        vendor,
      }) => ({
        url: `/shopify/order/${orderId}?store=${store}`,
        method: "PUT",
        body: { email, shippingAddress, customAttributes, tags, vendor },
      }),
    }),

    updateDraftOrder: builder.mutation<
      any,
      {
        draftOrderId: string;
        store?: ShopifyStore;
        email?: string;
        shippingAddress?: Partial<{
          firstName: string;
          lastName: string;
          company: string;
          address1: string;
          address2: string;
          city: string;
          provinceCode: string;
          countryCode: string;
          zip: string;
          phone: string;
        }>;
        customAttributes?: { key: string; value: string }[];
        tags?: string[];
        lineItems?: Array<{
          variantId?: string;
          title?: string;
          quantity: number;
          originalUnitPrice?: string;
          reasonCode?: string;
          returnReasonCode?: string;
          sku?: string;
          lotNo?: string;
          itemNo?: string;
        }>;
        vendor?: string;
      }
    >({
      query: ({
        draftOrderId,
        store = "store1",
        email,
        shippingAddress,
        customAttributes,
        tags,
        lineItems,
        vendor,
      }) => ({
        url: `/shopify/draft-order/${draftOrderId}?store=${store}`,
        method: "PUT",
        body: {
          email,
          shippingAddress,
          customAttributes,
          tags,
          lineItems,
          vendor,
        },
      }),
      invalidatesTags: (result, error, { draftOrderId }) => [
        { type: "DraftOrder", id: draftOrderId },
        { type: "DraftOrder", id: "LIST" },
      ],
    }),

    getDraftOrderLineItems: builder.query<
      {
        lineItems: Array<{
          variantId: string | null;
          title: string;
          quantity: number;
          price: string | null;
          sku: string | null;
        }>;
        customItems: Array<{
          title: string;
          quantity: number;
          price: string | null;
          customAttributes: Array<{ key: string; value: string }>;
        }>;
        customAttributes: Array<{ key: string; value: string }>;
        status: string | null;
      },
      { draftOrderId: string; store?: ShopifyStore }
    >({
      query: ({ draftOrderId, store = "store1" }) => ({
        url: `/shopify/draft-order?draft_order_id=${draftOrderId}&store=${store}`,
        method: "GET",
      }),
      providesTags: (result, error, { draftOrderId }) => [
        { type: "DraftOrder", id: draftOrderId },
      ],
      transformResponse: (response: { data: any }) => {
        const edges = response?.data?.lineItems?.edges ?? [];
        const variantMap = new Map<
          string,
          {
            variantId: string;
            title: string;
            quantity: number;
            price: string | null;
            sku: string | null;
          }
        >();
        const customItems: Array<{
          title: string;
          quantity: number;
          price: string | null;
          customAttributes: Array<{ key: string; value: string }>;
        }> = [];
        for (const { node } of edges) {
          const variantId = node.variant?.id ?? null;
          if (variantId) {
            if (variantMap.has(variantId)) {
              variantMap.get(variantId)!.quantity += node.quantity ?? 0;
            } else {
              variantMap.set(variantId, {
                variantId,
                title: node.title ?? "",
                quantity: node.quantity ?? 0,
                price: node.originalUnitPriceSet?.shopMoney?.amount ?? null,
                sku: node.variant?.sku ?? null,
              });
            }
          } else {
            customItems.push({
              title: node.title ?? "",
              quantity: node.quantity ?? 0,
              price: node.originalUnitPriceSet?.shopMoney?.amount ?? null,
              customAttributes: (node.customAttributes ?? []).filter(
                (a: any) => a.key && a.value,
              ),
            });
          }
        }
        return {
          lineItems: Array.from(variantMap.values()),
          customItems,
          customAttributes: response?.data?.customAttributes ?? [],
          status: response?.data?.status ?? null,
        };
      },
    }),

    getOrderLineItems: builder.query<
      {
        lineItems: Array<{
          id: string;
          title: string;
          quantity: number;
          sku: string | null;
          customAttributes: Array<{ key: string; value: string }>;
        }>;
        shippingAddress: ShopifyOrderAddress | null;
        email: string | null;
        tags: string[];
      },
      { orderId: string; store?: ShopifyStore }
    >({
      query: ({ orderId, store = "store1" }) => ({
        url: `/shopify/order?order_id=${orderId}&store=${store}`,
        method: "GET",
      }),
      transformResponse: (response: { data: any }) => {
        const edges = response?.data?.lineItems?.edges ?? [];
        const lineItems = edges
          .filter(
            ({ node }: any) => (node.currentQuantity ?? node.quantity ?? 0) > 0,
          )
          .map(({ node }: any) => ({
            id: node.id ?? "",
            title: node.title ?? "",
            quantity: node.currentQuantity ?? node.quantity ?? 0,
            sku: node.sku?.sku ?? null,
            customAttributes: (node.customAttributes ?? []).filter(
              (a: any) => a.key && a.value,
            ),
          }));
        return {
          lineItems,
          shippingAddress: response?.data?.shippingAddress ?? null,
          email: response?.data?.email ?? null,
          tags: response?.data?.tags ?? [],
        };
      },
    }),

    editOrder: builder.mutation<
      any,
      {
        orderId: string;
        store?: ShopifyStore;
        operations: Array<{
          type: "addVariant" | "setQuantity" | "removeLineItem" | "addDiscount";
          variantId?: string;
          lineItemId?: string;
          quantity?: number;
          allowDuplicates?: boolean;
          restock?: boolean;
          discount?: {
            description?: string;
            fixedValue?: { amount: number; currencyCode: string };
            percentValue?: number;
          };
        }>;
        notifyCustomer?: boolean;
        staffNote?: string;
        vendor?: string;
      }
    >({
      query: ({
        orderId,
        store = "store1",
        operations,
        notifyCustomer,
        staffNote,
        vendor,
      }) => ({
        url: `/shopify/order/${orderId}/edit?store=${store}`,
        method: "POST",
        body: { operations, notifyCustomer, staffNote, vendor },
      }),
    }),

    cancelOrder: builder.mutation<
      any,
      {
        orderId: string;
        store?: ShopifyStore;
        reason?: string;
        refund?: boolean;
        restock?: boolean;
      }
    >({
      query: ({
        orderId,
        store = "store1",
        reason = "CUSTOMER",
        refund = false,
        restock = true,
      }) => ({
        url: `/shopify/order/${orderId}/cancel?store=${store}`,
        method: "POST",
        body: { reason, refund, restock },
      }),
    }),

    getOrderEditEligibility: builder.query<
      {
        canEdit: boolean;
        reason: string | null;
        remainingMinutes: number | null;
        order: {
          id: string;
          name: string;
          createdAt: string;
          cancelledAt: string | null;
          closedAt: string | null;
          displayFulfillmentStatus: string;
        } | null;
      },
      { orderId: string; store?: ShopifyStore }
    >({
      query: ({ orderId, store = "store1" }) => ({
        url: `/shopify/order/${orderId}/edit-eligibility?store=${store}`,
        method: "GET",
      }),
      transformResponse: (response: any) => ({
        canEdit: response.canEdit,
        reason: response.reason ?? null,
        remainingMinutes: response.remainingMinutes ?? null,
        order: response.order ?? null,
      }),
    }),

    getShopifyOrders: builder.query<
      {
        data: ShopifyOrder[];
        has_next_page: boolean;
        end_cursor: string | null;
      },
      { store?: ShopifyStore; limit?: number; query?: string }
    >({
      query: ({ store = "store1", limit = 50, query }) => {
        const params = new URLSearchParams({ store, limit: String(limit) });
        if (query) params.append("query", query);
        return { url: `/shopify/orders?${params}`, method: "GET" };
      },
    }),

    getShopifyDraftOrders: builder.query<
      {
        data: ShopifyOrder[];
        has_next_page: boolean;
        end_cursor: string | null;
      },
      { store?: ShopifyStore; limit?: number; query?: string }
    >({
      query: ({ store = "store1", limit = 50, query }) => {
        const params = new URLSearchParams({ store, limit: String(limit) });
        if (query) params.append("query", query);
        return { url: `/shopify/draft-orders?${params}`, method: "GET" };
      },
      providesTags: [{ type: "DraftOrder", id: "LIST" }],
    }),

    getShopifyReturnReasons: builder.query<
      { data: { Code: string; Description: string }[]; total_records: number },
      void
    >({
      query: () => ({
        url: `/shopify_return_reasons?page_size=100`,
        method: "GET",
      }),
    }),

    getShopifyReturnReasonsCode: builder.query<
      { data: { Code: string; Description: string }[]; total_records: number },
      void
    >({
      query: () => ({
        url: `/shopify_return_reasons_code?page_size=100`,
        method: "GET",
      }),
    }),

    createProduct: builder.mutation<
      any,
      {
        store?: ShopifyStore;
        title: string;
        price: number;
        sku?: string;
        product_type?: string;
        vendor?: string;
      }
    >({
      query: ({
        store = "store1",
        title,
        price,
        sku,
        product_type,
        vendor,
      }) => ({
        url: `/shopify/create-product?store=${store}`,
        method: "POST",
        body: { title, price, sku, product_type, vendor },
      }),
      invalidatesTags: (result, error, { store = "store1" }) => [
        { type: "Product", id: store },
      ],
    }),

    getShopifyLineItems: builder.query<
      {
        data: {
          order_id: string;
          customer_email: string;
          phone_no: string;
          lot_no: string | null;
          item_no: string;
          quantity: number;
          zip_code: string;
          address: string;
          city: string;
          state_code: string;
          country_code: string;
          company: string;
          unit_price: number | null;
          description?: string | null;
          description_2?: string | null;
          first_name?: string | null;
          last_name?: string | null;
        }[];
        total_records: number;
      },
      { order_id: string }
    >({
      query: ({ order_id }) => ({
        url: `/shopify_line_items?order_id=${encodeURIComponent(order_id)}&page_size=50`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useGetProductsQuery,
  useCreateOrderMutation,
  useCreateDraftOrderMutation,
  useUpdateOrderMutation,
  useUpdateDraftOrderMutation,
  useGetOrderLineItemsQuery,
  useGetDraftOrderLineItemsQuery,
  useEditOrderMutation,
  useCancelOrderMutation,
  useGetOrderEditEligibilityQuery,
  useGetShopifyOrdersQuery,
  useGetShopifyDraftOrdersQuery,
  useGetShopifyReturnReasonsQuery,
  useGetShopifyReturnReasonsCodeQuery,
  useGetShopifyLineItemsQuery,
  useCreateProductMutation,
} = shopifyApi;
