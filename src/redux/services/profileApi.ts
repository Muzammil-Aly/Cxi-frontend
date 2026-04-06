/**
 * Legacy profileApi.ts - Re-exports from new domain-specific APIs
 *
 * This file provides backwards compatibility for components that haven't been migrated yet.
 * All hooks are re-exported from the new domain-specific API files.
 *
 * TODO: Migrate all components to import directly from the new API files, then delete this file.
 */

// Customer API exports
//cxi-frontend
export {
  useGetProfilesQuery,
  useGetCustomerSegmentQuery,
  useGetSegmentsQuery,
  useGetFullNamesQuery,
  useGetPhoneQuery,
  useGetOrderHistoryQuery,
  useGetZendeskTicketsQuery,
  useGetUserPreferencesQuery,
  useUpsertUserPreferencesMutation,
} from "./customerApi";

// Order API exports
export {
  useGetCustomerOrdersQuery,
  useGetOrderItemsQuery,
  useGetReturnsQuery,
  useGetRefundsQuery,
} from "./orderApi";

// Support API exports
export {
  useGetSupportTicketsQuery,
  useGetSupportTicketsCommentsQuery as useGetSupportTicketsCommnetsQuery, // Note: Fixing typo here
} from "./supportApi";

// Events API exports
export {
  useGetProfileEventsQuery,
  useLazyGetProfileEventsQuery,
  useGetCustomerEventsQuery,
} from "./eventsApi";

// Inventory API exports
export {
  useGetInventoryQuery,
  useGetLocationItemLotQuery,
  useGetTouchupsQuery,
  useGetTouchupPensQuery,
  useGetLifeCycleStatusQuery,
  useGetNavETAQuery,
  useGetItemTrackingCommentsQuery,
} from "./InventoryApi";
