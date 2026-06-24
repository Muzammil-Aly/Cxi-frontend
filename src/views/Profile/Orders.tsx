"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  InputAdornment,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Popover,
  Fade,
  IconButton,
  Tooltip,
  Button,
  Badge,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

import Loader from "@/components/Common/Loader";
import debounce from "lodash.debounce";
import CustomDatePicker from "@/components/Common/DatePicker/DatePicker";
import CustomDateRangePicker from "@/components/Common/DatePicker/CustomDateRangePicker";
import { orders } from "@/constants/Grid-Table/ColDefs";
import useOrdersColumn from "@/hooks/Ag-Grid/useOrdersColumn";
import { useGetCustomerOrdersQuery } from "@/redux/services/profileApi";
import { exportProfilesToPDF } from "@/utils/exportPDF";
import ResponsiveDashboard from "./TabsContent/ResponsiveDashboard";
interface OrdersProps {
  customerId?: string;
}
import CustomSearchField from "@/components/Common/CustomSearch";
import { Phone, Send, Add, Close, Search } from "@mui/icons-material";

import { getRowStyle } from "@/utils/gridStyles";
import SearchInput from "@/components/Common/CustomSearch/SearchInput";
import CustomSelect from "@/components/Common/CustomTabs/CustomSelect";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import dayjs, { Dayjs } from "dayjs";
import { useColumnPreferences } from "@/hooks/useColumnPreferences";
import { getUserInfo } from "@/utils/auth/tokenManager";
import toast from "react-hot-toast";

import {
  useGetCustomerNamesQuery,
  useGetProfitNamesQuery,
  useGetRetailersQuery,
  useGetStatusesQuery,
  useGetFullfillmentStatusesQuery,
} from "@/redux/services/ordersApi";
import {
  useGetFilterPreferencesQuery,
  useUpdateFilterPreferencesMutation,
} from "@/redux/services/preferencesApi";
import DropdownSearchInput from "@/components/Common/CustomSearch/DropdownSearchInput";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import CircularLoader from "@/components/Common/CustomSearch/CircularLoader";
import AddIcon from "@mui/icons-material/Add";
import ShopifyOrderForm from "./ShopifyOrderForm";
import { exportToExcel } from "@/utils/exportToExcel";
import DownloadIcon from "@mui/icons-material/Download";

