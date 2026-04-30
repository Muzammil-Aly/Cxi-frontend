import { configureStore } from "@reduxjs/toolkit";
import { OrdersApi } from "./services/ordersApi";
import { supportTicketsApi } from "./services/supportTicketsApi";
import { inventoryApi } from "./services/InventoryApi";
import { MarketingEventsApi } from "./services/MarketingEvents";
import { customerApi } from "./services/customerApi";
import { orderApi } from "./services/orderApi";
import { supportApi } from "./services/supportApi";
import { eventsApi } from "./services/eventsApi";
import { authApi } from "./services/authApi";
import { PreferencesApi } from "./services/preferencesApi";
import { shopifyApi } from "./services/shopifyApi";
import { genieApi } from "./services/genieApi";
import tabReducer from "./slices/tabSlice";
export const store = configureStore({
  reducer: {
    // Legacy APIs (keep temporarily for backwards compatibility)
    [OrdersApi.reducerPath]: OrdersApi.reducer,
    [supportTicketsApi.reducerPath]: supportTicketsApi.reducer,
    [MarketingEventsApi.reducerPath]: MarketingEventsApi.reducer,
    // New domain-specific APIs
    [customerApi.reducerPath]: customerApi.reducer,
    [orderApi.reducerPath]: orderApi.reducer,
    [supportApi.reducerPath]: supportApi.reducer,
    [eventsApi.reducerPath]: eventsApi.reducer,
    [inventoryApi.reducerPath]: inventoryApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [PreferencesApi.reducerPath]: PreferencesApi.reducer,
    [shopifyApi.reducerPath]: shopifyApi.reducer,
    [genieApi.reducerPath]: genieApi.reducer,
    tab: tabReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      // Legacy API middleware (keep temporarily)
      .concat(OrdersApi.middleware)
      .concat(supportTicketsApi.middleware)
      .concat(MarketingEventsApi.middleware)
      // New domain-specific API middleware
      .concat(customerApi.middleware)
      .concat(orderApi.middleware)
      .concat(supportApi.middleware)
      .concat(eventsApi.middleware)
      .concat(inventoryApi.middleware)
      .concat(PreferencesApi.middleware)
      .concat(authApi.middleware)
      .concat(shopifyApi.middleware)
      .concat(genieApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
