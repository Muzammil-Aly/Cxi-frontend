"use client";

import React, { useMemo, useState } from "react";
import {
  Box,
  Drawer,
  Divider,
  Collapse,
  IconButton,
  Typography,
  Avatar,
  Tooltip,
  Chip,
  Button,
  Skeleton,
  Popover,
  MenuItem,
  FormControl,
  Autocomplete,
  TextField,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import CancelIcon from "@mui/icons-material/Cancel";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import FingerprintOutlinedIcon from "@mui/icons-material/FingerprintOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import dayjs, { Dayjs } from "dayjs";
import debounce from "lodash.debounce";
import toast from "react-hot-toast";

import SearchInput from "@/components/Common/CustomSearch/SearchInput";
import PaginationBar from "@/components/ag-grid/Pagination";
import {
  useGetOrderHistoryQuery,
  OrderHistoryRow,
  ShopifyStore,
} from "@/redux/services/shopifyApi";
import { useGetCxiUsersQuery } from "@/redux/services/authApi";

// order_created and draft_order_created are omitted here on purpose — the
// current frontend never calls the endpoints that produce them (order
// creation always routes through the smart-draft flow below), so they can
// never actually occur and would only clutter the Action filter.
const ACTION_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  draft_order_completed: { label: "Draft Completed", icon: CheckCircleIcon, color: "#059669", bg: "#ECFDF5" },
  draft_order_invoice_sent: { label: "Invoice Sent", icon: MailOutlineIcon, color: "#D97706", bg: "#FFFBEB" },
  order_cancelled: { label: "Order Cancelled", icon: CancelIcon, color: "#DC2626", bg: "#FEF2F2" },
};

const getActionMeta = (action: string) =>
  ACTION_META[action] || { label: action, icon: ReceiptLongIcon, color: "#667085", bg: "#F4F6FB" };

const ACTION_OPTIONS = Object.keys(ACTION_META);
const STORE_OPTIONS: ShopifyStore[] = ["store1", "store2", "store3", "store4", "store5"];

// The order-creation form only ever sends the short code as `vendor` (see
// ShopifyOrderForm.tsx:4418-4420 — getStoreCode() takes everything before the
// first "-" of the store label), so that's what's actually stored in
// request_payload.vendor and what we must filter on — not the full label.
// Several codes share one store (e.g. store1 = Million Dollar Baby Co covers
// CP02/CP03/CP05/CP10), so this is the only way to filter to one product line.
// Exact label strings copied from STORE_OPTIONS in ShopifyOrderForm.tsx — not reworded.
const VENDOR_LABELS: Record<string, string> = {
  CP02: "CP02-replacement/warranty_parts",
  CP03: "CP03-consumer_parts_sales",
  CP05: "CP05-replacement/warranty_parts_consumer_wow",
  CP10: "CP10-cs_care",
  CP55: "CP55-babyletto",
  CP66: "CP66-namesake",
  CP77: "CP77-davincibaby",
  CP99: "CP99-nurseryworks",
};
const VENDOR_OPTIONS = Object.keys(VENDOR_LABELS);
const getVendorLabel = (code: string) => VENDOR_LABELS[code] || code;

// store1..5 map 1:1 to these brands across both the create and cancel
// modules — e.g. store1's several create-side vendor tags (CP02, CP03, CP05,
// CP10) are all sub-categories within Million Dollar Baby Co, matching
// store1's brand on the cancel side too. See STORE_OPTIONS / CANCEL_STORE_OPTIONS
// in ShopifyOrderForm.tsx.
const STORE_BRAND_LABELS: Record<string, string> = {
  store1: "Million Dollar Baby Co",
  store2: "Babyletto",
  store3: "Namesake",
  store4: "DaVinci",
  store5: "Nursery Works",
};

const getStoreLabel = (store: string) => STORE_BRAND_LABELS[store] || store;

// Mirrors SearchInput's exact visual recipe so every filter field —
// text, dropdown, select, or date-range — reads as one consistent set.
const filterFieldSx = {
  backgroundColor: "transparent",
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    backgroundColor: "#fff",
    fontSize: "15px",
    color: "#1C1C1E",
    height: 36,
    "& fieldset": { border: "1px solid #E0E0E0" },
    "&:hover fieldset": { borderColor: "#C9C9D1" },
    "&.Mui-focused fieldset": { borderColor: "#0E1B6B", borderWidth: "1.5px" },
    transition: "all 0.3s ease",
  },
  "& .MuiInputBase-input": { padding: "10px 10px 8px 10px !important" },
};