const Orders = ({ customerId }: { customerId?: string }) => {
  // Use column preferences hook
  const {
    filteredColumns,
    handleColumnMoved,
    handleResetColumns,
    storageKey,
    allColumnsWithVisibility,
    toggleColumnVisibility,
    updateColumnsVisibility,
    isSaving,
  } = useColumnPreferences({
    endpoint: "customer_orders",
    tabName: "Orders",
    defaultColumns: orders,
  });
  const userId =
    typeof window !== "undefined"
      ? getUserInfo()?.user_id || undefined
      : undefined;
  const { data: filterPrefs, isLoading: isFilterPrefsLoading } =
    useGetFilterPreferencesQuery({
      user_id: userId,
      endpoint: "customer_orders",
    });

  // Apply column customization
  const orderCol = useOrdersColumn(filteredColumns);

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [orderIdFilter, setOrderIdFilter] = useState<string | undefined>(
    undefined,
  );
  const [customerNameFilter, setCustomerNameFilter] = useState<
    string | undefined
  >(undefined);
  const [customerReferenceNoFilter, setCustomerReferenceNoFilter] = useState<
    string | undefined
  >(undefined);
  const [shippingAddressFilter, setShippingAddressFilter] = useState<
    string | undefined
  >(undefined);
  const [customerNoFilter, setcustomerNoFilter] = useState<string | undefined>(
    undefined,
  );
  const [trackigFilter, setTrackingFilter] = useState<string | undefined>(
    undefined,
  );
  const [orderIdInput, setOrderIdInput] = useState("");
  const [customerIdInput, setCustomerIdInput] = useState("");
  const [customerIdFilter, setCustomerIdFilter] = useState<string | undefined>(
    undefined,
  );
  const [isCustomerIDTyping, setIsCustomerIDTyping] = useState(false);

  const [customerNameInput, setCustomerNameInput] = useState("");
  const [shippingAddressInput, setShippingAddressInput] = useState("");
  const [customerNoInput, setcustomerNoInput] = useState("");

  const [customerReferenceNoInput, setCustomerReferenceNoInput] = useState("");
  const [trackingInput, setTrackingInput] = useState("");
  const [orderIdtyping, setIsOrderIdTyping] = useState(false);
  const [customerNametyping, setIsCustomerNameTyping] = useState(false);
  const [shippingAddresstyping, setIsShippingAddressTyping] = useState(false);
  const [customerNotyping, setIsCustomerNoTyping] = useState(false);

  const [customerReferenceNotyping, setIsCustomerReferenceNoTyping] =
    useState(false);
  const [trackingtyping, setIsTrackingTyping] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | number | null>(
    null,
  );
  const [dateInput, setDateInput] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  const [profitNametyping, setIsProfitNameTyping] = useState(false);
  const [profitNameInput, setProfitNameInput] = useState("");
  const [profitNameFilter, setProfitNameFilter] = useState<string | undefined>(
    undefined,
  );
  const [isRetailerNametyping, setIsRetailerNameTyping] = useState(false);
  const [retailerNameInput, setRetailerNameInput] = useState("");
  const [retailerNameFilter, setRetailerNameFilter] = useState<
    string | undefined
  >(undefined);

  const [isFullfillmenttyping, setIsFullfillmentTyping] = useState(false);
  const [FullfillmentInput, setFullfillmentInput] = useState("");
  const [FullfillmentFilter, setFullfillmentFilter] = useState<
    string | undefined
  >(undefined);

  const [isOrderStatustyping, setIsOrderStatusTyping] = useState(false);
  const [OrderStatusInput, setOrderStatusInput] = useState("");
  const [OrderStatusFilter, setOrderStatusFilter] = useState<
    string | undefined
  >(undefined);

  const [isPsiNumbertyping, setIsPsiNumbertyping] = useState(false);
  const [psiNumberInput, setPsiNumberInput] = useState("");
  const [psiNumberStatusFilter, setPsiNumberFilter] = useState<
    string | undefined
  >(undefined);
  const [isPhoneNumbertyping, setIsPhoneNumberTyping] = useState(false);
  const [phoneNumberInput, setPhoneNumberInput] = useState("");

  const [phoneNumberStatusFilter, setPhoneNumberFilter] = useState<
    string | undefined
  >(undefined);
  const [yourReferenceInput, setYourReferenceInput] = useState("");
  const [yourReferenceFilter, setYourReferenceFilter] = useState<
    string | undefined
  >(undefined);
  const [isYourReferenceTyping, setIsYourReferenceTyping] = useState(false);
  const { isActive, isOrderItemsOpen, activeTabName } = useSelector(
    (state: RootState) => state.tab,
  );

  // Dynamic filter popover state
  const [anchorElFilters, setAnchorElFilters] = useState<null | HTMLElement>(
    null,
  );
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filterSearchText, setFilterSearchText] = useState("");
  const [pendingFilters, setPendingFilters] = useState<string[]>([]);

  // available filters (excluding the default 3)
  const filterOptions = [
    { key: "shippingAddress", label: "Shipping Address", type: "input" },
    { key: "customerNo", label: "Customer No", type: "input" },
    // { key: "customerReferenceNo", label: "Customer Ref No", type: "input" },
    { key: "customerID", label: "Customer ID", type: "input" },

    { key: "tracking", label: "Tracking", type: "input" },
    { key: "profitName", label: "Profit Name", type: "dropdown" },
    { key: "retailerName", label: "Retailer Name", type: "dropdown" },
    { key: "orderStatus", label: "Order Status", type: "dropdown" },
    {
      key: "fulfillmentStatus",
      label: "Fullfillment Status",
      type: "dropdown",
    },
    { key: "psiNumber", label: "PSI Number", type: "input" },
    { key: "phone_no", label: "Phone No", type: "input" },
    { key: "your_reference", label: "Your Reference", type: "input" },
  ];

  const { data, isLoading, isFetching } = useGetCustomerOrdersQuery({
    page,
    page_size: pageSize,
    source: "Orders",
    order_id: orderIdFilter || undefined,
    customer_id: customerIdFilter || customerId || undefined,
    customer_name: customerNameFilter || undefined,
    customer_reference_no: customerReferenceNoFilter || undefined,
    shipping_address: shippingAddressFilter || undefined,
    customer_no: customerNoFilter || undefined,
    tracking: trackigFilter || undefined,
    customer_email: searchTerm || undefined,
    order_date: dateFilter || "",
    profit_name: profitNameFilter || undefined,
    retailer: retailerNameFilter || undefined,
    fulfillment_status: FullfillmentFilter || undefined,
    order_status: OrderStatusFilter || undefined,
    psi_number: psiNumberStatusFilter || undefined,
    phone_no: phoneNumberStatusFilter || undefined,
    your_reference: yourReferenceFilter || undefined,
  });

  const {
    data: customerNameSuggestions = [],
    isFetching: isCustomerNameLoading,
  } = useGetCustomerNamesQuery(customerNameInput, {
    skip: customerNameInput.trim().length < 1,
  });

  const { data: profitNameSuggestions = [], isFetching: isProfitNameLoading } =
    useGetProfitNamesQuery(profitNameInput, {
      skip: profitNameInput.trim().length < 1,
    });

  const { data: retailerSuggestions = [], isFetching: isRetailerLoading } =
    useGetRetailersQuery(retailerNameInput, {
      skip: retailerNameInput.trim().length < 1,
    });

  const { data: statusSuggestions = [], isFetching: isStatusLoading } =
    useGetStatusesQuery(OrderStatusInput, {
      skip: OrderStatusInput.trim().length < 1,
    });

  const {
    data: fullfillmentStatusSuggestions = [],
    isFetching: isFullfillmentStatusLoading,
  } = useGetFullfillmentStatusesQuery(FullfillmentInput, {
    skip: FullfillmentInput.trim().length < 1,
  });
  const [openCreateOrder, setOpenCreateOrder] = useState(false);
  const rowData = useMemo(() => {
    const results = data?.data || [];

    return results.map((item: any) => ({
      order_id: item.order_id,
      customer_id: item.customer_id,
      customer_name: item.customer_name || "N/A",
      customer_reference_no: item.customer_reference_no || "N/A",
      profit_name: item.profit_name,
      customer_no: item.customer_no,
      phone_no: item.phone_no || "N/A",
      customer_email: item.customer_email || "N/A",
      // order_date: item.order_date,
      order_date: item.order_date ? item.order_date.split("T")[0] : "N/A",

      total_value: `$${item.total_value}`,
      discount_code: item.discount_code,
      fulfillment_status: item.fulfillment_status,
      shipping_address: item.shipping_address,
      channel: item.channel,
      tracking: item.tracking || "N/A",
      retailer: item.retailer || "N/A",
      order_status: item.order_status || "N/A",
      psi_number: item.psi_number || "N/A",
      rma_status: item.rma_status || "N/A",
      receive: item.receive ?? "N/A",
      redo: Array.isArray(item.redo)
        ? item.redo.join(", ")
        : (item.redo ?? "N/A"),
      extend: Array.isArray(item.extend)
        ? item.extend.join(", ")
        : (item.extend ?? "N/A"),
      order_url: item.order_url ?? "N/A",
      shipping_zip_code: item.shipping_zip_code || "N/A",
      release_error: item.release_error || "N/A",
      extend_flag: item.extend_flag,
      redo_flag: item.redo_flag,
      your_reference: item.your_reference || "N/A",
      ship_to_address: item.ship_to_address || "N/A",
      ship_to_address_2: item.ship_to_address_2 || "N/A",
      ship_to_city: item.ship_to_city || "N/A",
      location_code: item.location_code || "N/A",
    }));
  }, [data]);

  useEffect(() => {
    // Whenever filters or searchTerm change, reset selected order
    setSelectedOrder(null);
  }, [
    orderIdFilter,
    customerIdFilter,
    customerNameFilter,
    customerReferenceNoFilter,
    shippingAddressFilter,
    trackigFilter,
    dateFilter,
    profitNameFilter,
    retailerNameFilter,
    FullfillmentFilter,
    OrderStatusFilter,
    psiNumberStatusFilter,
    searchTerm,
    customerNoFilter,
    phoneNumberStatusFilter,
    yourReferenceFilter,
  ]);

  // Auto-select first order when search/filter results load
  useEffect(() => {
    // If any search or filter is active
    const hasActiveFilter =
      orderIdFilter ||
      customerIdFilter ||
      customerNameFilter ||
      customerReferenceNoFilter ||
      shippingAddressFilter ||
      customerNoFilter ||
      trackigFilter ||
      dateFilter ||
      profitNameFilter ||
      retailerNameFilter ||
      FullfillmentFilter ||
      OrderStatusFilter ||
      psiNumberStatusFilter ||
      phoneNumberStatusFilter ||
      yourReferenceFilter ||
      searchTerm;

    // When data updates and filters are active
    if (isActive && hasActiveFilter && data?.data?.length > 0) {
      setSelectedOrder(data.data[0]); //  auto-select the first order
    }
  }, [
    data, // refires when API data changes
    orderIdFilter,
    customerIdFilter,
    customerNameFilter,
    customerReferenceNoFilter,
    shippingAddressFilter,
    customerNoFilter,
    trackigFilter,
    dateFilter,
    profitNameFilter,
    retailerNameFilter,
    FullfillmentFilter,
    OrderStatusFilter,
    psiNumberStatusFilter,
    phoneNumberStatusFilter,
    yourReferenceFilter,
    searchTerm,
  ]);

  useEffect(() => {
    if (
      orderIdFilter && // user searched by Order ID
      data?.data?.length === 1 // only one match
    ) {
      setSelectedOrder(data.data[0]); // auto-select it
    }
  }, [orderIdFilter, data]);
  const onRowClicked = (params: any) => {
    const event = params?.event;
    const target = event?.target as HTMLElement;

    // 🛑 ignore clicks from copy icon or from the "Open Order" link
    if (
      target.closest(".MuiIconButton-root") ||
      target.closest(".order-link") // custom class we’ll add
    ) {
      return;
    }

    // ✅ your normal logic
    if (selectedOrder?.order_id === params.data.order_id) {
      setSelectedOrder(null);
    } else {
      setSelectedOrder(params.data);
    }
  };

  // debounced functions (kept as you had them)
  const debouncedOrderId = useMemo(
    () =>
      debounce((value: string) => {
        setOrderIdFilter(value ? value.toUpperCase() : undefined);
        setPage(1);
        setIsOrderIdTyping(false);
      }, 5000),
    [],
  );
  const debouncedCustomerId = useMemo(
    () =>
      debounce((value: string) => {
        setCustomerIdFilter(value ? value.toUpperCase() : undefined);
        setPage(1);
        setIsCustomerIDTyping(false);
      }, 5000),
    [],
  );
  const debouncedCustomerName = useMemo(
    () =>
      debounce((value: string) => {
        setCustomerNameFilter(value || undefined);
        setPage(1);
        setIsCustomerNameTyping(false);
      }, 5000),
    [],
  );

  const debouncedProfitName = useMemo(
    () =>
      debounce((value: string) => {
        setProfitNameFilter(value || undefined);
        setPage(1);
        setIsProfitNameTyping(false);
      }, 5000),
    [],
  );

  const debouncedRetailerName = useMemo(
    () =>
      debounce((value: string) => {
        setRetailerNameFilter(value || undefined);
        setPage(1);
        setIsRetailerNameTyping(false);
      }, 5000),
    [],
  );
  const debouncedPsiNumber = useMemo(
    () =>
      debounce((value: string) => {
        setPsiNumberFilter(value || undefined);
        setPage(1);
        setIsPsiNumbertyping(false);
      }, 5000),
    [],
  );
  const debouncedPhoneNo = useMemo(
    () =>
      debounce((value: string) => {
        setPhoneNumberFilter(value || undefined);
        setPage(1);
        setIsPhoneNumberTyping(false);
      }, 5000),
    [],
  );
  const debouncedYourReference = useMemo(
    () =>
      debounce((value: string) => {
        setYourReferenceFilter(value || undefined);
        setPage(1);
        setIsYourReferenceTyping(false);
      }, 5000),
    [],
  );
  const debouncedOrderStatus = useMemo(
    () =>
      debounce((value: string) => {
        setOrderStatusFilter(value || undefined);
        setPage(1);
        setIsOrderStatusTyping(false);
      }, 5000),
    [],
  );

  const debouncedFullfilmentStatus = useMemo(
    () =>
      debounce((value: string) => {
        setFullfillmentFilter(value || undefined);
        setPage(1);
        setIsFullfillmentTyping(false);
      }, 5000),
    [],
  );

  const debouncedShippingAddress = useMemo(
    () =>
      debounce((value: string) => {
        setShippingAddressFilter(value || undefined);
        setPage(1);
        setIsShippingAddressTyping(false);
      }, 5000),
    [],
  );
  const debouncedCustomerNo = useMemo(
    () =>
      debounce((value: string) => {
        setcustomerNoFilter(value || undefined);
        setPage(1);
        setIsCustomerNoTyping(false);
      }, 5000),
    [],
  );
  const debouncedcustomerReferenceNo = useMemo(
    () =>
      debounce((value: string) => {
        setCustomerReferenceNoFilter(value || undefined);
        setPage(1);
        setIsCustomerReferenceNoTyping(false);
      }, 5000),
    [],
  );
  const debouncedTracking = useMemo(
    () =>
      debounce((value: string) => {
        setTrackingFilter(value || undefined);
        setPage(1);
        setIsTrackingTyping(false);
      }, 5000),
    [],
  );

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearchTerm(value);
        setPage(1);
        setIsTyping(false);
      }, 5000),
    [],
  );

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    if (value.trim() === "") {
      setSearchTerm("");
      setPage(1);
      debouncedSearch.cancel(); // cancel pending debounce
    } else {
      debouncedSearch(value);
      setIsTyping(true);
    }
  };
  useEffect(() => {
    if (filterPrefs?.data) {
      const enabledFilters = filterPrefs.data
        .filter((f: any) => f.flag)
        .map((f: any) => {
          // map backend keys to your frontend filter keys if needed
          switch (f.filters) {
            case "customer_id":
              return "customerID";
            case "shipping_address":
              return "shippingAddress";
            case "customer_no":
              return "customerNo";
            case "tracking":
              return "tracking";
            case "profit_name":
              return "profitName";
            case "retailer":
              return "retailerName";
            case "order_status":
              return "orderStatus";
            case "fulfillment_status":
              return "fulfillmentStatus";
            case "psi_number":
              return "psiNumber";
            case "phone_no":
              return "phone_no";
            case "your_reference":
              return "your_reference";
            default:
              return null;
          }
        })
        .filter(Boolean); // remove nulls
      setActiveFilters(enabledFilters);
    }
  }, [filterPrefs]);

  // -------------- Dynamic filter handlers ----------------
  const handleToggleFilter = (key: string) => {
    if (activeFilters.includes(key)) {
      // removing
      setActiveFilters((prev) => prev.filter((f) => f !== key));
      // clear corresponding inputs & filters
      switch (key) {
        case "shippingAddress":
          setShippingAddressInput("");
          setShippingAddressFilter(undefined);
          setIsShippingAddressTyping(false);
          break;
        case "customerNo":
          setcustomerNoInput("");
          setcustomerNoFilter(undefined);
          setIsCustomerNoTyping(false);
          break;
        case "customerID":
          setCustomerIdInput("");
          setCustomerIdFilter(undefined);
          setIsCustomerIDTyping(false);
          break;
        // case "customerReferenceNo":
        //   setCustomerReferenceNoInput("");
        //   setCustomerReferenceNoFilter(undefined);
        //   setIsCustomerReferenceNoTyping(false);
        //   break;
        case "tracking":
          setTrackingInput("");
          setTrackingFilter(undefined);
          setIsTrackingTyping(false);
          break;
        case "profitName":
          setProfitNameInput("");
          setProfitNameFilter(undefined);
          setIsProfitNameTyping(false);
          break;
        case "retailerName":
          setRetailerNameInput("");
          setRetailerNameFilter(undefined);
          setIsRetailerNameTyping(false);
          break;
        case "orderStatus":
          setOrderStatusInput("");
          setOrderStatusFilter(undefined);
          setIsOrderStatusTyping(false);
          break;
        case "fulfillmentStatus":
          setFullfillmentInput("");
          setFullfillmentFilter(undefined);
          setIsFullfillmentTyping(false);
          break;
        case "psiNumber":
          setPsiNumberInput("");
          setPsiNumberFilter(undefined);
          setIsPsiNumbertyping(false);
          break;
        case "phone_no":
          setPhoneNumberFilter(undefined);
          setPhoneNumberInput("");
          setIsPhoneNumberTyping(false);
          break;

        case "your_reference":
          setYourReferenceFilter(undefined);
          setYourReferenceInput("");
          setIsYourReferenceTyping(false);
          break;

        default:
          break;
      }
    } else {
      // adding
      setActiveFilters((prev) => [...prev, key]);
    }
  };
  const [updateFilterPrefs] = useUpdateFilterPreferencesMutation();

  // const handleToggleFilterWithSave = (key: string) => {
  //   let newActiveFilters: string[];
  //   if (activeFilters.includes(key)) {
  //     newActiveFilters = activeFilters.filter((f) => f !== key);
  //   } else {
  //     newActiveFilters = [...activeFilters, key];
  //   }
  //   setActiveFilters(newActiveFilters);

  //   // Don't save to API if user is not authenticated
  //   if (!userId) {
  //     console.warn("Cannot save filter preferences: user not authenticated");
  //     return;
  //   }

  //   // Define all filters including default visible ones
  //   const allFilters = [
  //     { key: "order_id", backendKey: "order_id", alwaysVisible: true },
  //     {
  //       key: "customer_reference_no",
  //       backendKey: "customer_reference_no",
  //       alwaysVisible: true,
  //     },
  //     ...filterOptions.map((f) => ({
  //       key: f.key,
  //       backendKey: (() => {
  //         switch (f.key) {
  //           case "customerID":
  //             return "customer_id";
  //           case "shippingAddress":
  //             return "shipping_address";
  //           case "customerNo":
  //             return "customer_no";
  //           case "tracking":
  //             return "tracking";
  //           case "profitName":
  //             return "profit_name";
  //           case "retailerName":
  //             return "retailer";
  //           case "orderStatus":
  //             return "order_status";
  //           case "fulfillmentStatus":
  //             return "fulfillment_status";
  //           case "psiNumber":
  //             return "psi_number";
  //           case "phone_no":
  //             return "phone_no";
  //           case "your_reference":
  //             return "your_reference";
  //           default:
  //             return f.key;
  //         }
  //       })(),
  //       alwaysVisible: false,
  //     })),
  //   ];

  //   // Map to backend format
  //   const backendData = allFilters.map((f) => ({
  //     user_id: userId,
  //     endpoint: "customer_orders",
  //     filter_name: "CUSTOMER_ORDERS_FILTER_COLUMN_MAP",
  //     filters: f.backendKey,
  //     flag: f.alwaysVisible || newActiveFilters.includes(f.key),
  //   }));

  //   updateFilterPrefs({ data: backendData });
  // };

  const handleToggleFilterWithSave = async (key: string) => {
    const actionLabel = filterOptions.find((f) => f.key === key)?.label || key;

    let newActiveFilters: string[];

    if (activeFilters.includes(key)) {
      newActiveFilters = activeFilters.filter((f) => f !== key);
    } else {
      newActiveFilters = [...activeFilters, key];
    }

    setActiveFilters(newActiveFilters);

    // 🧠 Prevent updates if not authenticated
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    const allFilters = [
      { key: "order_id", backendKey: "order_id", alwaysVisible: true },
      {
        key: "customer_reference_no",
        backendKey: "customer_reference_no",
        alwaysVisible: true,
      },
      ...filterOptions.map((f) => ({
        key: f.key,
        backendKey: (() => {
          switch (f.key) {
            case "customerID":
              return "customer_id";
            case "shippingAddress":
              return "shipping_address";
            case "customerNo":
              return "customer_no";
            case "tracking":
              return "tracking";
            case "profitName":
              return "profit_name";
            case "retailerName":
              return "retailer";
            case "orderStatus":
              return "order_status";
            case "fulfillmentStatus":
              return "fulfillment_status";
            case "psiNumber":
              return "psi_number";
            case "phone_no":
              return "phone_no";
            case "your_reference":
              return "your_reference";
            default:
              return f.key;
          }
        })(),
        alwaysVisible: false,
      })),
    ];

    const backendData = allFilters.map((f) => ({
      user_id: userId,
      endpoint: "customer_orders",
      filter_name: "CUSTOMER_ORDERS_FILTER_COLUMN_MAP",
      filters: f.backendKey,
      flag: f.alwaysVisible || newActiveFilters.includes(f.key),
    }));

    // ------------------ 🔐 SERIALIZED API SAVE WITH TOAST FEEDBACK ------------------
    try {
      const toastId = toast.loading("Saving filter preferences...");

      // Wait for any ongoing save (serialization lock)
      if ((window as any).__isSavingFilterPrefs) {
        console.log("[Filters] Waiting for previous save to finish...");
        while ((window as any).__isSavingFilterPrefs) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      (window as any).__isSavingFilterPrefs = true;

      // Actual write
      const result = await updateFilterPrefs({ data: backendData }).unwrap();

      // Optional: you can re-fetch filters here if you have a refetch hook
      // setTimeout(() => refetchFilterPreferences(), 150);

      if (result?.success || result?.status === "success") {
        toast.success(
          activeFilters.includes(key)
            ? `Filter "${actionLabel}" removed successfully`
            : `Filter "${actionLabel}" added successfully`,
          { id: toastId },
        );
      } else {
        toast.error("Failed to update filter preferences.", { id: toastId });
      }
    } catch (error) {
      console.error("[Filters] Failed to update preferences:", error);
      toast.error("Error saving filter preferences.", { duration: 2500 });
    } finally {
      (window as any).__isSavingFilterPrefs = false; // release lock
    }
  };

  const handleRemoveFilter = (key: string) => {
    // same as toggling off
    handleToggleFilter(key);
  };

  const handleApplyFilters = async () => {
    const toRemove = activeFilters.filter((k) => !pendingFilters.includes(k));

    toRemove.forEach((key) => {
      switch (key) {
        case "shippingAddress":
          setShippingAddressInput("");
          setShippingAddressFilter(undefined);
          setIsShippingAddressTyping(false);
          break;
        case "customerNo":
          setcustomerNoInput("");
          setcustomerNoFilter(undefined);
          setIsCustomerNoTyping(false);
          break;
        case "customerID":
          setCustomerIdInput("");
          setCustomerIdFilter(undefined);
          setIsCustomerIDTyping(false);
          break;
        case "tracking":
          setTrackingInput("");
          setTrackingFilter(undefined);
          setIsTrackingTyping(false);
          break;
        case "profitName":
          setProfitNameInput("");
          setProfitNameFilter(undefined);
          setIsProfitNameTyping(false);
          break;
        case "retailerName":
          setRetailerNameInput("");
          setRetailerNameFilter(undefined);
          setIsRetailerNameTyping(false);
          break;
        case "orderStatus":
          setOrderStatusInput("");
          setOrderStatusFilter(undefined);
          setIsOrderStatusTyping(false);
          break;
        case "fulfillmentStatus":
          setFullfillmentInput("");
          setFullfillmentFilter(undefined);
          setIsFullfillmentTyping(false);
          break;
        case "psiNumber":
          setPsiNumberInput("");
          setPsiNumberFilter(undefined);
          setIsPsiNumbertyping(false);
          break;
        case "phone_no":
          setPhoneNumberInput("");
          setPhoneNumberFilter(undefined);
          setIsPhoneNumberTyping(false);
          break;
        case "your_reference":
          setYourReferenceInput("");
          setYourReferenceFilter(undefined);
          setIsYourReferenceTyping(false);
          break;
        default:
          break;
      }
    });

    setActiveFilters(pendingFilters);
    setAnchorElFilters(null);

    if (!userId) return;

    const allFilters = [
      { key: "order_id", backendKey: "order_id", alwaysVisible: true },
      {
        key: "customer_reference_no",
        backendKey: "customer_reference_no",
        alwaysVisible: true,
      },
      ...filterOptions.map((f) => ({
        key: f.key,
        backendKey: (() => {
          switch (f.key) {
            case "customerID":
              return "customer_id";
            case "shippingAddress":
              return "shipping_address";
            case "customerNo":
              return "customer_no";
            case "tracking":
              return "tracking";
            case "profitName":
              return "profit_name";
            case "retailerName":
              return "retailer";
            case "orderStatus":
              return "order_status";
            case "fulfillmentStatus":
              return "fulfillment_status";
            case "psiNumber":
              return "psi_number";
            case "phone_no":
              return "phone_no";
            case "your_reference":
              return "your_reference";
            default:
              return f.key;
          }
        })(),
        alwaysVisible: false,
      })),
    ];

    const backendData = allFilters.map((f) => ({
      user_id: userId,
      endpoint: "customer_orders",
      filter_name: "CUSTOMER_ORDERS_FILTER_COLUMN_MAP",
      filters: f.backendKey,
      flag: f.alwaysVisible || pendingFilters.includes(f.key),
    }));

    try {
      const toastId = toast.loading("Saving filter preferences...");
      const result = await updateFilterPrefs({ data: backendData }).unwrap();
      if (result?.success || result?.status === "success") {
        toast.success("Filter preferences saved", { id: toastId });
      } else {
        toast.error("Failed to update filter preferences.", { id: toastId });
      }
    } catch (error) {
      toast.error("Error saving filter preferences.");
    }
  };

  const hasActiveFilters = activeFilters.length > 0;
  // ----------------------------------------------------------------

  return (
    <Box display="flex">
      <Box flex={1} p={customerId ? 0 : 1}>
        {!customerId && (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="flex-start"
            alignItems="stretch"
            pl={7}
            width="100%"
            gap={2} // uniform spacing between rows
          >
            {/* Top row: Email search + Date + Page Size */}
            <Box
              display="flex"
              flexWrap="wrap"
              justifyContent="space-between"
              alignItems="center"
              gap={2}
            >
              <Box
                display="flex"
                alignItems="center"
                flex={1}
                minWidth={200}
                gap={1}
              >
                <CustomSearchField
                  value={searchInput}
                  onChange={handleSearchInput}
                  placeholder="Search by Email"
                  fullWidth
                  InputProps={{
                    endAdornment: searchInput.trim() !== "" && isTyping && (
                      <InputAdornment position="end">
                        <CircularLoader size={16} color="#0E1B6B" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Send
                  onClick={() => {
                    setSearchTerm(searchInput);
                    setPage(1);
                  }}
                  style={{
                    cursor: "pointer",
                    color: "#004FA7",
                    height: 36,
                    width: 36,
                  }}
                />
              </Box>

              <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <CustomDateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  setStartDate={setStartDate}
                  setEndDate={setEndDate}
                  setFilter={setDateFilter}
                  setPage={setPage}
                />

                <CustomSelect
                  label="Page Size"
                  value={pageSize}
                  options={[10, 50, 100]}
                  onChange={(val) => {
                    setPageSize(val);
                    setPage(1);
                  }}
                />
              </Box>
            </Box>

            {/* ---------------- Dynamic Filters Row (NEW) ---------------- */}
            <Box
              display="flex"
              flexWrap="wrap"
              gap={2}
              alignItems="center"
              justifyContent="space-between"
            >
              {/* Always visible 3 filters */}
              <SearchInput
                label="Order ID"
                value={orderIdInput}
                setValue={(val) => {
                  setOrderIdInput(val);
                  setIsOrderIdTyping(true);
                }}
                setFilter={setOrderIdFilter}
                debouncedFunction={debouncedOrderId}
                loading={orderIdtyping}
                width={150}
              />

              {/* <SearchInput
                label="Customer ID"
                value={customerIdInput}
                setValue={(val) => {
                  setCustomerIdInput(val);
                  setIsCustomerIDTyping(true);
                }}
                setFilter={setCustomerIdFilter}
                debouncedFunction={debouncedCustomerId}
                loading={isCustomerIDTyping}
                width={150}
              /> */}
              <SearchInput
                label="Customer Reference No"
                value={customerReferenceNoInput}
                setValue={(val) => {
                  setCustomerReferenceNoInput(val);
                  setIsCustomerReferenceNoTyping(true);
                }}
                setFilter={setCustomerReferenceNoFilter}
                debouncedFunction={debouncedcustomerReferenceNo}
                loading={customerReferenceNotyping}
                width={190}
              />
              <DropdownSearchInput
                label="Customer Name"
                value={customerNameInput}
                setValue={setCustomerNameInput}
                setFilter={setCustomerNameFilter}
                debouncedFunction={debouncedCustomerName}
                loading={isCustomerNameLoading}
                suggestions={customerNameSuggestions?.results || []}
                width={150}
              />

              {/* Render active filters with fade animation */}
              {filterOptions.map((f) => {
                const isActive = activeFilters.includes(f.key);
                // only render the Fade wrapper for animated mount/unmount
                return (
                  <Fade key={f.key} in={isActive} timeout={220} unmountOnExit>
                    <Box display="flex" alignItems="center" gap={1}>
                      {f.key === "shippingAddress" && (
                        <SearchInput
                          label="Shipping Address"
                          value={shippingAddressInput}
                          setValue={(val) => {
                            setShippingAddressInput(val);
                            setIsShippingAddressTyping(true);
                          }}
                          setFilter={setShippingAddressFilter}
                          debouncedFunction={debouncedShippingAddress}
                          loading={shippingAddresstyping}
                          width={180}
                        />
                      )}
                      {f.key === "customerNo" && (
                        <SearchInput
                          label="Customer No"
                          value={customerNoInput}
                          setValue={(val) => {
                            setcustomerNoInput(val);
                            setIsCustomerNoTyping(true);
                          }}
                          setFilter={setcustomerNoFilter}
                          debouncedFunction={debouncedCustomerNo}
                          loading={customerNotyping}
                          width={180}
                        />
                      )}
                      {f.key === "customerID" && (
                        <SearchInput
                          label="Customer ID"
                          value={customerIdInput}
                          setValue={(val) => {
                            setCustomerIdInput(val);
                            setIsCustomerIDTyping(true);
                          }}
                          setFilter={setCustomerIdFilter}
                          debouncedFunction={debouncedCustomerId}
                          loading={isCustomerIDTyping}
                          width={180}
                        />
                      )}
                      {f.key === "customerReferenceNo" && (
                        <SearchInput
                          label="Customer Reference No"
                          value={customerReferenceNoInput}
                          setValue={(val) => {
                            setCustomerReferenceNoInput(val);
                            setIsCustomerReferenceNoTyping(true);
                          }}
                          setFilter={setCustomerReferenceNoFilter}
                          debouncedFunction={debouncedcustomerReferenceNo}
                          loading={customerReferenceNotyping}
                          width={190}
                        />
                      )}

                      {f.key === "tracking" && (
                        <SearchInput
                          label="Tracking"
                          value={trackingInput}
                          setValue={(val) => {
                            setTrackingInput(val);
                            setIsTrackingTyping(true);
                          }}
                          setFilter={setTrackingFilter}
                          debouncedFunction={debouncedTracking}
                          loading={trackingtyping}
                          width={150}
                        />
                      )}

                      {f.key === "profitName" && (
                        <DropdownSearchInput
                          label="Profit Name"
                          value={profitNameInput}
                          setValue={setProfitNameInput}
                          setFilter={setProfitNameFilter}
                          debouncedFunction={debouncedProfitName}
                          loading={isProfitNameLoading}
                          suggestions={profitNameSuggestions?.results || []}
                          width={150}
                        />
                      )}

                      {f.key === "retailerName" && (
                        <DropdownSearchInput
                          label="Retailer Name"
                          value={retailerNameInput}
                          setValue={setRetailerNameInput}
                          setFilter={setRetailerNameFilter}
                          debouncedFunction={debouncedRetailerName}
                          loading={isRetailerLoading}
                          suggestions={retailerSuggestions?.results || []}
                          width={150}
                        />
                      )}

                      {f.key === "orderStatus" && (
                        <DropdownSearchInput
                          label="Order Status"
                          value={OrderStatusInput}
                          setValue={setOrderStatusInput}
                          setFilter={setOrderStatusFilter}
                          debouncedFunction={debouncedOrderStatus}
                          loading={isStatusLoading}
                          suggestions={statusSuggestions?.results || []}
                          width={150}
                        />
                      )}

                      {f.key === "fulfillmentStatus" && (
                        <DropdownSearchInput
                          label="Fullfillment Status"
                          value={FullfillmentInput}
                          setValue={setFullfillmentInput}
                          setFilter={setFullfillmentFilter}
                          debouncedFunction={debouncedFullfilmentStatus}
                          loading={isFullfillmentStatusLoading}
                          suggestions={
                            fullfillmentStatusSuggestions?.results || []
                          }
                          width={150}
                        />
                      )}

                      {f.key === "psiNumber" && (
                        <SearchInput
                          label="PSI Number"
                          value={psiNumberInput}
                          setValue={(val) => {
                            setPsiNumberInput(val);
                            setIsPsiNumbertyping(true);
                          }}
                          setFilter={setPsiNumberFilter}
                          debouncedFunction={debouncedPsiNumber}
                          loading={isPsiNumbertyping}
                          width={180}
                        />
                      )}
                      {f.key === "phone_no" && (
                        <SearchInput
                          label="Phone Number"
                          value={phoneNumberInput}
                          setValue={(val) => {
                            setPhoneNumberInput(val);
                            setIsPhoneNumberTyping(true);
                          }}
                          setFilter={setPhoneNumberFilter}
                          debouncedFunction={debouncedPhoneNo}
                          loading={isPhoneNumbertyping}
                          width={180}
                        />
                      )}
                      {f.key === "your_reference" && (
                        <SearchInput
                          label="Your Reference"
                          value={yourReferenceInput}
                          setValue={(val) => {
                            setYourReferenceInput(val);
                            setIsYourReferenceTyping(true);
                          }}
                          setFilter={setYourReferenceFilter}
                          debouncedFunction={debouncedYourReference}
                          loading={isYourReferenceTyping}
                          width={180}
                        />
                      )}

                      {/* small close icon for quick remove */}
                      {/* {isActive && (
                        <IconButton
                          size="small"
                          // onClick={() => handleRemoveFilter(f.key)}
                          onClick={() => handleToggleFilterWithSave(f.key)}
                          sx={{ color: "gray" }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      )} */}
                    </Box>
                  </Fade>
                );
              })}

              <Box display="flex" alignItems="center" gap={1} ml="auto">
                {/* Add Filters popover (icon button) */}
                <Tooltip title="Add Filters">
                  <IconButton
                    color="default"
                    onClick={(e) => {
                      setPendingFilters(activeFilters);
                      setFilterSearchText("");
                      setAnchorElFilters(e.currentTarget);
                    }}
                    size="medium"
                  >
                    <Badge
                      color="primary"
                      variant="dot"
                      invisible={!hasActiveFilters}
                      overlap="circular"
                    >
                      <FilterListIcon
                        color={hasActiveFilters ? "primary" : "inherit"}
                      />
                    </Badge>
                  </IconButton>
                </Tooltip>

                {(userId === "kav1" ||
                  userId === "mdb1" ||
                  userId === "mdb20" ||
                  userId === "mdb15") && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setOpenCreateOrder(true)}
                    sx={{
                      background:
                        "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "14px",
                      borderRadius: "8px",
                      padding: "8px 20px",
                      textTransform: "none",
                      whiteSpace: "nowrap",
                      boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
                      "&:hover": {
                        background:
                          "linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)",
                        boxShadow: "0 6px 20px rgba(99, 102, 241, 0.55)",
                      },
                    }}
                  >
                    Create Order
                  </Button>
                )}
              </Box>

              <Popover
                open={Boolean(anchorElFilters)}
                anchorEl={anchorElFilters}
                onClose={() => setAnchorElFilters(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                PaperProps={{
                  sx: {
                    borderRadius: "16px",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.16)",
                    overflow: "hidden",
                    width: 280,
                    mt: 0.75,
                    fontFamily: "Inter, sans-serif",
                  },
                }}
              >
                <Box display="flex" flexDirection="column">
                  {/* Gradient Header */}
                  <Box
                    sx={{
                      background:
                        "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                      px: 2,
                      py: 1.75,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        background: "rgba(255,255,255,0.18)",
                        borderRadius: "8px",
                        width: 32,
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <FilterAltIcon sx={{ color: "#fff", fontSize: 18 }} />
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "14px",
                          lineHeight: 1.2,
                        }}
                      >
                        Filters
                      </Typography>
                      <Typography
                        sx={{
                          color: "rgba(255,255,255,0.75)",
                          fontSize: "11px",
                          mt: 0.25,
                        }}
                      >
                        Select filters to display
                      </Typography>
                    </Box>
                  </Box>

                  {/* Search */}
                  <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Search filters..."
                      value={filterSearchText}
                      onChange={(e) => setFilterSearchText(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search sx={{ fontSize: 16, color: "#9CA3AF" }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "8px",
                          fontSize: "13px",
                          backgroundColor: "#F9FAFB",
                          "& fieldset": {
                            borderColor: "#E5E7EB",
                            borderWidth: "1.5px",
                          },
                          "&:hover fieldset": { borderColor: "#C4B5FD" },
                          "&.Mui-focused fieldset": {
                            borderColor: "#6366F1",
                            borderWidth: "1.5px",
                          },
                        },
                        "& .MuiInputBase-input::placeholder": {
                          color: "#9CA3AF",
                          fontSize: "13px",
                        },
                      }}
                    />
                  </Box>

                  {/* Section label */}
                  <Typography
                    sx={{
                      px: 2,
                      pb: 0.5,
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#9CA3AF",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Available Filters
                  </Typography>

                  {/* Options list */}
                  <Box
                    sx={{
                      maxHeight: 240,
                      overflowY: "auto",
                      px: 1,
                      pb: 0.5,
                      "&::-webkit-scrollbar": { width: "4px" },
                      "&::-webkit-scrollbar-track": {
                        background: "transparent",
                      },
                      "&::-webkit-scrollbar-thumb": {
                        background: "rgba(99,102,241,0.3)",
                        borderRadius: "8px",
                      },
                      "&::-webkit-scrollbar-thumb:hover": {
                        background: "rgba(99,102,241,0.55)",
                      },
                    }}
                  >
                    {filterOptions
                      .filter(
                        (f) =>
                          filterSearchText === "" ||
                          f.label
                            .toLowerCase()
                            .includes(filterSearchText.toLowerCase()),
                      )
                      .map((f) => {
                        const isChecked = pendingFilters.includes(f.key);
                        return (
                          <Box
                            key={f.key}
                            display="flex"
                            alignItems="center"
                            sx={{
                              px: 1,
                              py: 0.5,
                              borderRadius: "8px",
                              cursor: "pointer",
                              transition: "background 0.12s",
                              bgcolor: isChecked ? "#F5F3FF" : "transparent",
                              "&:hover": {
                                bgcolor: isChecked ? "#EDE9FE" : "#F9FAFB",
                              },
                            }}
                            onClick={() =>
                              setPendingFilters((prev) =>
                                prev.includes(f.key)
                                  ? prev.filter((k) => k !== f.key)
                                  : [...prev, f.key],
                              )
                            }
                          >
                            <Checkbox
                              checked={isChecked}
                              size="small"
                              sx={{
                                color: "#D1D5DB",
                                "&.Mui-checked": { color: "#6366F1" },
                                p: 0.5,
                              }}
                            />
                            <Typography
                              sx={{
                                ml: 0.75,
                                fontSize: "13px",
                                fontWeight: isChecked ? 600 : 400,
                                color: isChecked ? "#4338CA" : "#374151",
                                userSelect: "none",
                              }}
                            >
                              {f.label}
                            </Typography>
                          </Box>
                        );
                      })}
                  </Box>

                  {/* Divider */}
                  <Box
                    sx={{ borderTop: "1px solid #F3F4F6", mx: 1.5, mt: 0.5 }}
                  />

                  {/* Footer */}
                  <Box sx={{ px: 1.5, pt: 1.25, pb: 1.5 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleApplyFilters}
                      sx={{
                        background:
                          "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                        borderRadius: "8px",
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "13px",
                        py: 1,
                        boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                        letterSpacing: "0.01em",
                        "&:hover": {
                          background:
                            "linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)",
                          boxShadow: "0 6px 20px rgba(99,102,241,0.5)",
                        },
                      }}
                    >
                      Apply
                    </Button>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mt={1}
                    >
                      <Typography sx={{ fontSize: "12px", color: "#9CA3AF" }}>
                        {pendingFilters.length} selected
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#6366F1",
                          cursor: "pointer",
                          "&:hover": {
                            color: "#4338CA",
                            textDecoration: "underline",
                          },
                        }}
                        onClick={() => setPendingFilters([])}
                      >
                        Clear all
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Popover>

              {(userId === "kav1" ||
                userId === "mdb1" ||
                userId === "mdb20" ||
                userId === "mdb15" ||
                userId === "mdb14") && (
                <>
                  <Dialog
                    open={openCreateOrder}
                    onClose={() => setOpenCreateOrder(false)}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                      sx: { borderRadius: "16px", overflow: "hidden", m: 0 },
                    }}
                  >
                    <DialogContent
                      sx={{
                        p: 0,
                        overflowY: "auto",
                        "&::-webkit-scrollbar": {
                          width: "5px",
                        },
                        "&::-webkit-scrollbar-track": {
                          background: "transparent",
                        },
                        "&::-webkit-scrollbar-thumb": {
                          background: "rgba(99, 102, 241, 0.35)",
                          borderRadius: "10px",
                        },
                        "&::-webkit-scrollbar-thumb:hover": {
                          background: "rgba(99, 102, 241, 0.65)",
                        },
                      }}
                    >
                      <ShopifyOrderForm
                        onClose={() => setOpenCreateOrder(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </>
              )}
              {/* Reset all button (optional placement) */}
              {/* <Box sx={{ marginLeft: "auto" }}>
                <Button
                  variant="text"
                  color="error"
                  onClick={() => {
                    // clear all active dynamic filters
                    setActiveFilters([]);
                    // clear their inputs & filters
                    setShippingAddressInput("");
                    setShippingAddressFilter(undefined);
                    setCustomerReferenceNoInput("");
                    setCustomerReferenceNoFilter(undefined);
                    setTrackingInput("");
                    setTrackingFilter(undefined);
                    setProfitNameInput("");
                    setProfitNameFilter(undefined);
                    setRetailerNameInput("");
                    setRetailerNameFilter(undefined);
                    setOrderStatusInput("");
                    setOrderStatusFilter(undefined);
                    setFullfillmentInput("");
                    setFullfillmentFilter(undefined);
                    setPsiNumberInput("");
                    setPsiNumberFilter(undefined);
                  }}
                >
                  Reset All
                </Button>
              </Box> */}
            </Box>

            {/* ---------------- (Removed second static filter row) ---------------- */}
            {/* The dynamic row above replaces the old two-row filter UI. */}
          </Box>
        )}

        {isLoading || isFetching ? (
          <Loader />
        ) : (
          <Box ml={customerId ? 0 : 5}>
            <ResponsiveDashboard
              rowData={rowData}
              userCol={orderCol}
              onRowClicked={onRowClicked}
              // getRowStyle={getRowStyle}

              getRowStyle={getRowStyle(highlightedId)}
              selectedOrderId={selectedOrder?.order_id}
              enablePagination
              currentPage={page}
              totalPages={data?.total_pages || 1}
              onPageChange={(newPage: any) => setPage(newPage)}
              pagination={false}
              currentMenu="orders"
              paginationPageSize={pageSize}
              onColumnMoved={handleColumnMoved}
              onResetColumns={handleResetColumns}
              allColumnsWithVisibility={allColumnsWithVisibility}
              onToggleColumnVisibility={toggleColumnVisibility}
              onUpdateColumnsVisibility={updateColumnsVisibility}
              isVisibilityLoading={isSaving}
              filters={{
                orderIdFilter,
                customerIdFilter,
                customerNameFilter,
                profitNameFilter,
                retailerNameFilter,
                OrderStatusFilter,
                FullfillmentFilter,
                searchTerm,
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Orders;