// Shared modern dropdown-panel style for both Autocomplete popups and Select menus.
const dropdownPaperSx = {
  mt: 0.5,
  borderRadius: "12px",
  border: "1px solid #F0EFEA",
  boxShadow: "0 8px 24px rgba(16,24,40,0.12)",
  overflow: "hidden",
  "& .MuiAutocomplete-listbox": { p: 0.75 },
  "& .MuiList-root": { p: 0.75 },
  "& .MuiAutocomplete-option": {
    borderRadius: "8px",
    fontSize: 14,
    px: 1.25,
    py: 0.75,
    my: "1px",
    '&[aria-selected="true"]': { bgcolor: "#EEF0FA", color: "#4658AC", fontWeight: 600 },
    "&.Mui-focused": { bgcolor: "#F4F6FB" },
  },
  "& .MuiMenuItem-root": {
    borderRadius: "8px",
    fontSize: 14,
    px: 1.25,
    py: 0.75,
    my: "1px",
    "&.Mui-selected": { bgcolor: "#EEF0FA", color: "#4658AC", fontWeight: 600 },
    "&.Mui-selected:hover": { bgcolor: "#EEF0FA" },
    "&:hover": { bgcolor: "#F4F6FB" },
  },
};

const formatRelativeTime = (dateStr: string) => {
  const diffSec = dayjs().diff(dayjs(dateStr), "second");
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return dayjs(dateStr).format("MMM D, YYYY");
};

const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  copyable?: boolean;
}> = ({ icon, label, value, copyable }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => toast.success("Copied to clipboard!"));
  };
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
      <Box sx={{ color: "#98A2B3", mt: "2px" }}>{icon}</Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography sx={{ fontSize: 13.5, color: "#1A1A1A", wordBreak: "break-all" }}>
            {value}
          </Typography>
          {copyable && (
            <Tooltip title={`Copy ${label.toLowerCase()}`}>
              <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
                <ContentCopyIcon sx={{ fontSize: 13, color: "#C0C4CC" }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );
};

const PayloadBlock: React.FC<{ title: string; data: any }> = ({ title, data }) => {
  const hasData = data && Object.keys(data).length > 0;
  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => toast.success("Copied to clipboard!"));
  };
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {title}
        </Typography>
        {hasData && (
          <Tooltip title="Copy JSON">
            <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
              <ContentCopyIcon sx={{ fontSize: 13, color: "#C0C4CC" }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Box
        component="pre"
        sx={{
          fontSize: 12,
          fontFamily: '"Roboto Mono", "Courier New", monospace',
          bgcolor: "#1A1A1E",
          color: "#D4D4D8",
          p: 2,
          borderRadius: "10px",
          overflowX: "auto",
          maxHeight: 260,
          lineHeight: 1.6,
          m: 0,
        }}
      >
        {hasData ? JSON.stringify(data, null, 2) : "—"}
      </Box>
    </Box>
  );
};

interface LineItemSummary {
  title: string;
  sku?: string;
  quantity: number;
  price?: string;
}

const extractLineItems = (payload: any): LineItemSummary[] => {
  const items = payload?.lineItems;
  if (!Array.isArray(items)) return [];
  return items.map((li: any) => ({
    title: li.title || li.sku || "Item",
    sku: li.sku,
    quantity: li.quantity ?? 1,
    price: li.originalUnitPrice || li.price,
  }));
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase", letterSpacing: 0.5, mb: 1 }}>
    {children}
  </Typography>
);

const LineItemsTable: React.FC<{ items: LineItemSummary[] }> = ({ items }) => {
  if (items.length === 0) return null;
  return (
    <Box>
      <SectionLabel>Line Items ({items.length})</SectionLabel>
      <Box display="flex" flexDirection="column" gap={1}>
        {items.map((item, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1.25,
              borderRadius: "12px",
              bgcolor: "#FAFAF8",
              border: "1px solid #F0EFEA",
              transition: "border-color 0.15s ease",
              "&:hover": { borderColor: "#E0E0E0" },
            }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: "#EEF0FA", color: "#4658AC", flexShrink: 0 }}>
              <Inventory2OutlinedIcon sx={{ fontSize: 16 }} />
            </Avatar>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }} noWrap>
                {item.title}
              </Typography>
              {item.sku && (
                <Typography
                  sx={{
                    fontSize: 10.5,
                    color: "#98A2B3",
                    fontFamily: '"Roboto Mono", "Courier New", monospace',
                    mt: 0.25,
                  }}
                  noWrap
                >
                  {item.sku}
                </Typography>
              )}
            </Box>

            <Box sx={{ textAlign: "right", flexShrink: 0 }}>
              {item.price && (
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "#1A1A1A" }}>
                  ${item.price}
                </Typography>
              )}
              <Box
                sx={{
                  display: "inline-flex",
                  mt: item.price ? 0.4 : 0,
                  px: 1,
                  py: 0.25,
                  borderRadius: "999px",
                  bgcolor: "#EEF0FA",
                  color: "#4658AC",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                × {item.quantity}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const OutcomeSummary: React.FC<{ action: string; resultPayload: any }> = ({ action, resultPayload }) => {
  if (action === "draft_order_invoice_sent") {
    const url = resultPayload?.invoice_url;
    if (!url) return null;
    return (
      <Box>
        <SectionLabel>Outcome</SectionLabel>
        <Button
          component="a"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          size="small"
          startIcon={<OpenInNewIcon sx={{ fontSize: 15 }} />}
          sx={{ textTransform: "none", borderRadius: "8px", borderColor: "#E0E0E0", color: "#4658AC" }}
        >
          Open Invoice
        </Button>
      </Box>
    );
  }

  if (action === "order_created" || action === "draft_order_created") {
    const amount = resultPayload?.totalPriceSet?.shopMoney?.amount;
    const currency = resultPayload?.totalPriceSet?.shopMoney?.currencyCode;
    const status = resultPayload?.displayFinancialStatus || resultPayload?.status;
    if (!amount && !status) return null;
    return (
      <Box>
        <SectionLabel>Outcome</SectionLabel>
        <Box sx={{ display: "flex", gap: 3 }}>
          {amount && (
            <Box>
              <Typography sx={{ fontSize: 11.5, color: "#98A2B3" }}>Total</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>
                {currency} {amount}
              </Typography>
            </Box>
          )}
          {status && (
            <Box>
              <Typography sx={{ fontSize: 11.5, color: "#98A2B3" }}>Status</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>{status}</Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  if (action === "draft_order_completed") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "#059669" }}>
        <CheckCircleIcon sx={{ fontSize: 17 }} />
        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>Marked as paid</Typography>
      </Box>
    );
  }

  if (action === "order_cancelled") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "#DC2626" }}>
        <CancelIcon sx={{ fontSize: 17 }} />
        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>Cancellation confirmed</Typography>
      </Box>
    );
  }

  return null;
};

interface CxiUserOption {
  user_id: string;
  user_name: string;
  email: string;
}

interface OrderHistoryProps {
  headerActions?: React.ReactNode;
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ headerActions }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: cxiUsersData } = useGetCxiUsersQuery();
  const cxiUsers: CxiUserOption[] = cxiUsersData?.data || [];

  const [orderIdInput, setOrderIdInput] = useState("");
  const [orderIdFilter, setOrderIdFilter] = useState<string | undefined>(undefined);
  const debouncedOrderId = useMemo(
    () => debounce((value: string) => {
      setOrderIdFilter(value || undefined);
      setPage(1);
    }, 500),
    []
  );

  const [userEmailInput, setUserEmailInput] = useState("");
  const [userEmailFilter, setUserEmailFilter] = useState<string | undefined>(undefined);
  const debouncedUserEmail = useMemo(
    () => debounce((value: string) => {
      setUserEmailFilter(value || undefined);
      setPage(1);
    }, 500),
    []
  );

  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);
  const [storeFilter, setStoreFilter] = useState<ShopifyStore | undefined>(undefined);
  const [vendorFilter, setVendorFilter] = useState<string | undefined>(undefined);

  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [dateFilter, setDateFilter] = useState<string | undefined>(undefined);
  const [dateFrom, dateTo] = dateFilter?.split(",") || [];
  const [dateAnchorEl, setDateAnchorEl] = useState<null | HTMLElement>(null);
  const [dateError, setDateError] = useState("");

  const handleDateOpen = (e: React.MouseEvent<HTMLElement>) => {
    setDateAnchorEl(e.currentTarget);
    setDateError("");
  };
  const handleDateClose = () => setDateAnchorEl(null);
  const handleDateClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStartDate(null);
    setEndDate(null);
    setDateFilter(undefined);
    setPage(1);
    setDateError("");
  };
  const handleDateChange = (newStart: Dayjs | null, newEnd: Dayjs | null) => {
    if (newStart && newEnd && newStart.isAfter(newEnd)) {
      setDateError("Start date cannot be after end date");
      return;
    }
    setStartDate(newStart);
    setEndDate(newEnd);
    if (newStart && newEnd) {
      setDateFilter(`${newStart.format("YYYY-MM-DD")},${newEnd.format("YYYY-MM-DD")}`);
      setPage(1);
      setDateError("");
      handleDateClose();
    } else {
      setDateFilter(undefined);
      setPage(1);
    }
  };

  const [selectedRow, setSelectedRow] = useState<OrderHistoryRow | null>(null);
  const [showRawPayload, setShowRawPayload] = useState(false);
  const openDetail = (row: OrderHistoryRow) => {
    setSelectedRow(row);
    setShowRawPayload(false);
  };

  const activeFilters: { key: string; label: string; onClear: () => void }[] = [];
  if (orderIdFilter) {
    activeFilters.push({
      key: "order",
      label: `Order: ${orderIdFilter}`,
      onClear: () => { setOrderIdInput(""); setOrderIdFilter(undefined); },
    });
  }
  if (userEmailFilter) {
    activeFilters.push({
      key: "user",
      label: `User: ${userEmailFilter}`,
      onClear: () => { setUserEmailInput(""); setUserEmailFilter(undefined); },
    });
  }
  if (actionFilter) {
    activeFilters.push({
      key: "action",
      label: getActionMeta(actionFilter).label,
      onClear: () => setActionFilter(undefined),
    });
  }
  if (storeFilter) {
    activeFilters.push({
      key: "store",
      label: getStoreLabel(storeFilter),
      onClear: () => setStoreFilter(undefined),
    });
  }
  if (vendorFilter) {
    activeFilters.push({
      key: "vendor",
      label: getVendorLabel(vendorFilter),
      onClear: () => setVendorFilter(undefined),
    });
  }
  if (dateFilter) {
    activeFilters.push({
      key: "date",
      label: `${dateFrom} → ${dateTo}`,
      onClear: () => { setStartDate(null); setEndDate(null); setDateFilter(undefined); },
    });
  }

  const clearAllFilters = () => {
    setOrderIdInput(""); setOrderIdFilter(undefined);
    setUserEmailInput(""); setUserEmailFilter(undefined);
    setActionFilter(undefined);
    setStoreFilter(undefined);
    setVendorFilter(undefined);
    setStartDate(null); setEndDate(null); setDateFilter(undefined);
    setPage(1);
  };

  const { data, isLoading, isFetching } = useGetOrderHistoryQuery({
    order_id: orderIdFilter,
    user_email: userEmailFilter,
    action: actionFilter,
    store: storeFilter,
    vendor: vendorFilter,
    date_from: dateFrom,
    date_to: dateTo,
    page,
    page_size: pageSize,
  });

  const rows = data?.data?.history || [];
  const totalPages = data?.data
    ? Math.max(1, Math.ceil(data.data.total / (data.data.page_size || pageSize)))
    : 1;

  // Group rows (already ordered newest-first by the API) into day sections
  // for the timeline — "Today" / "Yesterday" / calendar date.
  const groupedRows = useMemo(() => {
    const groups: { label: string; items: OrderHistoryRow[] }[] = [];
    const today = dayjs().startOf("day");
    const yesterday = today.subtract(1, "day");
    rows.forEach((row) => {
      const day = dayjs(row.created_at).startOf("day");
      const label = day.isSame(today, "day")
        ? "Today"
        : day.isSame(yesterday, "day")
        ? "Yesterday"
        : day.format("MMMM D, YYYY");
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.label === label) {
        lastGroup.items.push(row);
      } else {
        groups.push({ label, items: [row] });
      }
    });
    return groups;
  }, [rows]);

  return (
    <Box sx={{ p: 3, pl: 8, minHeight: "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1A1A1A" }}>
            Order History
          </Typography>
          <Typography sx={{ fontSize: "13px", color: "#6B7280", mt: 0.25 }}>
            Track who created or cancelled Shopify orders, and what changed
          </Typography>
        </Box>
        {headerActions}
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          mb: 3,
          bgcolor: "#fff",
          borderRadius: "16px",
          p: 2.5,
          boxShadow: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        }}
      >
        <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
          <SearchInput
            label="Order ID / Name"
            value={orderIdInput}
            setValue={setOrderIdInput}
            setFilter={setOrderIdFilter}
            debouncedFunction={debouncedOrderId}
            width={180}
          />
          <FormControl size="small" sx={{ width: 220 }}>
            <Autocomplete<CxiUserOption, false, false, true>
              freeSolo
              size="small"
              options={cxiUsers}
              inputValue={userEmailInput}
              onInputChange={(_, newValue, reason) => {
                if (reason === "input") {
                  setUserEmailInput(newValue);
                  if (newValue.trim()) {
                    debouncedUserEmail(newValue);
                  } else {
                    debouncedUserEmail.cancel();
                    setUserEmailFilter(undefined);
                  }
                } else if (reason === "clear") {
                  setUserEmailInput("");
                  setUserEmailFilter(undefined);
                  debouncedUserEmail.cancel();
                }
              }}
              onChange={(_, newValue) => {
                if (newValue && typeof newValue !== "string") {
                  setUserEmailInput(newValue.email);
                  setUserEmailFilter(newValue.email);
                  setPage(1);
                }
              }}
              getOptionLabel={(opt) => (typeof opt === "string" ? opt : opt.email)}
              filterOptions={(options, state) => {
                const q = state.inputValue.trim().toLowerCase();
                if (!q) return [];
                return options
                  .filter(
                    (u) =>
                      u.email.toLowerCase().includes(q) ||
                      u.user_name.toLowerCase().includes(q)
                  )
                  .slice(0, 8);
              }}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                return (
                  <Box component="li" key={option.user_id} {...optionProps} sx={{ display: "block !important" }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>
                      {option.user_name}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: "#98A2B3" }}>
                      {option.email}
                    </Typography>
                  </Box>
                );
              }}
              slotProps={{ paper: { sx: dropdownPaperSx } }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="User Email"
                  size="small"
                  sx={filterFieldSx}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon sx={{ fontSize: 17, color: "#98A2B3" }} />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </FormControl>

          <FormControl size="small" sx={{ width: 190 }}>
            <Autocomplete
              size="small"
              options={ACTION_OPTIONS}
              getOptionLabel={(opt) => getActionMeta(opt).label}
              value={actionFilter ?? null}
              onChange={(_, newValue) => {
                setActionFilter(newValue || undefined);
                setPage(1);
              }}
              slotProps={{ paper: { sx: dropdownPaperSx } }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Action"
                  size="small"
                  sx={filterFieldSx}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <FilterAltOutlinedIcon sx={{ fontSize: 17, color: "#98A2B3" }} />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </FormControl>

          <FormControl size="small" sx={{ width: 210 }}>
            <Autocomplete
              size="small"
              options={STORE_OPTIONS}
              getOptionLabel={(opt) => getStoreLabel(opt)}
              value={storeFilter ?? null}
              onChange={(_, newValue) => {
                setStoreFilter((newValue as ShopifyStore) || undefined);
                setPage(1);
              }}
              slotProps={{ paper: { sx: dropdownPaperSx } }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Store"
                  size="small"
                  sx={filterFieldSx}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <StorefrontOutlinedIcon sx={{ fontSize: 17, color: "#98A2B3" }} />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </FormControl>

          <FormControl size="small" sx={{ width: 230 }}>
            <Autocomplete
              size="small"
              options={VENDOR_OPTIONS}
              getOptionLabel={(code) => getVendorLabel(code)}
              value={vendorFilter ?? null}
              onChange={(_, newValue) => {
                setVendorFilter(newValue || undefined);
                setPage(1);
              }}
              slotProps={{ paper: { sx: dropdownPaperSx } }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Vendor / Product Line"
                  size="small"
                  sx={filterFieldSx}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocalOfferOutlinedIcon sx={{ fontSize: 17, color: "#98A2B3" }} />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </FormControl>

          <Box>
            <TextField
              size="small"
              onClick={handleDateOpen}
              value={startDate && endDate ? `${startDate.format("MMM D")} – ${endDate.format("MMM D")}` : ""}
              placeholder="Date Range"
              error={!!dateError}
              sx={{ ...filterFieldSx, width: 200, "& .MuiInputBase-input": { ...filterFieldSx["& .MuiInputBase-input"], cursor: "pointer" } }}
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarMonthIcon sx={{ fontSize: 17, color: "#98A2B3" }} />
                  </InputAdornment>
                ),
                endAdornment: (startDate || endDate) ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleDateClear}>
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
            />
            <Popover
              open={Boolean(dateAnchorEl)}
              anchorEl={dateAnchorEl}
              onClose={handleDateClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              slotProps={{
                paper: {
                  sx: {
                    p: 2,
                    mt: 0.5,
                    borderRadius: "14px",
                    border: "1px solid #F0EFEA",
                    boxShadow: "0 8px 24px rgba(16,24,40,0.12)",
                  },
                },
              }}
            >
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box display="flex" gap={2}>
                  <Box>
                    <Typography variant="caption" fontWeight={600} sx={{ display: "block", mb: 1 }}>
                      Start Date
                    </Typography>
                    <DateCalendar value={startDate} onChange={(val) => handleDateChange(val, endDate)} />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={600} sx={{ display: "block", mb: 1 }}>
                      End Date
                    </Typography>
                    <DateCalendar value={endDate} onChange={(val) => handleDateChange(startDate, val)} />
                  </Box>
                </Box>
              </LocalizationProvider>
              {dateError && (
                <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
                  {dateError}
                </Typography>
              )}
            </Popover>
          </Box>

          {activeFilters.length > 0 && (
            <Button
              onClick={clearAllFilters}
              startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
              sx={{
                ml: "auto",
                textTransform: "none",
                fontSize: 12.5,
                fontWeight: 600,
                color: "#4658AC",
                bgcolor: "#F4F6FB",
                borderRadius: "999px",
                px: 1.75,
                "&:hover": { bgcolor: "#E9ECF8" },
              }}
            >
              Clear all
            </Button>
          )}

          <TextField
            select
            size="small"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            sx={{ ...filterFieldSx, width: 160, ml: activeFilters.length > 0 ? 0 : "auto" }}
            SelectProps={{
              renderValue: (val) => `Page Size: ${val}`,
              MenuProps: { PaperProps: { sx: dropdownPaperSx } },
            }}
          >
            {[20, 50, 100].map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {activeFilters.length > 0 && (
          <Box display="flex" flexWrap="wrap" gap={1}>
            {activeFilters.map((f) => (
              <Chip
                key={f.key}
                label={f.label}
                size="small"
                onDelete={f.onClear}
                sx={{
                  bgcolor: "#F4F6FB",
                  color: "#4658AC",
                  fontWeight: 600,
                  fontSize: 12,
                  borderRadius: "999px",
                  "& .MuiChip-deleteIcon": { color: "#8B93C4", "&:hover": { color: "#4658AC" } },
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      {!isLoading && !isFetching && (
        <Typography sx={{ fontSize: 12.5, color: "#98A2B3", mb: 1.5, ml: 0.5 }}>
          {data?.data?.total ?? 0} result{(data?.data?.total ?? 0) === 1 ? "" : "s"}
        </Typography>
      )}

      {isLoading || isFetching ? (
        <Box sx={{ bgcolor: "#fff", border: "1px solid #EFEEE9", borderRadius: "16px", p: 3 }}>
          {Array.from({ length: 2 }).map((_, gi) => (
            <Box key={gi} sx={{ mb: gi === 1 ? 0 : 4 }}>
              <Skeleton variant="text" width={90} height={22} sx={{ mb: 2 }} />
              {Array.from({ length: 2 }).map((_, i) => (
                <Box key={i} sx={{ display: "flex", gap: 2, mb: 3 }}>
                  <Skeleton variant="circular" width={12} height={12} sx={{ mt: 1 }} />
                  <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Skeleton variant="circular" width={30} height={30} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="35%" height={20} />
                      <Skeleton variant="text" width="20%" height={16} />
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      ) : rows.length === 0 ? (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            bgcolor: "#fff",
            border: "1px solid #EFEEE9",
            borderRadius: "16px",
          }}
        >
          <InboxOutlinedIcon sx={{ fontSize: 40, color: "#D0D5DD" }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#667085", mt: 1 }}>
            No order history found
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "#98A2B3", mt: 0.5 }}>
            Try adjusting or clearing your filters
          </Typography>
        </Box>
      ) : (
        <Box sx={{ bgcolor: "#fff", border: "1px solid #EFEEE9", borderRadius: "16px", overflow: "hidden" }}>
          <Box sx={{ p: 3 }}>
            {groupedRows.map((group, gi) => (
              <Box key={group.label} sx={{ mb: gi === groupedRows.length - 1 ? 0 : 4 }}>
                <Typography
                  sx={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "#98A2B3",
                    mb: 2,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {group.label}
                </Typography>

                {group.items.map((row, i) => {
                  const meta = getActionMeta(row.action);
                  const Icon = meta.icon;
                  const orderRef = row.shopify_order_name || row.shopify_order_id;
                  const isLast = i === group.items.length - 1;

                  const handleCopyOrder = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (!orderRef) return;
                    navigator.clipboard.writeText(orderRef).then(() => {
                      toast.success("Order ID copied!");
                    });
                  };

                  const handleFilterByUser = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    const email = row.user_email || row.user_id;
                    setUserEmailInput(email);
                    setUserEmailFilter(email);
                    setPage(1);
                  };

                  const handleFilterByAction = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    setActionFilter(row.action);
                    setPage(1);
                  };

                  const handleFilterByStore = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    setStoreFilter(row.store as ShopifyStore);
                    setPage(1);
                  };

                  return (
                    <Box key={row.id} sx={{ display: "flex", gap: 2 }}>
                      {/* Timeline gutter: dot + connecting line down to the next entry */}
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: 12 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            mt: "10px",
                            borderRadius: "50%",
                            bgcolor: meta.color,
                            flexShrink: 0,
                            boxShadow: `0 0 0 3px ${meta.bg}`,
                          }}
                        />
                        {!isLast && (
                          <Box sx={{ flex: 1, width: "2px", bgcolor: "#EAECF0", my: 0.5 }} />
                        )}
                      </Box>

                      {/* Entry content */}
                      <Box
                        onClick={() => openDetail(row)}
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          pb: isLast ? 1 : 3,
                          px: 1.5,
                          py: 1,
                          borderRadius: "10px",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                          "&:hover": {
                            bgcolor: "#FAFAFA",
                            "& .oh-chevron": { opacity: 1, transform: "translateX(2px)" },
                            "& .oh-copy": { opacity: 1 },
                          },
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                            <Avatar sx={{ bgcolor: meta.bg, color: meta.color, width: 32, height: 32, flexShrink: 0 }}>
                              <Icon sx={{ fontSize: 17 }} />
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Tooltip title="Copy order reference">
                                <Box
                                  onClick={handleCopyOrder}
                                  sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    maxWidth: "100%",
                                    "&:hover .oh-order-ref": { textDecoration: "underline" },
                                  }}
                                >
                                  <Typography sx={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A" }} noWrap>
                                    <Box component="span" className="oh-order-ref">
                                      {orderRef || "N/A"}
                                    </Box>
                                  </Typography>
                                  {orderRef && (
                                    <ContentCopyIcon
                                      className="oh-copy"
                                      sx={{ fontSize: 13, color: "#98A2B3", opacity: 0, transition: "opacity 0.15s ease" }}
                                    />
                                  )}
                                </Box>
                              </Tooltip>

                              <Tooltip title="Filter by this user">
                                <Box
                                  onClick={handleFilterByUser}
                                  sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.25,
                                    color: "#6B7280",
                                    "&:hover": { color: "#4658AC", textDecoration: "underline" },
                                  }}
                                >
                                  <PersonOutlineIcon sx={{ fontSize: 12.5 }} />
                                  <Typography sx={{ fontSize: 12.5 }} noWrap>
                                    {row.user_email || row.user_id}
                                  </Typography>
                                </Box>
                              </Tooltip>

                              <Tooltip title="Filter by this store">
                                <Box
                                  onClick={handleFilterByStore}
                                  sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.25,
                                    color: "#98A2B3",
                                    "&:hover": { color: "#4658AC", textDecoration: "underline" },
                                  }}
                                >
                                  <StorefrontOutlinedIcon sx={{ fontSize: 12.5 }} />
                                  <Typography sx={{ fontSize: 12.5 }} noWrap>
                                    {getStoreLabel(row.store)}
                                    {row.request_payload?.vendor ? ` · ${getVendorLabel(row.request_payload.vendor)}` : ""}
                                  </Typography>
                                </Box>
                              </Tooltip>

                              {row.reason && (
                                <Typography sx={{ fontSize: 12, color: "#98A2B3", mt: 0.25 }} noWrap>
                                  Reason: {row.reason}
                                  {row.request_payload?.staffNote ? ` — "${row.request_payload.staffNote}"` : ""}
                                </Typography>
                              )}
                            </Box>
                          </Box>

                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                            <Tooltip title={row.created_at ? dayjs(row.created_at).format("MMM D, YYYY h:mm A") : ""}>
                              <Typography sx={{ fontSize: 12, color: "#98A2B3" }}>
                                {row.created_at ? formatRelativeTime(row.created_at) : ""}
                              </Typography>
                            </Tooltip>

                            <Tooltip title="Filter by this action">
                              <Box
                                onClick={handleFilterByAction}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.75,
                                  px: 1.25,
                                  py: 0.4,
                                  borderRadius: "999px",
                                  bgcolor: meta.bg,
                                  whiteSpace: "nowrap",
                                  cursor: "pointer",
                                  transition: "filter 0.15s ease",
                                  "&:hover": { filter: "brightness(0.96)" },
                                }}
                              >
                                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: meta.color }} />
                                <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: meta.color }}>
                                  {meta.label}
                                </Typography>
                              </Box>
                            </Tooltip>

                            <ChevronRightIcon
                              className="oh-chevron"
                              sx={{ fontSize: 18, color: "#C0C4CC", opacity: 0, transition: "opacity 0.15s ease, transform 0.15s ease" }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>

          <PaginationBar
            currentPage={page}
            totalPages={totalPages}
            totalItems={data?.data?.total}
            pageSize={pageSize}
            onPageChange={(newPage: number) => setPage(newPage)}
          />
        </Box>
      )}

      <Drawer
        anchor="right"
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: 440 },
              bgcolor: "#fff",
            },
          },
        }}
      >
        {selectedRow && (() => {
          const meta = getActionMeta(selectedRow.action);
          const Icon = meta.icon;
          const orderRef = selectedRow.shopify_order_name || selectedRow.shopify_order_id;
          return (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Header */}
              <Box sx={{ bgcolor: meta.bg, px: 3, pt: 3.5, pb: 2.5, position: "relative" }}>
                <IconButton
                  onClick={() => setSelectedRow(null)}
                  size="small"
                  sx={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    bgcolor: "rgba(255,255,255,0.7)",
                    "&:hover": { bgcolor: "#fff" },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>

                <Avatar
                  sx={{
                    bgcolor: "#fff",
                    color: meta.color,
                    width: 48,
                    height: 48,
                    mb: 1.5,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                >
                  <Icon />
                </Avatar>

                <Typography sx={{ fontSize: 19, fontWeight: 700, color: "#1A1A1A", wordBreak: "break-word" }}>
                  {orderRef || "N/A"}
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, flexWrap: "wrap" }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      bgcolor: "rgba(255,255,255,0.75)",
                      borderRadius: "999px",
                      px: 1.25,
                      py: 0.4,
                    }}
                  >
                    <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: meta.color }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: meta.color }}>
                      {meta.label}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
                    {dayjs(selectedRow.created_at).format("MMM D, YYYY · h:mm A")}
                  </Typography>
                </Box>
              </Box>

              <Divider />

              {/* Body */}
              <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2.5, display: "flex", flexDirection: "column", gap: 2.5 }}>
                <DetailRow
                  icon={<PersonOutlineIcon sx={{ fontSize: 17 }} />}
                  label="Performed By"
                  value={selectedRow.user_email || selectedRow.user_id}
                  copyable
                />
                <DetailRow
                  icon={<FingerprintOutlinedIcon sx={{ fontSize: 17 }} />}
                  label="Shopify Order ID"
                  value={selectedRow.shopify_order_id || "N/A"}
                  copyable
                />
                <DetailRow
                  icon={<StorefrontOutlinedIcon sx={{ fontSize: 17 }} />}
                  label="Store"
                  value={getStoreLabel(selectedRow.store)}
                />
                {selectedRow.request_payload?.vendor && (
                  <DetailRow
                    icon={<LocalOfferOutlinedIcon sx={{ fontSize: 17 }} />}
                    label="Vendor / Product Line"
                    value={getVendorLabel(selectedRow.request_payload.vendor)}
                  />
                )}
                {selectedRow.reason && (
                  <DetailRow
                    icon={<InfoOutlinedIcon sx={{ fontSize: 17 }} />}
                    label="Reason"
                    value={selectedRow.reason}
                  />
                )}
                {selectedRow.request_payload?.staffNote && (
                  <DetailRow
                    icon={<NotesOutlinedIcon sx={{ fontSize: 17 }} />}
                    label="Staff Message"
                    value={selectedRow.request_payload.staffNote}
                  />
                )}
                {selectedRow.request_payload?.email && (
                  <DetailRow
                    icon={<MailOutlineIcon sx={{ fontSize: 17 }} />}
                    label="Customer Email"
                    value={selectedRow.request_payload.email}
                    copyable
                  />
                )}

                {Array.isArray(selectedRow.request_payload?.tags) && selectedRow.request_payload.tags.length > 0 && (
                  <Box>
                    <SectionLabel>Tags</SectionLabel>
                    <Box display="flex" flexWrap="wrap" gap={0.75}>
                      {selectedRow.request_payload.tags.map((tag: string) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{ bgcolor: "#F4F6FB", color: "#4658AC", fontSize: 11.5, fontWeight: 600, borderRadius: "999px" }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                <LineItemsTable items={extractLineItems(selectedRow.request_payload)} />

                <OutcomeSummary action={selectedRow.action} resultPayload={selectedRow.result_payload} />

                <Divider />

                <Box>
                  <Box
                    onClick={() => setShowRawPayload((v) => !v)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      cursor: "pointer",
                      color: "#98A2B3",
                      "&:hover": { color: "#6B7280" },
                    }}
                  >
                    <ExpandMoreIcon
                      sx={{
                        fontSize: 18,
                        transition: "transform 0.15s ease",
                        transform: showRawPayload ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                      {showRawPayload ? "Hide technical details" : "Show technical details"}
                    </Typography>
                  </Box>
                  <Collapse in={showRawPayload}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
                      <PayloadBlock title="Request Payload" data={selectedRow.request_payload} />
                      <PayloadBlock title="Result Payload" data={selectedRow.result_payload} />
                    </Box>
                  </Collapse>
                </Box>
              </Box>
            </Box>
          );
        })()}
      </Drawer>
    </Box>
  );
};

export default OrderHistory;
