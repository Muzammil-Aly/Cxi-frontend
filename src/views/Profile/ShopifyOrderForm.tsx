// src/components/ShopifyOrderForm.tsx
import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  useCreateOrderMutation,
  useCreateDraftOrderMutation,
  useCreateProductMutation,
  useUpdateOrderMutation,
  useUpdateDraftOrderMutation,
  useEditOrderMutation,
  useGetOrderLineItemsQuery,
  useGetDraftOrderLineItemsQuery,
  useGetProductsQuery,
  useGetShopifyOrdersQuery,
  useGetShopifyDraftOrdersQuery,
  useGetShopifyReturnReasonsQuery,
  useGetShopifyReturnReasonsCodeQuery,
  useGetOrderEditEligibilityQuery,
  useGetOrderCancelEligibilityQuery,
  useCancelOrderMutation,
  type ProductVariant,
  type ShopifyProduct,
  type ShopifyStore,
} from "../../redux/services/shopifyApi";
import { useGetShopifyLineItemsQuery } from "../../redux/services/shopifyApi";
import {
  useGetDistinctTouchupItemsQuery,
  useGetTouchupsQuery,
  useGetTouchupPensQuery,
  useGetDistinctTouchupPensQuery,
  useGetDistinctAllItemsQuery,
} from "../../redux/services/InventoryApi";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantOption {
  label: string;
  variantId: string;
  product: ShopifyProduct;
  variant: ProductVariant;
}

interface Address {
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

interface LineItem {
  variantId: string;
  quantity: number;
  item_no?: string;
  lot_no?: string | null;
  unit_price?: number | null;
  description?: string | null;
  return_reason_code?: string;
  reason_code?: string;
  parts?: Array<{
    parts_item_no: string;
    parts_qty: number;
    parts_unit_price: number | null;
    variantId?: string;
    productId?: string;
    reason_code?: string;
    touchup_color?: string;
  }>;
  isCustomProduct?: boolean;
  customTitle?: string;
  customPrice?: string;
  customSku?: string;
  customProductType?: string;
  customVendor?: string;
  isExistingOrderLine?: boolean;
}

interface OrderFormState {
  email: string;
  lineItems: LineItem[];
  shippingAddress: Address;
  // billingAddress: Address;
}

interface CustomAttribute {
  key: string;
  value: string;
}

type FormMode =
  | "create"
  | "editOrder"
  | "cancelOrder"
  | "editDraft"
  | "createProduct";
type EditSubTab = "details" | "lineItems";
type DraftSubTab = "details" | "lineItems";
type OpType = "addVariant" | "setQuantity" | "addDiscount" | "addCustomItem";

interface DraftVariantLineItem {
  key: string;
  variantId: string;
  title: string;
  quantity: number;
  pendingRemove: boolean;
}

interface DraftNewLineItem {
  key: string;
  variantId: string;
  title: string;
  quantity: number;
}

interface DraftNewCustomItem {
  key: string;
  title: string;
  lot_no: string;
  price: string;
  quantity: number;
  reasonCode: string;
  returnReasonCode: string;
  parts: PartRow[];
  isExistingOrderLine?: boolean;
}

interface EditOperation {
  id: string;
  type: OpType;
  variantId: string;
  lineItemId: string;
  quantity: number;
  allowDuplicates: boolean;
  restock: boolean;
  discountType: "percent" | "fixed";
  discountValue: string;
  discountCurrencyCode: string;
  discountDescription: string;
  // addCustomItem
  customTitle: string;
  customSku: string;
  customPrice: string;
  customCurrencyCode: string;
  reasonCode: string;
  returnReasonCode: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const defaultAddress: Address = {
  firstName: "",
  lastName: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  provinceCode: "",
  countryCode: "",
  zip: "",
  phone: "",
};

const STORE_OPTIONS: {
  value: ShopifyStore;
  label: string;
  tag: string;
  handle: string;
}[] = [
  // { value: "store1", label: "Testing", tag: "Testing", handle: "testoneabc" },
  {
    value: "store1",
    label: "CP02-replacement/warranty_parts",
    tag: "CP02-replacement/warranty_parts",
    handle: "CP02-replacement/warranty_parts",
  },
  {
    value: "store1",
    label: "CP03-consumer_parts_sales",
    tag: "CP03-consumer_parts_sales",
    handle: "CP03-consumer_parts_sales",
  },
  {
    value: "store1",
    label: "CP05-replacement/warranty_parts_consumer_wow",
    tag: "CP05-replacement/warranty_parts_consumer_wow",
    handle: "CP05-replacement/warranty_parts_consumer_wow",
  },
  {
    value: "store1",
    label: "CP10-cs_care",
    tag: "CP10-cs_care",
    handle: "CP10-cs_care",
  },
  {
    value: "store2",
    label: "CP55-babyletto",
    tag: "CP55-babyletto",
    handle: "mdbco-test",
  },
  {
    value: "store3",
    label: "CP66-namesake",
    tag: "CP66-namesake",
    handle: "xxx",
  },
  {
    value: "store4",
    label: "CP77-davincibaby",
    tag: "CP77-davincibaby",
    handle: "",
  },
  {
    value: "store5",
    label: "CP99-nurseryworks",
    tag: "CP99-nurseryworks",
    handle: "",
  },
];

// Cancellation module uses its own 5 Shopify stores, independent of STORE_OPTIONS above.
const CANCEL_STORE_OPTIONS: {
  value: ShopifyStore;
  label: string;
  tag: string;
  handle: string;
}[] = [
  {
    value: "store1",
    label: "Million Dollar Baby Co",
    tag: "Million Dollar Baby Co",
    handle: "",
  },
  {
    value: "store2",
    label: "Babyletto",
    tag: "Babyletto",
    handle: "",
  },
  {
    value: "store3",
    label: "Namesake",
    tag: "Namesake",
    handle: "",
  },
  {
    value: "store4",
    label: "DaVinci",
    tag: "DaVinci",
    handle: "",
  },
  {
    value: "store5",
    label: "Nursery Works",
    tag: "Nursery Works",
    handle: "",
  },
];

// Nested cancellation-reason picklist for the Internal Staff Note (per Diana Lee's list).
// Selecting a category + reason auto-fills the note text; "Other" clears it for free typing.
const CANCELLATION_CATEGORY_OTHER = "Other";
const CANCELLATION_NOTE_OPTIONS: Record<string, string[]> = {
  "Customer-Initiated": [
    "Changed their mind / no longer wants the item",
    "Found a better price elsewhere",
    "Ordered by mistake (wrong item, size, color, quantity)",
    "Duplicate order placed accidentally",
    "Shipping time too long / needed sooner than ETA",
    "Financial reasons (can no longer afford, budget change)",
    "Gift no longer needed (recipient already received one, event cancelled)",
    "Address error and unable to correct in time",
  ],
  "Company/Operations-Initiated": [
    "Item out of stock / inventory discrepancy after order placed",
    "Item discontinued or no longer available",
    "Pricing error on the website",
    "Fraud/risk flag on the order or payment",
    "Address undeliverable or invalid (can't ship to location)",
    "Backorder delay exceeding acceptable window",
  ],
  "System/Process-Related": [
    "Duplicate order created by system/website glitch",
    "Promo code or pricing conflict couldn't be honored",
    "Manual cancellation due to unresolved customer service issue (e.g., customer requested change that required a cancel/reorder)",
  ],
  "External Factors": [
    "Carrier/logistics disruption causing customer to cancel preemptively (Stuck Label create)",
    "Weather or regional delivery restrictions",
  ],
};

interface StoreOption {
  value: ShopifyStore;
  label: string;
  tag: string;
  handle: string;
}

// ─── StoreDropdown ────────────────────────────────────────────────────────────

interface StoreDropdownProps {
  selectedLabel: string;
  onChange: (opt: StoreOption) => void;
  options: StoreOption[];
}

const StoreDropdown: React.FC<StoreDropdownProps> = ({
  selectedLabel,
  onChange,
  options,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.label === selectedLabel);

  return (
    <div ref={ref} style={{ position: "relative", userSelect: "none" }}>
      <div
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderWidth: "1.5px",
          borderStyle: "solid",
          borderColor: open ? "#6366f1" : "#e5e7eb",
          borderRadius: "8px",
          fontSize: "14px",
          cursor: "pointer",
          background: "#fff",
          color: "#111827",
          transition: "border-color 0.15s",
        }}
      >
        <span style={{ color: selected ? "#111827" : "#9ca3af" }}>
          {selected?.label ?? "— select Store —"}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #e5e7eb",
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            zIndex: 999,
            overflow: "hidden",
            padding: "6px",
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.label === selectedLabel;
            return (
              <div
                key={opt.label}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer",
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? "#16a34a" : "#6b7280",
                  background: isSelected ? "#f0fdf4" : "transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLDivElement).style.background =
                      "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    isSelected ? "#f0fdf4" : "transparent";
                }}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── CustomDropdown ───────────────────────────────────────────────────────────

interface CustomDropdownOption {
  value: string;
  label: string;
  lot_no?: string | null;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomDropdownOption[];
  placeholder?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative", userSelect: "none" }}>
      <div
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderWidth: "1.5px",
          borderStyle: "solid",
          borderColor: open ? "#6366f1" : "#e5e7eb",
          borderRadius: "8px",
          fontSize: "14px",
          cursor: "pointer",
          background: "#fff",
          color: selected ? "#111827" : "#9ca3af",
          transition: "border-color 0.15s",
        }}
      >
        <span>{selected?.label ?? placeholder ?? "— select —"}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #e5e7eb",
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            zIndex: 999,
            overflow: "hidden",
            padding: "6px",
          }}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={`${opt.value}-${opt.lot_no ?? ""}-${i}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer",
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? "#16a34a" : "#6b7280",
                  background: isSelected ? "#f0fdf4" : "transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLDivElement).style.background =
                      "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    isSelected ? "#f0fdf4" : "transparent";
                }}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── PortalDropdown ───────────────────────────────────────────────────────────
// Same look as CustomDropdown, but the open list is rendered into document.body
// via a portal and positioned with `fixed` coordinates measured from the trigger.
// This keeps it from being clipped by an ancestor's overflow:hidden/auto (e.g. a
// MUI Dialog), and it flips above the trigger when there isn't room below.

interface PortalDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomDropdownOption[];
  placeholder?: string;
  disabled?: boolean;
}

const PortalDropdown: React.FC<PortalDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = Math.min(options.length * 40 + 12, 260);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward =
      spaceBelow < estimatedHeight && rect.top > estimatedHeight;
    setPos({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      openUpward,
    });
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const handleClickAway = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleReposition = (e: Event) => {
      // Scrolling inside the popup's own option list shouldn't close it —
      // only close on scrolling of the page/modal behind it.
      if (
        popupRef.current &&
        e.target instanceof Node &&
        popupRef.current.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickAway);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handleClickAway);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      <div
        ref={triggerRef}
        onClick={() => !disabled && setOpen((p) => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderWidth: "1.5px",
          borderStyle: "solid",
          borderColor: open ? "#6366f1" : "#e5e7eb",
          borderRadius: "8px",
          fontSize: "14px",
          cursor: disabled ? "not-allowed" : "pointer",
          background: disabled ? "#f9fafb" : "#fff",
          color: selected ? "#111827" : "#9ca3af",
          opacity: disabled ? 0.6 : 1,
          transition: "border-color 0.15s",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selected?.label ?? placeholder ?? "— select —"}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            marginLeft: "8px",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open &&
        pos &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              top: pos.openUpward ? undefined : pos.top,
              bottom: pos.openUpward
                ? window.innerHeight - pos.top
                : undefined,
              left: pos.left,
              width: pos.width,
              background: "#fff",
              border: "1.5px solid #e5e7eb",
              borderRadius: "12px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              zIndex: 2000,
              overflowY: "auto",
              maxHeight: "260px",
              padding: "6px",
            }}
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={`${opt.value}-${i}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    cursor: "pointer",
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? "#16a34a" : "#6b7280",
                    background: isSelected ? "#f0fdf4" : "transparent",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      (e.currentTarget as HTMLDivElement).style.background =
                        "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      isSelected ? "#f0fdf4" : "transparent";
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
};

// ─── SearchableDropdown ───────────────────────────────────────────────────────

interface SearchableDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomDropdownOption[];
  placeholder?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const filtered = search
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(search.toLowerCase()) ||
          o.value.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  return (
    <div ref={ref} style={{ position: "relative", userSelect: "none" }}>
      <div
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderWidth: "1.5px",
          borderStyle: "solid",
          borderColor: open ? "#6366f1" : "#e5e7eb",
          borderRadius: "8px",
          fontSize: "14px",
          cursor: "pointer",
          background: "#fff",
          color: selected ? "#111827" : "#9ca3af",
          transition: "border-color 0.15s",
        }}
      >
        <span>{selected?.label ?? placeholder ?? "— select —"}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #e5e7eb",
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            zIndex: 999,
            padding: "6px",
          }}
        >
          <div style={{ padding: "4px 6px 6px" }}>
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                padding: "7px 10px",
                border: "1.5px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
                color: "#111827",
              }}
            />
          </div>
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "#9ca3af",
                }}
              >
                No results
              </div>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={`${opt.value}-${opt.lot_no ?? ""}-${i}`}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? "#16a34a" : "#6b7280",
                      background: isSelected ? "#f0fdf4" : "transparent",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLDivElement).style.background =
                          "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background =
                        isSelected ? "#f0fdf4" : "transparent";
                    }}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── LineItemSearchFields ─────────────────────────────────────────────────────

interface LineItemSearchFieldsProps {
  onPopulate: (data: {
    item_no: string;
    lot_no: string;
    unit_price: number | null;
  }) => void;
}

const LineItemSearchFields: React.FC<LineItemSearchFieldsProps> = ({
  onPopulate,
}) => {
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [debouncedItemSearch, setDebouncedItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  const [lotSearchTerm, setLotSearchTerm] = useState("");
  const [debouncedLotSearch, setDebouncedLotSearch] = useState("");

  const [showLotDropdown, setShowLotDropdown] = useState(false);

  const [pendingItemNo, setPendingItemNo] = useState<string | null>(null);
  const [pendingLotNo, setPendingLotNo] = useState<string | null>(null);
  const [pendingPrice, setPendingPrice] = useState<number | null>(null);

  const [lotForItemSearch, setLotForItemSearch] = useState("");
  const [debouncedLotForItemSearch, setDebouncedLotForItemSearch] =
    useState("");

  const itemRef = useRef<HTMLDivElement>(null);
  const lotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedItemSearch(itemSearchTerm.trim()),
      400,
    );
    return () => clearTimeout(t);
  }, [itemSearchTerm]);

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedLotSearch(lotSearchTerm.trim()),
      400,
    );
    return () => clearTimeout(t);
  }, [lotSearchTerm]);

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedLotForItemSearch(lotForItemSearch.trim()),
      400,
    );
    return () => clearTimeout(t);
  }, [lotForItemSearch]);

  useEffect(() => {
    if (!pendingItemNo) {
      setLotForItemSearch("");
      setDebouncedLotForItemSearch("");
    }
  }, [pendingItemNo]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node))
        setShowItemDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (lotRef.current && !lotRef.current.contains(e.target as Node))
        setShowLotDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Search items by sku
  const { data: itemSearchData, isFetching: isItemSearching } =
    useGetTouchupsQuery(
      { sku: debouncedItemSearch, isFromProps: false, page_size: 50 },
      { skip: debouncedItemSearch.length < 2 || !!pendingItemNo },
    );

  const isItemTyping =
    itemSearchTerm.trim().length >= 2 &&
    itemSearchTerm.trim() !== debouncedItemSearch;
  const showItemLoader = isItemTyping || isItemSearching;

  // Search lots by lot_no
  const { data: lotSearchData, isFetching: isLotSearching } =
    useGetTouchupsQuery(
      { lot_no: debouncedLotSearch, isFromProps: false, page_size: 50 },
      { skip: debouncedLotSearch.length < 2 || !!pendingLotNo },
    );

  const isLotTyping =
    lotSearchTerm.trim().length >= 2 &&
    lotSearchTerm.trim() !== debouncedLotSearch;
  const showLotLoader = isLotTyping || isLotSearching;

  // Get available lots for a selected item
  const { data: lotsForItemData, isFetching: isFetchingLotsForItem } =
    useGetTouchupsQuery(
      { sku: pendingItemNo!, isFromProps: false, page_size: 100 },
      {
        skip: !pendingItemNo || !!pendingLotNo,
        refetchOnMountOrArgChange: true,
      },
    );

  // Search lots scoped to the selected item
  const { data: lotSearchForItemData, isFetching: isSearchingLotsForItem } =
    useGetTouchupsQuery(
      {
        sku: pendingItemNo!,
        lot_no: debouncedLotForItemSearch,
        isFromProps: false,
        page_size: 50,
      },
      {
        skip:
          !pendingItemNo ||
          debouncedLotForItemSearch.length < 2 ||
          !!pendingLotNo,
        refetchOnMountOrArgChange: true,
      },
    );

  // Get available items for a selected lot
  const { data: itemsForLotData, isFetching: isFetchingItemsForLot } =
    useGetTouchupsQuery(
      { lot_no: pendingLotNo!, isFromProps: true, page_size: 100 },
      { skip: !pendingLotNo || !!pendingItemNo },
    );

  const dedupeBy = <T,>(arr: T[], key: (v: T) => string): T[] =>
    Array.from(new Map(arr.map((v) => [key(v), v] as [string, T])).values());

  const itemSearchResults = dedupeBy<{ item_no: string; price: number | null }>(
    (itemSearchData?.data ?? [])
      .filter((r: any) => r.sku)
      .map((r: any) => ({
        item_no: r.sku as string,
        price: r.unit_price != null ? Number(r.unit_price) : null,
      })),
    (r) => r.item_no,
  );

  const lotSearchResults = dedupeBy<{ lot_no: string }>(
    (lotSearchData?.data ?? [])
      .filter((r: any) => r.lot_no)
      .map((r: any) => ({ lot_no: r.lot_no as string })),
    (r) => r.lot_no,
  );

  const lotsForItem = dedupeBy<{ lot_no: string }>(
    (lotsForItemData?.data ?? [])
      .filter((r: any) => r.lot_no)
      .map((r: any) => ({ lot_no: r.lot_no as string })),
    (r) => r.lot_no,
  );

  const lotsForItemSearchResults = dedupeBy<{ lot_no: string }>(
    (lotSearchForItemData?.data ?? [])
      .filter((r: any) => r.lot_no)
      .map((r: any) => ({ lot_no: r.lot_no as string })),
    (r) => r.lot_no,
  );

  const itemsForLot = dedupeBy<{ item_no: string; price: number | null }>(
    (itemsForLotData?.data ?? [])
      .filter((r: any) => r.sku)
      .map((r: any) => ({
        item_no: r.sku as string,
        price: r.unit_price != null ? Number(r.unit_price) : null,
      })),
    (r) => r.item_no,
  );

  const absDropdown: React.CSSProperties = {
    position: "absolute",
    zIndex: 999,
    background: "#fff",
    border: "1.5px solid #e5e7eb",
    borderRadius: "8px",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
  };

  const listBox: React.CSSProperties = {
    border: "1.5px solid #e5e7eb",
    borderRadius: "8px",
    maxHeight: "120px",
    overflowY: "auto",
    background: "#fff",
  };

  const rowStyle: React.CSSProperties = {
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: "12px",
    color: "#111827",
    borderBottom: "1px solid #f3f4f6",
  };

  const loadingCell: React.CSSProperties = {
    padding: "8px 12px",
    border: "1.5px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#9ca3af",
    background: "#f9fafb",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };

  const emptyCell = (msg: string, warn = false): React.ReactNode => (
    <div
      style={{
        padding: "8px 12px",
        border: `1.5px solid ${warn ? "#f59e0b" : "#e5e7eb"}`,
        borderRadius: "8px",
        fontSize: "12px",
        color: warn ? "#b45309" : "#9ca3af",
        background: warn ? "#fffbeb" : "#f9fafb",
      }}
    >
      {msg}
    </div>
  );

  // ── Column 1: Item No ──────────────────────────────────────────────────────
  const renderItemCol = () => {
    const label = (
      <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}>
        Item No
      </span>
    );

    // Already selected
    if (pendingItemNo) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {label}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 12px",
              border: "1.5px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#111827",
              background: "#f9fafb",
              gap: "6px",
            }}
          >
            <span style={{ flex: 1 }}>{pendingItemNo}</span>
            <button
              type="button"
              onClick={() => {
                setPendingItemNo(null);
                setPendingPrice(null);
                setItemSearchTerm("");
                setDebouncedItemSearch("");
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9ca3af",
                fontSize: "14px",
                lineHeight: 1,
                padding: 0,
              }}
              title="Clear item"
            >
              ×
            </button>
          </div>
        </div>
      );
    }

    // Lot was picked first — show items for that lot
    if (pendingLotNo) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {label}
          {isFetchingItemsForLot ? (
            <div style={loadingCell}>
              <CircularProgress size={12} /> Loading…
            </div>
          ) : itemsForLot.length === 0 ? (
            emptyCell("No items available", true)
          ) : (
            <div style={listBox}>
              {itemsForLot.map((r) => (
                <div
                  key={r.item_no}
                  onClick={() =>
                    onPopulate({
                      item_no: r.item_no,
                      lot_no: pendingLotNo,
                      unit_price: r.price,
                    })
                  }
                  style={rowStyle}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background =
                      "#f5f3ff")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background =
                      "transparent")
                  }
                >
                  <strong>{r.item_no}</strong>
                  {r.price != null && (
                    <span style={{ marginLeft: "8px", color: "#6b7280" }}>
                      — ${r.price}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() =>
              onPopulate({
                item_no: "",
                lot_no: pendingLotNo,
                unit_price: null,
              })
            }
            style={{
              padding: "6px 10px",
              border: "1.5px dashed #d1d5db",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#6b7280",
              background: "transparent",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            Proceed without Item No
          </button>
        </div>
      );
    }

    // Default: search input
    return (
      <div
        ref={itemRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          position: "relative",
        }}
      >
        {label}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={itemSearchTerm}
            onChange={(e) => {
              setItemSearchTerm(e.target.value);
              setShowItemDropdown(true);
            }}
            onFocus={() => {
              if (debouncedItemSearch.length >= 2) setShowItemDropdown(true);
            }}
            placeholder="Type item no…"
            style={{ ...inputStyle, fontSize: "13px", padding: "8px 12px" }}
          />
          {showItemLoader && (
            <CircularProgress
              size={12}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
          )}
        </div>
        {showItemDropdown &&
          debouncedItemSearch.length >= 2 &&
          !showItemLoader &&
          itemSearchResults.length === 0 && (
            <div
              style={{
                ...absDropdown,
                padding: "10px 12px",
                fontSize: "12px",
                color: "#9ca3af",
              }}
            >
              No items found
            </div>
          )}
        {showItemDropdown && itemSearchResults.length > 0 && (
          <div
            style={{ ...absDropdown, maxHeight: "160px", overflowY: "auto" }}
          >
            {itemSearchResults.map((r) => (
              <div
                key={r.item_no}
                onClick={() => {
                  setPendingItemNo(r.item_no);
                  setPendingPrice(r.price);
                  setItemSearchTerm(r.item_no);
                  setShowItemDropdown(false);
                }}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#111827",
                  borderBottom: "1px solid #f3f4f6",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    "#f5f3ff")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    "transparent")
                }
              >
                <strong>{r.item_no}</strong>
                {r.price != null && (
                  <span style={{ marginLeft: "8px", color: "#6b7280" }}>
                    — ${r.price}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Column 2: Lot No ───────────────────────────────────────────────────────
  const renderLotCol = () => {
    const label = (
      <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}>
        Lot No
      </span>
    );

    // Already selected
    if (pendingLotNo) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {label}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 12px",
              border: "1.5px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#111827",
              background: "#f9fafb",
              gap: "6px",
            }}
          >
            <span style={{ flex: 1 }}>{pendingLotNo}</span>
            <button
              type="button"
              onClick={() => {
                setPendingLotNo(null);
                setLotSearchTerm("");
                setDebouncedLotSearch("");
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9ca3af",
                fontSize: "14px",
                lineHeight: 1,
                padding: 0,
              }}
              title="Clear lot"
            >
              ×
            </button>
          </div>
        </div>
      );
    }

    // Item was picked first — show lots for that item (optional, with search)
    if (pendingItemNo) {
      const isLotForItemTyping =
        lotForItemSearch.trim().length >= 2 &&
        lotForItemSearch.trim() !== debouncedLotForItemSearch;
      const showLotForItemLoader =
        isLotForItemTyping || isSearchingLotsForItem || isFetchingLotsForItem;
      const isSearching = debouncedLotForItemSearch.length >= 2;
      const displayedLots = isSearching
        ? lotsForItemSearchResults
        : lotsForItem;

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {label}

          {/* Lot search input — always visible */}
          <input
            type="text"
            value={lotForItemSearch}
            onChange={(e) => setLotForItemSearch(e.target.value)}
            placeholder="Search lot no…"
            style={{ ...inputStyle, fontSize: "13px", padding: "8px 12px" }}
          />

          {/* Loading indicator */}
          {showLotForItemLoader && (
            <div style={loadingCell}>
              <CircularProgress size={12} />
              {isSearching ? "Searching…" : "Loading…"}
            </div>
          )}

          {/* Lots list */}
          {!showLotForItemLoader && displayedLots.length > 0 && (
            <div style={listBox}>
              {displayedLots.map((r) => (
                <div
                  key={r.lot_no}
                  onClick={() =>
                    onPopulate({
                      item_no: pendingItemNo,
                      lot_no: r.lot_no,
                      unit_price: pendingPrice,
                    })
                  }
                  style={rowStyle}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background =
                      "#f0fdf4")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background =
                      "transparent")
                  }
                >
                  {r.lot_no}
                </div>
              ))}
            </div>
          )}

          {/* No results for search */}
          {isSearching &&
            !showLotForItemLoader &&
            lotsForItemSearchResults.length === 0 && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#9ca3af",
                  padding: "4px 2px",
                }}
              >
                No lots found
              </div>
            )}

          <button
            type="button"
            onClick={() =>
              onPopulate({
                item_no: pendingItemNo,
                lot_no: "",
                unit_price: pendingPrice,
              })
            }
            style={{
              padding: "6px 10px",
              border: "1.5px dashed #d1d5db",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#6b7280",
              background: "transparent",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            Proceed without Lot No
          </button>
        </div>
      );
    }

    // Default: search input
    return (
      <div
        ref={lotRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          position: "relative",
        }}
      >
        {label}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={lotSearchTerm}
            onChange={(e) => {
              setLotSearchTerm(e.target.value);
              setShowLotDropdown(true);
            }}
            onFocus={() => {
              if (debouncedLotSearch.length >= 2) setShowLotDropdown(true);
            }}
            placeholder="Type lot no…"
            style={{ ...inputStyle, fontSize: "13px", padding: "8px 12px" }}
          />
          {showLotLoader && (
            <CircularProgress
              size={12}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
          )}
        </div>
        {showLotDropdown &&
          debouncedLotSearch.length >= 2 &&
          !showLotLoader &&
          lotSearchResults.length === 0 && (
            <div
              style={{
                ...absDropdown,
                padding: "10px 12px",
                fontSize: "12px",
                color: "#9ca3af",
              }}
            >
              No lots found
            </div>
          )}
        {showLotDropdown && lotSearchResults.length > 0 && (
          <div
            style={{ ...absDropdown, maxHeight: "160px", overflowY: "auto" }}
          >
            {lotSearchResults.map((r) => (
              <div
                key={r.lot_no}
                onClick={() => {
                  setPendingLotNo(r.lot_no);
                  setLotSearchTerm(r.lot_no);
                  setShowLotDropdown(false);
                }}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#111827",
                  borderBottom: "1px solid #f3f4f6",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    "#f0fdf4")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    "transparent")
                }
              >
                {r.lot_no}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {renderItemCol()}
      {renderLotCol()}
    </>
  );
};

// ─── PartsSubSection ─────────────────────────────────────────────────────────

type PartRow = {
  parts_item_no: string;
  parts_qty: number;
  parts_unit_price: number | null;
  potential_qty_available?: number | null;
  earliest_avail_date?: string | null;
  variantId?: string;
  productId?: string;
  reason_code?: string;
  touchup_color?: string;
};

interface PartsSubSectionProps {
  item_no?: string;
  lot_no?: string | null;
  parts: PartRow[];
  onChange: (parts: PartRow[]) => void;
  unitPriceLocked?: boolean;
  reasonCodeOptions: { value: string; label: string }[];
}

const EMPTY_PART = (): PartRow => ({
  parts_item_no: "",
  parts_qty: 1,
  parts_unit_price: null,
});

const PartsSubSection: React.FC<PartsSubSectionProps> = ({
  item_no,
  lot_no,
  parts,
  onChange,
  unitPriceLocked,
  reasonCodeOptions,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [customAddEnabled, setCustomAddEnabled] = useState(false);
  const [customSkuTerm, setCustomSkuTerm] = useState("");
  const [debouncedSku, setDebouncedSku] = useState("");

  const [allItemsSearchEnabled, setAllItemsSearchEnabled] = useState(false);
  const [allItemsSearchTerm, setAllItemsSearchTerm] = useState("");
  const [debouncedAllItemsSearch, setDebouncedAllItemsSearch] = useState("");

  const [touchupPenSearchEnabled, setTouchupPenSearchEnabled] = useState(false);
  const [touchupPenSearchTerm, setTouchupPenSearchTerm] = useState("");
  const [debouncedTouchupPenSearch, setDebouncedTouchupPenSearch] =
    useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSku(customSkuTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [customSkuTerm]);

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedAllItemsSearch(allItemsSearchTerm.trim()),
      400,
    );
    return () => clearTimeout(t);
  }, [allItemsSearchTerm]);

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedTouchupPenSearch(touchupPenSearchTerm.trim()),
      400,
    );
    return () => clearTimeout(t);
  }, [touchupPenSearchTerm]);

  const { data: customSkuData, isFetching: isCustomFetching } =
    useGetDistinctTouchupItemsQuery(
      { parts_item_no: `like:${debouncedSku}`, page_size: 100 },
      { skip: !customAddEnabled || debouncedSku.length < 2 },
    );

  const { data: allItemsData, isFetching: isAllItemsFetching } =
    useGetDistinctAllItemsQuery(
      { item_no: `like:${debouncedAllItemsSearch}`, page_size: 100 },
      { skip: !allItemsSearchEnabled || debouncedAllItemsSearch.length < 2 },
    );

  const { data: touchupPenData, isFetching: isTouchupPenFetching } =
    useGetDistinctTouchupPensQuery(
      { search: debouncedTouchupPenSearch, page_size: 100 },
      {
        skip: !touchupPenSearchEnabled || debouncedTouchupPenSearch.length < 2,
      },
    );

  const isTouchupPenTyping =
    touchupPenSearchTerm.trim().length >= 2 &&
    touchupPenSearchTerm.trim() !== debouncedTouchupPenSearch;
  const showTouchupPenLoader = isTouchupPenTyping || isTouchupPenFetching;

  const touchupPenOptions: {
    value: string;
    label: string;
    key: string;
    unit_price: number | null;
    qty_available: number | null;
    earliest_avail_date: string | null;
  }[] = (touchupPenData?.results ?? []).map((p: any, i: number) => {
    const rawName: string = p.item_name || p.item_num;
    const dashIdx = rawName.indexOf(" - ");
    const base = dashIdx >= 0 ? rawName.slice(dashIdx + 3) : rawName;
    const qtyPart = p.qty_available != null ? ` | Qty: ${p.qty_available}` : "";
    const pricePart =
      p.unit_price != null ? ` | $${Number(p.unit_price).toFixed(2)}` : "";
    return {
      value: p.item_num,
      label: `${p.item_num} — ${base}${qtyPart}${pricePart}`,
      key: `${p.item_num}-${i}`,
      unit_price: p.unit_price,
      qty_available: p.qty_available,
      earliest_avail_date: p.earliest_avail_date ?? null,
    };
  });

  const handleTouchupPenSelect = (
    val: string,
    unit_price: number | null,
    qty_available: number | null,
    earliest_avail_date: string | null,
  ) => {
    onChange([
      ...parts,
      {
        parts_item_no: val,
        parts_qty: 1,
        parts_unit_price: unit_price,
        potential_qty_available: qty_available,
        earliest_avail_date,
      },
    ]);
    setTouchupPenSearchEnabled(false);
    setTouchupPenSearchTerm("");
    setDebouncedTouchupPenSearch("");
  };

  const isAllItemsTyping =
    allItemsSearchTerm.trim().length >= 2 &&
    allItemsSearchTerm.trim() !== debouncedAllItemsSearch;
  const showAllItemsLoader = isAllItemsTyping || isAllItemsFetching;

  const allItemsOptions: {
    value: string;
    label: string;
    price: number | null;
    potential_qty_available: number | null;
    earliest_avail_date: string | null;
  }[] = (allItemsData?.data ?? []).map((p: any) => ({
    value: p.item_no,
    label: p.item_no,
    price: p.unit_price != null ? Number(p.unit_price) : null,
    potential_qty_available:
      p.potential_qty_available != null
        ? Number(p.potential_qty_available)
        : null,
    earliest_avail_date: p.earliest_avail_date ?? null,
  }));

  const handleAllItemsSelect = (index: number) => {
    const found = allItemsData?.data?.[index];
    if (!found) return;
    const val = found.item_no as string;
    const price = found?.unit_price != null ? Number(found.unit_price) : null;
    const potential_qty_available =
      found?.potential_qty_available != null
        ? Number(found.potential_qty_available)
        : null;
    const earliest_avail_date = found?.earliest_avail_date ?? null;
    onChange([
      ...parts,
      {
        parts_item_no: val,
        parts_qty: 1,
        parts_unit_price: price,
        potential_qty_available,
        earliest_avail_date,
      },
    ]);
    setAllItemsSearchEnabled(false);
    setAllItemsSearchTerm("");
    setDebouncedAllItemsSearch("");
  };

  const isCustomTyping =
    customSkuTerm.trim().length >= 2 && customSkuTerm.trim() !== debouncedSku;
  const showCustomLoader = isCustomTyping || isCustomFetching;

  const customOptions: {
    value: string;
    label: string;
    price: number | null;
    lot_no: string | null;
    potential_qty_available: number | null;
    earliest_avail_date: string | null;
  }[] = (customSkuData?.data ?? []).map((p: any) => ({
    value: p.parts_item_no,
    label: p.parts_item_no,
    price: p.unit_price != null ? Number(p.unit_price) : null,
    lot_no: p.lot_no ?? null,
    potential_qty_available:
      p.potential_qty_available != null
        ? Number(p.potential_qty_available)
        : null,
    earliest_avail_date: p.earliest_avail_date ?? null,
  }));

  const handleCustomSelect = (index: number) => {
    const found = customSkuData?.data?.[index];
    if (!found) return;
    const val = found.parts_item_no as string;
    const price = found?.unit_price != null ? Number(found.unit_price) : null;
    const potential_qty_available =
      found?.potential_qty_available != null
        ? Number(found.potential_qty_available)
        : null;
    const earliest_avail_date = found?.earliest_avail_date ?? null;
    onChange([
      ...parts,
      {
        parts_item_no: val,
        parts_qty: 1,
        parts_unit_price: price,
        potential_qty_available,
        earliest_avail_date,
      },
    ]);
    setCustomAddEnabled(false);
    setCustomSkuTerm("");
    setDebouncedSku("");
  };

  const touchupQueryArgs = {
    isFromProps: true,
    page_size: 100,
    ...(item_no?.trim() ? { sku: item_no.trim() } : {}),
    ...(lot_no?.trim() ? { lot_no: lot_no.trim() } : {}),
  };

  const { data: touchupData, isFetching } = useGetTouchupsQuery(
    touchupQueryArgs,
    { skip: !expanded || (!item_no?.trim() && !lot_no?.trim()) },
  );

  const partPriceMap = new Map<string, number | null>(
    (touchupData?.data ?? []).map((p: any) => [
      p.parts_item_no,
      p.unit_price != null ? Number(p.unit_price) : null,
    ]),
  );

  const partQtyAvailableMap = new Map<string, number | null>(
    (touchupData?.data ?? []).map((p: any) => [
      p.parts_item_no,
      p.potential_qty_available != null
        ? Number(p.potential_qty_available)
        : null,
    ]),
  );

  const partEarliestAvailDateMap = new Map<string, string | null>(
    (touchupData?.data ?? []).map((p: any) => [
      p.parts_item_no,
      p.earliest_avail_date ?? null,
    ]),
  );

  const partsOptions: CustomDropdownOption[] = (touchupData?.data ?? []).map(
    (p: any) => ({
      value: p.parts_item_no,
      label: p.parts_item_name_2
        ? `${p.parts_item_no} — ${p.parts_item_name_2}`
        : p.parts_item_no,
      lot_no: p.lot_no ?? null,
    }),
  );

  const updateRow = (i: number, patch: Partial<PartRow>) =>
    onChange(parts.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const selectPartForRow = (i: number, val: string) => {
    const price = partPriceMap.has(val) ? partPriceMap.get(val)! : null;
    const potential_qty_available = partQtyAvailableMap.has(val)
      ? partQtyAvailableMap.get(val)!
      : null;
    const earliest_avail_date = partEarliestAvailDateMap.has(val)
      ? partEarliestAvailDateMap.get(val)!
      : null;
    updateRow(i, {
      parts_item_no: val,
      parts_unit_price: price,
      potential_qty_available,
      earliest_avail_date,
    });
  };

  const addRow = () => onChange([...parts, EMPTY_PART()]);
  const removeRow = (i: number) =>
    onChange(parts.filter((_, idx) => idx !== i));

  const fieldStyle: React.CSSProperties = {
    padding: "7px 10px",
    border: "1.5px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "13px",
    background: "#f9fafb",
    color: "#111827",
    width: "100%",
    boxSizing: "border-box",
  };

  if (unitPriceLocked) {
    return (
      <div
        style={{
          marginTop: "10px",
          borderTop: "1px dashed #e5e7eb",
          paddingTop: "10px",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#9ca3af" }}>
          Parts Line Items — disabled (Wash Whole Unit selected)
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: "10px",
        borderTop: "1px dashed #e5e7eb",
        paddingTop: "10px",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          fontSize: "12px",
          fontWeight: 600,
          color: "#6366f1",
          marginBottom: expanded ? "10px" : 0,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Parts Line Items{" "}
        {parts.length > 0 && (
          <span
            style={{
              marginLeft: "4px",
              fontSize: "11px",
              background: "#ede9fe",
              color: "#6366f1",
              borderRadius: "10px",
              padding: "1px 7px",
            }}
          >
            {parts.length}
          </span>
        )}
      </button>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {isFetching && (
            <div
              style={{ fontSize: "12px", color: "#9ca3af", padding: "4px 0" }}
            >
              Loading parts…
            </div>
          )}

          {parts.map((row, i) => {
            const lineAmount =
              row.parts_unit_price != null && row.parts_qty >= 1
                ? (Number(row.parts_unit_price) * row.parts_qty).toFixed(2)
                : null;
            return (
              <div
                key={i}
                style={{
                  background: "#f8f7ff",
                  border: "1px solid #ddd6fe",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {/* Row header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#7c3aed",
                    }}
                  >
                    Part {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#ef4444",
                      fontSize: "16px",
                      lineHeight: 1,
                      padding: "0 2px",
                    }}
                    title="Remove part"
                  >
                    ×
                  </button>
                </div>

                {/* Part Item No + QTY Available + Earliest Avail Date */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px 140px",
                    gap: "10px",
                    alignItems: "start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#6b7280",
                      }}
                    >
                      Part Item No
                    </span>
                    {!isFetching &&
                    partsOptions.length === 0 &&
                    !row.parts_item_no ? (
                      <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                        No parts found for this item.
                      </div>
                    ) : (
                      <SearchableDropdown
                        value={row.parts_item_no}
                        onChange={(val) => selectPartForRow(i, val)}
                        options={
                          row.parts_item_no &&
                          !partsOptions.find(
                            (o) => o.value === row.parts_item_no,
                          )
                            ? [
                                ...partsOptions,
                                {
                                  value: row.parts_item_no,
                                  label: row.parts_item_no,
                                },
                              ]
                            : partsOptions
                        }
                        placeholder="— select part —"
                      />
                    )}
                    {row.touchup_color && (
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: "4px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: "#ede9fe",
                          color: "#6d28d9",
                          fontSize: "11px",
                          fontWeight: 600,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {row.touchup_color}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#6b7280",
                      }}
                    >
                      QTY Available
                    </span>
                    <div
                      style={{
                        ...fieldStyle,
                        color:
                          (row.potential_qty_available ??
                            partQtyAvailableMap.get(row.parts_item_no)) != null
                            ? "#111827"
                            : "#9ca3af",
                        background: "#f3f4f6",
                        cursor: "not-allowed",
                      }}
                    >
                      {row.potential_qty_available ??
                        partQtyAvailableMap.get(row.parts_item_no) ??
                        "—"}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#6b7280",
                      }}
                    >
                      Earliest Avail Date
                    </span>
                    <div
                      style={{
                        ...fieldStyle,
                        color:
                          (row.earliest_avail_date ??
                          partEarliestAvailDateMap.get(row.parts_item_no))
                            ? "#111827"
                            : "#9ca3af",
                        background: "#f3f4f6",
                        cursor: "not-allowed",
                      }}
                    >
                      {(row.earliest_avail_date ??
                        partEarliestAvailDateMap.get(row.parts_item_no)) ||
                        "—"}
                    </div>
                  </div>
                </div>

                {/* Qty / Unit Price / Line Amount */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#6b7280",
                      }}
                    >
                      Qty
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={row.parts_qty}
                      onKeyDown={(e) => {
                        if (/^[0-9]$/.test(e.key))
                          (e.target as HTMLInputElement).select();
                      }}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (isNaN(v)) return;
                        updateRow(i, {
                          parts_qty: Math.min(5, Math.max(1, v)),
                        });
                      }}
                      style={fieldStyle}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#6b7280",
                      }}
                    >
                      Unit Price
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.parts_unit_price ?? ""}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        updateRow(i, { parts_unit_price: isNaN(v) ? null : v });
                      }}
                      placeholder="0.00"
                      style={fieldStyle}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#6b7280",
                      }}
                    >
                      Line Amount
                    </span>
                    <div
                      style={{
                        ...fieldStyle,
                        color: lineAmount != null ? "#047857" : "#9ca3af",
                        background: lineAmount != null ? "#f0fdf4" : "#f9fafb",
                        fontWeight: lineAmount != null ? 600 : 400,
                      }}
                    >
                      {lineAmount != null ? `$${lineAmount}` : "—"}
                    </div>
                  </div>
                </div>

                {/* Return Reason Code for Part */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#6b7280",
                    }}
                  >
                    Return Reason Code
                  </span>
                  <SearchableDropdown
                    value={row.reason_code ?? ""}
                    onChange={(val) =>
                      updateRow(i, { reason_code: val || undefined })
                    }
                    options={reasonCodeOptions}
                    placeholder="— select reason code —"
                  />
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addRow}
            style={{
              padding: "6px 14px",
              border: "1.5px dashed #c4b5fd",
              borderRadius: "8px",
              background: "#f5f3ff",
              color: "#6366f1",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
              alignSelf: "flex-start",
            }}
          >
            + Add Part
          </button>

          {/* Custom SKU search */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
                color: "#6366f1",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={customAddEnabled}
                onChange={(e) => {
                  setCustomAddEnabled(e.target.checked);
                  if (!e.target.checked) {
                    setCustomSkuTerm("");
                    setDebouncedSku("");
                  }
                }}
                style={{
                  accentColor: "#6366f1",
                  width: "14px",
                  height: "14px",
                }}
              />
              Search & add part by item no
            </label>

            {customAddEnabled && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={customSkuTerm}
                    onChange={(e) => setCustomSkuTerm(e.target.value)}
                    placeholder="Type part item no to search…"
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      border: "1.5px solid #a5b4fc",
                      borderRadius: "8px",
                      fontSize: "13px",
                      background: "#fff",
                      color: "#111827",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  {showCustomLoader && (
                    <span
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "11px",
                        color: "#9ca3af",
                      }}
                    >
                      Searching...
                    </span>
                  )}
                </div>

                {debouncedSku.length >= 2 &&
                  !showCustomLoader &&
                  customOptions.length === 0 && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#9ca3af",
                        paddingLeft: "4px",
                      }}
                    >
                      No parts found for "{debouncedSku}".
                    </div>
                  )}

                {customOptions.length > 0 && (
                  <div
                    style={{
                      border: "1px solid #ddd6fe",
                      borderRadius: "8px",
                      background: "#fff",
                      overflow: "hidden",
                      maxHeight: "200px",
                      overflowY: "auto",
                    }}
                  >
                    {customOptions.map((opt, i) => (
                      <button
                        key={`${opt.value}-${i}`}
                        type="button"
                        onClick={() => handleCustomSelect(i)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          width: "100%",
                          padding: "8px 12px",
                          background: "none",
                          border: "none",
                          borderBottom: "1px solid #f3f4f6",
                          cursor: "pointer",
                          fontSize: "12px",
                          color: "#111827",
                          textAlign: "left",
                          gap: "3px",
                        }}
                        onMouseEnter={(e) =>
                          ((
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "#f5f3ff")
                        }
                        onMouseLeave={(e) =>
                          ((
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "none")
                        }
                      >
                        <span style={{ fontWeight: 600 }}>{opt.label}</span>
                        <span
                          style={{
                            display: "flex",
                            gap: "12px",
                            fontSize: "11px",
                            color: "#6b7280",
                          }}
                        >
                          <span>Lot: {opt.lot_no ?? "—"}</span>
                          <span>
                            QTY Available: {opt.potential_qty_available ?? "—"}
                          </span>
                          {opt.price != null && (
                            <span style={{ color: "#059669", fontWeight: 600 }}>
                              ${opt.price.toFixed(2)}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* All Items search */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
                color: "#6366f1",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={allItemsSearchEnabled}
                onChange={(e) => {
                  setAllItemsSearchEnabled(e.target.checked);
                  if (!e.target.checked) {
                    setAllItemsSearchTerm("");
                    setDebouncedAllItemsSearch("");
                  }
                }}
                style={{
                  accentColor: "#6366f1",
                  width: "14px",
                  height: "14px",
                }}
              />
              Search & add part by all item no
            </label>

            {allItemsSearchEnabled && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={allItemsSearchTerm}
                    onChange={(e) => setAllItemsSearchTerm(e.target.value)}
                    placeholder="Type item no to search…"
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      border: "1.5px solid #a5b4fc",
                      borderRadius: "8px",
                      fontSize: "13px",
                      background: "#fff",
                      color: "#111827",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  {showAllItemsLoader && (
                    <span
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "11px",
                        color: "#9ca3af",
                      }}
                    >
                      Searching...
                    </span>
                  )}
                </div>

                {debouncedAllItemsSearch.length >= 2 &&
                  !showAllItemsLoader &&
                  allItemsOptions.length === 0 && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#9ca3af",
                        paddingLeft: "4px",
                      }}
                    >
                      No items found for "{debouncedAllItemsSearch}".
                    </div>
                  )}

                {allItemsOptions.length > 0 && (
                  <div
                    style={{
                      border: "1px solid #ddd6fe",
                      borderRadius: "8px",
                      background: "#fff",
                      overflow: "hidden",
                      maxHeight: "200px",
                      overflowY: "auto",
                    }}
                  >
                    {allItemsOptions.map((opt, i) => (
                      <button
                        key={`${opt.value}-${i}`}
                        type="button"
                        onClick={() => handleAllItemsSelect(i)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          width: "100%",
                          padding: "8px 12px",
                          background: "none",
                          border: "none",
                          borderBottom: "1px solid #f3f4f6",
                          cursor: "pointer",
                          fontSize: "12px",
                          color: "#111827",
                          textAlign: "left",
                          gap: "3px",
                        }}
                        onMouseEnter={(e) =>
                          ((
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "#f5f3ff")
                        }
                        onMouseLeave={(e) =>
                          ((
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "none")
                        }
                      >
                        <span style={{ fontWeight: 600 }}>{opt.label}</span>
                        <span
                          style={{
                            display: "flex",
                            gap: "12px",
                            fontSize: "11px",
                            color: "#6b7280",
                          }}
                        >
                          <span>
                            QTY Available: {opt.potential_qty_available ?? "—"}
                          </span>
                          {opt.price != null && (
                            <span style={{ color: "#059669", fontWeight: 600 }}>
                              ${opt.price.toFixed(2)}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Touchup Pen SKU search */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
                color: "#6366f1",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={touchupPenSearchEnabled}
                onChange={(e) => {
                  setTouchupPenSearchEnabled(e.target.checked);
                  if (!e.target.checked) {
                    setTouchupPenSearchTerm("");
                    setDebouncedTouchupPenSearch("");
                  }
                }}
                style={{
                  accentColor: "#6366f1",
                  width: "14px",
                  height: "14px",
                }}
              />
              Search & add touchup pen by item no
            </label>

            {touchupPenSearchEnabled && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={touchupPenSearchTerm}
                    onChange={(e) => setTouchupPenSearchTerm(e.target.value)}
                    placeholder="Type touchup pen item no to search…"
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      border: "1.5px solid #a5b4fc",
                      borderRadius: "8px",
                      fontSize: "13px",
                      background: "#fff",
                      color: "#111827",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  {showTouchupPenLoader && (
                    <span
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "11px",
                        color: "#9ca3af",
                      }}
                    >
                      Searching...
                    </span>
                  )}
                </div>

                {debouncedTouchupPenSearch.length >= 2 &&
                  !showTouchupPenLoader &&
                  touchupPenOptions.length === 0 && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#9ca3af",
                        paddingLeft: "4px",
                      }}
                    >
                      No touchup pens found for "{debouncedTouchupPenSearch}".
                    </div>
                  )}

                {touchupPenOptions.length > 0 && (
                  <div
                    style={{
                      border: "1px solid #ddd6fe",
                      borderRadius: "8px",
                      background: "#fff",
                      overflow: "hidden",
                      maxHeight: "200px",
                      overflowY: "auto",
                    }}
                  >
                    {touchupPenOptions.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() =>
                          handleTouchupPenSelect(
                            opt.value,
                            opt.unit_price,
                            opt.qty_available,
                            opt.earliest_avail_date,
                          )
                        }
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "8px 12px",
                          background: "none",
                          border: "none",
                          borderBottom: "1px solid #f3f4f6",
                          cursor: "pointer",
                          fontSize: "12px",
                          color: "#111827",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) =>
                          ((
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "#f5f3ff")
                        }
                        onMouseLeave={(e) =>
                          ((
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "none")
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

interface ShopifyOrderFormProps {
  onClose?: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1.5px solid #e5e7eb",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  background: "#fff",
  color: "#111827",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "6px",
};

const fieldWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newOperation(): EditOperation {
  return {
    id: Math.random().toString(36).slice(2),
    type: "addVariant",
    variantId: "",
    lineItemId: "",
    quantity: 1,
    allowDuplicates: false,
    restock: false,
    discountType: "percent",
    discountValue: "",
    discountCurrencyCode: "USD",
    discountDescription: "",
    customTitle: "",
    customSku: "",
    customPrice: "",
    customCurrencyCode: "USD",
    reasonCode: "",
    returnReasonCode: "",
  };
}

// ─── CustomItemFields ─────────────────────────────────────────────────────────

interface CustomItemFieldsProps {
  op: EditOperation;
  onUpdate: (updates: Partial<EditOperation>) => void;
  reasonCodeOptions: { value: string; label: string }[];
  lineReasonCodeOptions: { value: string; label: string }[];
}

const CustomItemFields: React.FC<CustomItemFieldsProps> = ({
  op,
  onUpdate,
  reasonCodeOptions,
  lineReasonCodeOptions,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowResults(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: searchData, isFetching } = useGetDistinctTouchupItemsQuery(
    { parts_item_no: `like:${debouncedSearch}`, page_size: 50 },
    { skip: debouncedSearch.length < 2 },
  );

  const results: { item_no: string; price: number | null }[] = (
    searchData?.data ?? []
  ).map((p: any) => ({
    item_no: p.parts_item_no,
    price: p.unit_price != null ? Number(p.unit_price) : null,
  }));

  const handleSelect = (item_no: string, price: number | null) => {
    onUpdate({
      customTitle: item_no,
      customSku: item_no,
      customPrice: price != null ? String(price) : "",
    });
    setSearchTerm("");
    setDebouncedSearch("");
    setShowResults(false);
  };

  return (
    <>
      {/* Search by item no */}
      <div ref={searchRef} style={{ ...fieldWrap, position: "relative" }}>
        <label style={labelStyle}>Search by Item No</label>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowResults(true);
            }}
            placeholder="Type item no to search…"
            style={inputStyle}
          />
          {isFetching && (
            <CircularProgress
              size={14}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
          )}
        </div>
        {showResults &&
          debouncedSearch.length >= 2 &&
          !isFetching &&
          results.length === 0 && (
            <div
              style={{
                position: "absolute",
                zIndex: 999,
                background: "#fff",
                border: "1.5px solid #e5e7eb",
                borderRadius: "8px",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                padding: "10px 12px",
                fontSize: "12px",
                color: "#9ca3af",
              }}
            >
              No items found
            </div>
          )}
        {showResults && results.length > 0 && (
          <div
            style={{
              position: "absolute",
              zIndex: 999,
              background: "#fff",
              border: "1.5px solid #e5e7eb",
              borderRadius: "8px",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              maxHeight: "160px",
              overflowY: "auto",
              boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            }}
          >
            {results.map((r) => (
              <div
                key={r.item_no}
                onClick={() => handleSelect(r.item_no, r.price)}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#111827",
                  borderBottom: "1px solid #f3f4f6",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    "#f5f3ff")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    "transparent")
                }
              >
                <strong>{r.item_no}</strong>
                {r.price != null && (
                  <span style={{ marginLeft: "8px", color: "#6b7280" }}>
                    — ${r.price}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Title */}
      <div style={fieldWrap}>
        <label style={labelStyle}>Title *</label>
        <input
          style={inputStyle}
          placeholder="e.g., Custom Part"
          value={op.customTitle}
          onChange={(e) => onUpdate({ customTitle: e.target.value })}
        />
      </div>

      {/* SKU */}
      <div style={fieldWrap}>
        <label style={labelStyle}>SKU</label>
        <input
          style={inputStyle}
          placeholder="e.g., PART-001"
          value={op.customSku}
          onChange={(e) => onUpdate({ customSku: e.target.value })}
        />
      </div>

      {/* Price */}
      <div style={fieldWrap}>
        <label style={labelStyle}>Price *</label>
        <input
          type="number"
          min={0}
          step="0.01"
          style={inputStyle}
          placeholder="0.00"
          value={op.customPrice}
          onChange={(e) => onUpdate({ customPrice: e.target.value })}
        />
      </div>

      {/* Currency */}
      <div style={fieldWrap}>
        <label style={labelStyle}>Currency</label>
        <input
          style={inputStyle}
          placeholder="USD"
          value={op.customCurrencyCode}
          onChange={(e) => onUpdate({ customCurrencyCode: e.target.value })}
        />
      </div>

      {/* Quantity */}
      <div style={fieldWrap}>
        <label style={labelStyle}>Quantity *</label>
        <input
          type="number"
          min={1}
          value={op.quantity}
          onChange={(e) =>
            onUpdate({ quantity: parseInt(e.target.value, 10) || 1 })
          }
          style={inputStyle}
        />
      </div>

      {/* Reason Code */}
      <div style={fieldWrap}>
        <label style={labelStyle}>Reason Code</label>
        <SearchableDropdown
          value={op.reasonCode}
          onChange={(val) => onUpdate({ reasonCode: val })}
          options={reasonCodeOptions}
          placeholder="— select reason code —"
        />
      </div>

      {/* Return Reason Code */}
      <div style={fieldWrap}>
        <label style={labelStyle}>Return Reason Code</label>
        <SearchableDropdown
          value={op.returnReasonCode}
          onChange={(val) => onUpdate({ returnReasonCode: val })}
          options={lineReasonCodeOptions}
          placeholder="— select return reason code —"
        />
      </div>
    </>
  );
};

// ─── DraftCustomItemRow ───────────────────────────────────────────────────────

interface DraftCustomItemRowProps {
  item: DraftNewCustomItem;
  onUpdate: (updates: Partial<DraftNewCustomItem>) => void;
  onRemove: () => void;
  reasonCodeOptions: { value: string; label: string }[];
  lineReasonCodeOptions: { value: string; label: string }[];
  washWholeUnit?: boolean;
}

const DraftCustomItemRow: React.FC<DraftCustomItemRowProps> = ({
  item,
  onUpdate,
  onRemove,
  reasonCodeOptions,
  lineReasonCodeOptions,
  washWholeUnit = false,
}) => {
  const lineAmount =
    item.price !== "" && !isNaN(parseFloat(item.price))
      ? (parseFloat(item.price) * item.quantity).toFixed(2)
      : null;

  return (
    <div
      style={{
        border: "1.5px solid #e5e7eb",
        borderRadius: "12px",
        padding: "14px 16px",
        marginBottom: "10px",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#6366f1",
            background: "#ede9fe",
            borderRadius: "4px",
            padding: "2px 8px",
          }}
        >
          Custom Item
        </span>
        <button
          type="button"
          onClick={onRemove}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#ef4444",
            fontSize: "18px",
            lineHeight: 1,
            padding: "0 2px",
          }}
          title="Remove"
        >
          ×
        </button>
      </div>

      {/* 5-column grid: Item No, Lot No, Unit Price, Line Amount, Qty */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr) 90px",
          gap: "10px",
        }}
      >
        {item.title || item.lot_no ? (
          <>
            {/* Item No (read-only after selection) */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <span
                style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}
              >
                Item No
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  border: "1.5px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: item.title ? "#111827" : "#9ca3af",
                  background: "#f9fafb",
                  gap: "6px",
                }}
              >
                <span style={{ flex: 1 }}>{item.title || "—"}</span>
                {!item.isExistingOrderLine && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate({ title: "", lot_no: "", price: "" })
                    }
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#9ca3af",
                      fontSize: "14px",
                      lineHeight: 1,
                      padding: 0,
                    }}
                    title="Clear item / lot"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Lot No (read-only after selection) */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <span
                style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}
              >
                Lot No
              </span>
              <div
                style={{
                  padding: "8px 12px",
                  border: "1.5px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: item.lot_no ? "#111827" : "#9ca3af",
                  background: "#f9fafb",
                }}
              >
                {item.lot_no || "—"}
              </div>
            </div>
          </>
        ) : (
          <LineItemSearchFields
            onPopulate={({ item_no, lot_no, unit_price }) => {
              onUpdate({
                title: item_no,
                lot_no,
                price: unit_price != null ? String(unit_price) : "",
                quantity: 1,
              });
            }}
          />
        )}

        {/* Unit Price */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}>
            Unit Price
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={item.price}
            disabled={washWholeUnit}
            onChange={(e) => onUpdate({ price: e.target.value })}
            placeholder="0.00"
            style={{
              ...inputStyle,
              fontSize: "13px",
              padding: "8px 12px",
              ...(washWholeUnit
                ? {
                    background: "#f3f4f6",
                    color: "#9ca3af",
                    cursor: "not-allowed",
                  }
                : item.price === "" || Number(item.price) === 0
                  ? { border: "1.5px solid #f59e0b", background: "#fffbeb" }
                  : {}),
            }}
          />
        </div>

        {/* Line Amount */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}>
            Line Amount
          </span>
          <div
            style={{
              padding: "8px 12px",
              border: "1.5px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "13px",
              color: lineAmount ? "#047857" : "#9ca3af",
              background: lineAmount ? "#f0fdf4" : "#f9fafb",
              fontWeight: lineAmount ? 600 : 400,
            }}
          >
            {lineAmount ? `$${lineAmount}` : "—"}
          </div>
        </div>

        {/* Qty */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}>
            Qty
          </span>
          <input
            type="number"
            min={1}
            value={item.quantity}
            disabled={washWholeUnit}
            onKeyDown={(e) => {
              if (/^[0-9]$/.test(e.key))
                (e.target as HTMLInputElement).select();
            }}
            onChange={(e) =>
              onUpdate({ quantity: parseInt(e.target.value, 10) || 1 })
            }
            style={{
              ...inputStyle,
              fontSize: "13px",
              padding: "8px 12px",
              ...(washWholeUnit
                ? {
                    background: "#f3f4f6",
                    color: "#9ca3af",
                    cursor: "not-allowed",
                  }
                : {}),
            }}
          />
        </div>
      </div>

      {/* Return Reason Code — shown at item level only when no parts are added */}
      {item.parts.length === 0 && (
        <div style={{ marginTop: "10px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#6b7280",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Return Reason Code
          </span>
          <SearchableDropdown
            value={item.returnReasonCode}
            onChange={(val) => onUpdate({ returnReasonCode: val })}
            options={lineReasonCodeOptions}
            placeholder="— select return reason code —"
          />
        </div>
      )}

      {/* Parts Line Items — hidden when Wash Whole Unit is active */}
      {!washWholeUnit && (
        <PartsSubSection
          item_no={item.title}
          lot_no={item.lot_no}
          parts={item.parts}
          onChange={(parts) => onUpdate({ parts })}
          reasonCodeOptions={lineReasonCodeOptions}
        />
      )}
    </div>
  );
};

// ─── ResultBox ────────────────────────────────────────────────────────────────

const ResultBox: React.FC<{
  data?: any;
  error?: any;
  successColor?: string;
  successBg?: string;
  adminUrl?: string;
}> = ({
  data,
  error,
  successColor = "#16a34a",
  successBg = "#f0fdf4",
  adminUrl,
}) => (
  <>
    {error && (
      <pre
        style={{
          color: "#dc2626",
          background: "#fef2f2",
          borderRadius: "8px",
          padding: "12px",
          fontSize: "12px",
          marginBottom: "16px",
          overflowX: "auto",
        }}
      >
        {JSON.stringify(error, null, 2)}
      </pre>
    )}
    {data && (
      <>
        {adminUrl && (
          <div style={{ marginBottom: "10px" }}>
            <a
              href={adminUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#2563eb",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "13px",
                padding: "7px 14px",
                background: "#eff6ff",
                borderRadius: "8px",
                border: "1px solid #bfdbfe",
              }}
            >
              🔗 View in Shopify Admin
            </a>
          </div>
        )}
        <pre
          style={{
            color: successColor,
            background: successBg,
            borderRadius: "8px",
            padding: "12px",
            fontSize: "12px",
            marginBottom: "16px",
            overflowX: "auto",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      </>
    )}
  </>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ShopifyOrderForm: React.FC<ShopifyOrderFormProps> = ({ onClose }) => {
  // ── Mode ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<FormMode>("create");
  const [editSubTab, setEditSubTab] = useState<EditSubTab>("details");

  // ── Store (shared) ────────────────────────────────────────────────────────
  const [selectedStoreOption, setSelectedStoreOption] =
    useState<StoreOption | null>(null);
  const selectedStore = selectedStoreOption?.value;
  const selectedTag = selectedStoreOption?.tag ?? "";

  // ── Create mode: order search ─────────────────────────────────────────────
  const [orderSearchInput, setOrderSearchInput] = useState("");
  const [orderSearchFilter, setOrderSearchFilter] = useState<
    string | undefined
  >(undefined);
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [availableLineItems, setAvailableLineItems] = useState<any[]>([]);
  const [lineItemProductIds, setLineItemProductIds] = useState<
    (string | null)[]
  >([null]);

  const orderSearchRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: orderSearchData, isFetching: isOrderSearching } =
    useGetShopifyLineItemsQuery(
      { order_id: orderSearchFilter! },
      { skip: !orderSearchFilter },
    );
  const orderSuggestions = useMemo(
    () => orderSearchData?.data || [],
    [orderSearchData],
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        orderSearchRef.current &&
        !orderSearchRef.current.contains(e.target as Node)
      )
        setShowOrderDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        draftImportSearchRef.current &&
        !draftImportSearchRef.current.contains(e.target as Node)
      )
        setShowDraftImportDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Reason code ───────────────────────────────────────────────────────────
  const [selectedReasonCode, setSelectedReasonCode] = useState("");
  const [selectedExternalDocInfo, setSelectedExternalDocInfo] = useState("");
  const [washWholeUnit, setWashWholeUnit] = useState(false);
  const { data: returnReasonsData } = useGetShopifyReturnReasonsCodeQuery();

  //  useGetShopifyReturnReasonsQuery();
  const reasonCodeOptions = (returnReasonsData?.data ?? []).map((r) => ({
    value: r.Code,
    label: `${r.Code} — ${r.Description}`,
  }));
  const { data: returnReasonsCodeData } = useGetShopifyReturnReasonsQuery();
  // useGetShopifyReturnReasonsCodeQuery();
  const lineReasonCodeOptions = (returnReasonsCodeData?.data ?? []).map(
    (r) => ({
      value: r.Code,
      label: `${r.Code} — ${r.Description}`,
    }),
  );

  // ── Create mode: mutations ────────────────────────────────────────────────
  const [, { isLoading, data, error }] = useCreateOrderMutation();
  const [
    createDraftOrder,
    { isLoading: isDraftLoading, data: draftData, error: draftError },
  ] = useCreateDraftOrderMutation();
  const [createProduct, { isLoading: isProductCreating }] =
    useCreateProductMutation();

  // ── Create Product: form state ────────────────────────────────────────────
  const [productForm, setProductForm] = useState({
    title: "",
    price: "",
    sku: "",
    product_type: "",
    vendor: "",
  });
  const {
    data: products,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useGetProductsQuery(selectedStore!, { skip: !selectedStore });

  const variantOptions = useMemo<VariantOption[]>(() => {
    if (!products) return [];
    return products.flatMap((product) =>
      product.variants.edges.map(({ node: variant }) => ({
        label: `${product.title} — ${variant.title}${variant.sku ? ` (${variant.sku})` : ""} · $${variant.price}`,
        variantId: variant.id,
        product,
        variant,
      })),
    );
  }, [products]);

  const getProductVariants = (productId: string | null): ProductVariant[] => {
    if (!productId || !products) return [];
    const product = products.find((p) => p.id === productId);
    return product ? product.variants.edges.map((e) => e.node) : [];
  };

  const productHasVariantChoice = (productId: string | null): boolean => {
    const variants = getProductVariants(productId);
    return (
      variants.length > 1 ||
      (variants.length === 1 && variants[0].title !== "Default Title")
    );
  };

  // ── Create mode: form state ───────────────────────────────────────────────
  const [form, setForm] = useState<OrderFormState>({
    email: "",
    lineItems: [{ variantId: "", quantity: 1 }],
    shippingAddress: { ...defaultAddress },
    // billingAddress: { ...defaultAddress },
  });

  // ── Edit mode: order search ───────────────────────────────────────────────
  const [editSearchInput, setEditSearchInput] = useState("");
  const [editSearchFilter, setEditSearchFilter] = useState<string | undefined>(
    undefined,
  );
  const editSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const buildShopifyQuery = (input: string): string | undefined => {
    const trimmed = input.trim();
    if (!trimmed) return undefined;
    if (/^\d+$/.test(trimmed)) return `name:#${trimmed}`;
    if (trimmed.startsWith("#")) return `name:${trimmed}`;
    if (trimmed.includes("@")) return `email:${trimmed}`;
    return trimmed;
  };

  const {
    // `currentData` (unlike `data`) is undefined whenever the query args
    // (e.g. selectedStore) have changed and the new result hasn't arrived
    // yet — `data` keeps showing the previous store's results until then.
    currentData: editShopifyOrdersData,
    isFetching: isEditOrderSearching,
    isError: isEditOrdersError,
  } = useGetShopifyOrdersQuery(
    {
      store: selectedStore!,
      limit: 50,
      query: editSearchFilter,
      forCancellation: mode === "cancelOrder",
    },
    {
      skip: !selectedStore || (mode !== "editOrder" && mode !== "cancelOrder"),
    },
  );
  const editOrderSuggestions = useMemo(
    () => (isEditOrdersError ? [] : editShopifyOrdersData?.data || []),
    [editShopifyOrdersData, isEditOrdersError],
  );

  const handleSelectEditOrder = (order: any, isDraft = false) => {
    const numericId = order.id?.split("/").pop() || "";
    // WISMO's external_doc_no matches the order's display name/number (e.g. "1117"
    // for order "#1117"), not its internal numeric id — use that for cancel mode.
    const orderName = (order.name || "").replace(/^#/, "") || numericId;
    setOperations([newOperation()]);
    setRemovedLineItemIds(new Set());
    resetEditOrder();
    if (isDraft) {
      setEditDraftOrderId(numericId);
    } else if (mode === "cancelOrder") {
      setEditOrderId(orderName);
    } else {
      setEditOrderId(numericId);
      setLoadLineItemsOrderId(numericId);
    }
    if (mode !== "cancelOrder") {
      if (order.email) setEditEmail(order.email);
      if (order.tags?.length) setEditTags(order.tags.join(", "));
      const addr = order.shippingAddress;
      if (addr) {
        setEditAddr((prev) => ({
          ...prev,
          firstName: addr.firstName || prev.firstName,
          lastName: addr.lastName || prev.lastName,
          company: addr.company || prev.company,
          address1: addr.address1 || prev.address1,
          address2: addr.address2 || prev.address2,
          city: addr.city || prev.city,
          zip: addr.zip || prev.zip,
          provinceCode: addr.provinceCode || prev.provinceCode,
          countryCode: addr.countryCode || prev.countryCode,
          phone: addr.phone || prev.phone,
        }));
      }
    }
    setEditSearchInput(order.name || numericId);
  };

  // ── Edit draft mode: order search ────────────────────────────────────────
  const [draftSearchInput, setDraftSearchInput] = useState("");
  const [draftSearchFilter, setDraftSearchFilter] = useState<
    string | undefined
  >(undefined);
  const [draftSelectedOrder, setDraftSelectedOrder] = useState<any>(null);
  const draftSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const {
    data: editDraftOrdersData,
    isFetching: isDraftOrderSearching,
    isError: isDraftOrdersError,
  } = useGetShopifyDraftOrdersQuery(
    { store: selectedStore!, limit: 50, query: draftSearchFilter },
    { skip: !selectedStore || mode !== "editDraft" },
  );
  const draftOrderSuggestions = useMemo(
    () => (isDraftOrdersError ? [] : editDraftOrdersData?.data || []),
    [editDraftOrdersData, isDraftOrdersError],
  );

  const handleSelectDraftOrder = (order: any) => {
    const numericId = order.id?.split("/").pop() || "";
    setEditDraftOrderId(numericId);
    setLoadDraftLineItemsId(numericId);
    if (order.email) setEditEmail(order.email);
    setEditTags(order.tags?.length ? order.tags.join(", ") : "");
    setDraftOrderStatus(order.status ?? null);
    setDraftEditReasonCode("");
    resetUpdateDraft();
    const addr = order.shippingAddress;
    if (addr) {
      setEditAddr((prev) => ({
        ...prev,
        firstName: addr.firstName || prev.firstName,
        lastName: addr.lastName || prev.lastName,
        company: addr.company || prev.company,
        address1: addr.address1 || prev.address1,
        address2: addr.address2 || prev.address2,
        city: addr.city || prev.city,
        zip: addr.zip || prev.zip,
        provinceCode: addr.provinceCode || prev.provinceCode,
        countryCode: addr.countryCode || prev.countryCode,
        phone: addr.phone || prev.phone,
      }));
    }
    setDraftSearchInput(order.name || numericId);
  };

  // ── Edit mode: mutations ──────────────────────────────────────────────────
  const [
    updateOrder,
    { isLoading: isUpdating, data: updateData, error: updateError },
  ] = useUpdateOrderMutation();
  const [
    updateDraftOrder,
    {
      isLoading: isDraftUpdating,
      data: updateDraftData,
      error: updateDraftError,
      reset: resetUpdateDraft,
    },
  ] = useUpdateDraftOrderMutation();
  const [
    editOrderMutation,
    {
      isLoading: isEditing,
      data: editData,
      error: editError,
      reset: resetEditOrder,
    },
  ] = useEditOrderMutation();
  const [
    cancelOrderMutation,
    {
      isLoading: isCancelling,
      data: cancelData,
      error: cancelError,
      reset: resetCancel,
    },
  ] = useCancelOrderMutation();

  // Load existing line items for the order being edited
  const [loadLineItemsOrderId, setLoadLineItemsOrderId] = useState<string>("");
  const prevLoadLineItemsOrderIdRef = useRef<string>("");
  const {
    data: orderDetailData,
    isFetching: isLoadingLineItems,
    isError: _isLineItemsError,
    refetch: refetchLineItems,
  } = useGetOrderLineItemsQuery(
    { orderId: loadLineItemsOrderId, store: selectedStore! },
    {
      skip: !loadLineItemsOrderId || !selectedStore,
      refetchOnMountOrArgChange: true,
    },
  );

  // Force refetch when the same order is re-selected (cache bypass)
  useEffect(() => {
    if (
      loadLineItemsOrderId &&
      loadLineItemsOrderId === prevLoadLineItemsOrderIdRef.current
    ) {
      refetchLineItems();
    }
    prevLoadLineItemsOrderIdRef.current = loadLineItemsOrderId;
  }, [loadLineItemsOrderId]);
  const existingLineItems = loadLineItemsOrderId
    ? (orderDetailData?.lineItems ?? [])
    : [];

  // ── Edit draft: import-from-order search ─────────────────────────────────
  const [draftImportOrderInput, setDraftImportOrderInput] = useState("");
  const [draftImportOrderFilter, setDraftImportOrderFilter] = useState<
    string | undefined
  >(undefined);
  const [showDraftImportDropdown, setShowDraftImportDropdown] = useState(false);
  const [draftImportAvailableItems, setDraftImportAvailableItems] = useState<
    any[]
  >([]);
  const draftImportDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const draftImportSearchRef = useRef<HTMLDivElement>(null);

  const { data: draftImportOrderData, isFetching: isDraftImportSearching } =
    useGetShopifyLineItemsQuery(
      { order_id: draftImportOrderFilter! },
      { skip: !draftImportOrderFilter },
    );
  const draftImportSuggestions = useMemo(
    () => draftImportOrderData?.data || [],
    [draftImportOrderData],
  );

  // ── Edit draft: line items state ──────────────────────────────────────────
  const [draftSubTab, setDraftSubTab] = useState<DraftSubTab>("details");
  const [loadDraftLineItemsId, setLoadDraftLineItemsId] = useState<string>("");
  const prevLoadDraftLineItemsIdRef = useRef<string>("");
  const [draftVariantItems, setDraftVariantItems] = useState<
    DraftVariantLineItem[]
  >([]);
  const [draftCustomItems, setDraftCustomItems] = useState<
    {
      title: string;
      quantity: number;
      price: string | null;
      pendingRemove: boolean;
      customAttributes: Array<{ key: string; value: string }>;
    }[]
  >([]);
  const [draftNewItems, setDraftNewItems] = useState<DraftNewLineItem[]>([]);
  const [draftNewCustomItems, setDraftNewCustomItems] = useState<
    DraftNewCustomItem[]
  >([]);

  const {
    data: draftLineItemsData,
    isFetching: isLoadingDraftLineItems,
    refetch: refetchDraftLineItems,
  } = useGetDraftOrderLineItemsQuery(
    { draftOrderId: loadDraftLineItemsId, store: selectedStore! },
    {
      skip: !loadDraftLineItemsId || !selectedStore,
      refetchOnMountOrArgChange: true,
    },
  );

  // Force refetch when the same draft order is re-selected (cache bypass)
  useEffect(() => {
    if (
      loadDraftLineItemsId &&
      loadDraftLineItemsId === prevLoadDraftLineItemsIdRef.current
    ) {
      refetchDraftLineItems();
    }
    prevLoadDraftLineItemsIdRef.current = loadDraftLineItemsId;
  }, [loadDraftLineItemsId]);

  // Populate variant/custom state when draft line items load
  useEffect(() => {
    if (!draftLineItemsData) return;
    setDraftVariantItems(
      draftLineItemsData.lineItems.map((li, i) => ({
        key: `${li.variantId!}_${i}`,
        variantId: li.variantId!,
        title: li.title,
        quantity: li.quantity,
        pendingRemove: false,
      })),
    );
    setDraftCustomItems(
      draftLineItemsData.customItems.map((ci) => ({
        ...ci,
        pendingRemove: false,
        customAttributes: ci.customAttributes ?? [],
      })),
    );
    setDraftNewItems([]);
    setDraftNewCustomItems([]);
    // Pre-populate order-level reason_code, external_doc_info and status from the fetched draft order
    const existingReasonCode =
      draftLineItemsData.customAttributes?.find(
        (a) => a.key === "CXI Reason Code" || a.key === "reason_code",
      )?.value ?? "";
    setDraftEditReasonCode(existingReasonCode);
    const existingExternDocInfo =
      draftLineItemsData.customAttributes?.find(
        (a) => a.key === "Zendesk Ticket #" || a.key === "external_doc_info",
      )?.value ?? "";
    setDraftEditExternalDocInfo(existingExternDocInfo);
    if (draftLineItemsData.status) {
      setDraftOrderStatus(draftLineItemsData.status);
    }
  }, [draftLineItemsData]);

  // Sync email, tags, and full address from order detail response (always fresh)
  useEffect(() => {
    if (!orderDetailData) return;
    setEditEmail(orderDetailData.email ?? "");
    setEditTags(orderDetailData.tags?.join(", ") ?? "");
    const addr = orderDetailData.shippingAddress;
    setEditAddr({
      firstName: addr?.firstName ?? "",
      lastName: addr?.lastName ?? "",
      company: addr?.company ?? "",
      address1: addr?.address1 ?? "",
      address2: addr?.address2 ?? "",
      city: addr?.city ?? "",
      zip: addr?.zip ?? "",
      provinceCode: addr?.provinceCode ?? "",
      countryCode: addr?.countryCode ?? "",
      phone: addr?.phone ?? "",
    });
  }, [orderDetailData]);

  // ── Edit mode: state ──────────────────────────────────────────────────────
  const [editOrderId, setEditOrderId] = useState("");
  const [editDraftOrderId, setEditDraftOrderId] = useState("");

  // ── Edit eligibility check (Shopify-based, editOrder mode only) ───────────
  const { data: editEligibility, isFetching: isCheckingEligibility } =
    useGetOrderEditEligibilityQuery(
      {
        orderId: editOrderId,
        store: selectedStore!,
        action: "edited",
      },
      {
        skip: !selectedStore || !editOrderId.trim() || mode !== "editOrder",
      },
    );

  // ── Cancel eligibility check (WISMO + 90-min window, cancelOrder mode only) ─
  const { data: cancelEligibility, isFetching: isCheckingCancelEligibility } =
    useGetOrderCancelEligibilityQuery(
      { orderId: editOrderId.trim(), store: selectedStore! },
      { skip: !selectedStore || !editOrderId.trim() || mode !== "cancelOrder" },
    );

  // ── Normalized eligibility for the mode currently active ──────────────────
  const isCancelMode = mode === "cancelOrder";
  const activeEligibility = isCancelMode
    ? cancelEligibility
      ? {
          canEdit: cancelEligibility.canCancel,
          reason: cancelEligibility.reason,
          remainingMinutes: cancelEligibility.remainingMinutes,
          wismo: cancelEligibility.wismo,
        }
      : undefined
    : editEligibility;
  const isCheckingActiveEligibility = isCancelMode
    ? isCheckingCancelEligibility
    : isCheckingEligibility;
  const [editSelectedOrder, setEditSelectedOrder] = useState<any>(null);

  const [removedLineItemIds, setRemovedLineItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [editEmail, setEditEmail] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editAddr, setEditAddr] = useState({ ...defaultAddress });
  const [customAttrs, setCustomAttrs] = useState<CustomAttribute[]>([]);
  const [operations, setOperations] = useState<EditOperation[]>([
    newOperation(),
  ]);
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [staffNote, setStaffNote] = useState("");
  const [draftOrderStatus, setDraftOrderStatus] = useState<string | null>(null);
  const [draftEditReasonCode, setDraftEditReasonCode] = useState("");
  const [draftEditExternalDocInfo, setDraftEditExternalDocInfo] = useState("");
  const [draftWashWholeUnit, setDraftWashWholeUnit] = useState(false);

  // ── Cancel order state ────────────────────────────────────────────────────
  const [cancelReason, setCancelReason] = useState("CUSTOMER");
  const [cancelStaffNote, setCancelStaffNote] = useState("");
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [cancelNoteCategory, setCancelNoteCategory] = useState("");
  const [cancelNoteReason, setCancelNoteReason] = useState("");

  // Reset edit state when switching modes
  useEffect(() => {
    setEditOrderId("");
    setLoadLineItemsOrderId("");
    setEditEmail("");
    setEditTags("");
    setEditAddr({ ...defaultAddress });
    setCustomAttrs([]);
    setOperations([newOperation()]);
    setNotifyCustomer(false);
    setStaffNote("");
    setEditSubTab("details");
    setEditSelectedOrder(null);
    setEditSearchInput("");
    setEditSearchFilter(undefined);
    setDraftSelectedOrder(null);
    setDraftSearchInput("");
    setDraftSearchFilter(undefined);
    setRemovedLineItemIds(new Set());
    setDraftSubTab("details");
    setLoadDraftLineItemsId("");
    setDraftVariantItems([]);
    setDraftCustomItems([]);
    setDraftNewItems([]);
    setDraftNewCustomItems([]);
    setDraftImportOrderInput("");
    setDraftImportOrderFilter(undefined);
    setDraftImportAvailableItems([]);
    setDraftOrderStatus(null);
    setDraftEditReasonCode("");
    setDraftWashWholeUnit(false);
    setCancelReason("CUSTOMER");
    setCancelStaffNote("");
    setCancelConfirmed(false);
    setCancelNoteCategory("");
    setCancelNoteReason("");
    setSelectedStoreOption(null); // store label sets differ between cancel mode and the rest
    resetCancel();
    resetEditOrder();
  }, [mode]); // Reset all form state when store changes
  useEffect(() => {
    // Reset line items for the new store, keep email/addresses and available items
    setForm((prev) => ({ ...prev, lineItems: [] }));
    setLineItemProductIds([]);
    // Edit mode
    setEditOrderId("");
    setEditDraftOrderId("");
    setEditSelectedOrder(null);
    setEditEmail("");
    setEditTags("");
    setEditAddr({ ...defaultAddress });
    setCustomAttrs([]);
    setOperations([newOperation()]);
    setNotifyCustomer(false);
    setStaffNote("");
    setEditSubTab("details");
    setEditSearchInput("");
    setEditSearchFilter(undefined);
    setDraftSelectedOrder(null);
    setDraftSearchInput("");
    setDraftSearchFilter(undefined);
    setRemovedLineItemIds(new Set());
    setLoadLineItemsOrderId("");
    setDraftSubTab("details");
    setLoadDraftLineItemsId("");
    setDraftVariantItems([]);
    setDraftCustomItems([]);
    setDraftNewItems([]);
    setDraftNewCustomItems([]);
    setDraftImportOrderInput("");
    setDraftImportOrderFilter(undefined);
    setDraftImportAvailableItems([]);
    resetEditOrder();
  }, [selectedStoreOption]);

  // ── Create mode: handlers ─────────────────────────────────────────────────
  const handleOrderSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrderSearchInput(val);
    setShowOrderDropdown(true);
    if (!val.trim()) {
      setForm((prev) => ({
        ...prev,
        email: "",
        shippingAddress: { ...defaultAddress },
      }));
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setOrderSearchFilter(val.trim() || undefined);
    }, 400);
  };

  const handleSelectOrder = (order: any) => {
    const allRows: any[] = orderSuggestions.filter(
      (r: any) => r.order_id === order.order_id,
    );

    // Store rows for the dropdown — user picks which to add
    setAvailableLineItems(allRows);
    setLineItemProductIds([]);

    setForm((prev) => ({
      ...prev,
      email: order.customer_email || prev.email,
      lineItems: [],
      shippingAddress: {
        ...prev.shippingAddress,
        firstName: order.first_name || prev.shippingAddress.firstName,
        lastName: order.last_name || prev.shippingAddress.lastName,
        address1: order.address || "",
        address2: order.address_2 || "",
        company: order.company || "",
        city: order.city || "",
        zip: order.zip_code || "",
        provinceCode: order.state_code || "",
        countryCode: order.country_code || "",
        phone: order.phone_no || "",
      },
    }));
    setOrderSearchInput(order.order_id || "");
    setShowOrderDropdown(false);
  };

  const handleAddLineItemFromDropdown = (row: any) => {
    const description: string = (row.description || "").trim().toLowerCase();
    const matchedProduct =
      products?.find((p) => p.title.trim().toLowerCase() === description) ??
      null;

    let autoVariantId = "";
    if (matchedProduct) {
      const variants = matchedProduct.variants.edges;
      if (
        variants.length === 1 ||
        variants[0]?.node.title === "Default Title"
      ) {
        autoVariantId = variants[0]?.node.id ?? "";
      }
    }

    const isUnmatched = !matchedProduct && !!(row.description || row.item_no);
    const newItem: LineItem = {
      variantId: autoVariantId,
      quantity: row.quantity != null ? Number(row.quantity) : 1,
      item_no: row.item_no || undefined,
      lot_no: row.lot_no ?? undefined,
      unit_price: row.unit_price ?? null,
      description: row.description || null,
      isExistingOrderLine: true,
      // pre-populate custom fields for use in the confirm modal (not auto-ticked)
      ...(isUnmatched && {
        customTitle: row.description || row.item_no || "",
        customSku: row.item_no || "",
        customProductType: row.lot_no || "",
        customPrice: row.unit_price != null ? String(row.unit_price) : "",
        customVendor: selectedStoreOption?.label ?? "",
      }),
    };

    setLineItemProductIds((prev) => [...prev, matchedProduct?.id ?? null]);
    setForm((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
    }));
  };

  // ── Edit draft: import-from-order handlers ───────────────────────────────
  const handleDraftImportSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const val = e.target.value;
    setDraftImportOrderInput(val);
    setShowDraftImportDropdown(true);
    if (!val.trim()) {
      setDraftImportAvailableItems([]);
      setDraftImportOrderFilter(undefined);
      return;
    }
    if (draftImportDebounceRef.current)
      clearTimeout(draftImportDebounceRef.current);
    draftImportDebounceRef.current = setTimeout(() => {
      setDraftImportOrderFilter(val.trim());
    }, 400);
  };

  const handleSelectDraftImportOrder = (order: any) => {
    const allRows: any[] = draftImportSuggestions.filter(
      (r: any) => r.order_id === order.order_id,
    );
    setDraftImportAvailableItems(allRows);
    setDraftImportOrderInput(order.order_id || "");
    setShowDraftImportDropdown(false);
  };

  const handleAddDraftImportLineItem = (row: any) => {
    const newItem: DraftNewCustomItem = {
      key: Math.random().toString(36).slice(2),
      title: row.item_no || row.description || "",
      lot_no: row.lot_no || "",
      price: row.unit_price != null ? String(row.unit_price) : "",
      quantity: row.quantity != null ? Number(row.quantity) : 1,
      reasonCode: "",
      returnReasonCode: "",
      parts: [],
      isExistingOrderLine: true,
    };
    setDraftNewCustomItems((prev) => [...prev, newItem]);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (
    type: "shippingAddress",
    field: keyof Address,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
  };

  const zipLookupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleShippingZipChange = (zip: string) => {
    handleAddressChange("shippingAddress", "zip", zip);
    if (zipLookupRef.current) clearTimeout(zipLookupRef.current);
    if (!zip || zip.length < 3) return;
    zipLookupRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (!res.ok) return;
        const data = await res.json();
        const place = data?.places?.[0];
        if (!place) return;
        const stateAbbr: string = place["state abbreviation"] ?? "";
        const city: string = place["place name"] ?? "";
        const country: string = data["country abbreviation"] ?? "US";
        setForm((prev) => ({
          ...prev,
          shippingAddress: {
            ...prev.shippingAddress,
            ...(stateAbbr ? { provinceCode: stateAbbr } : {}),
            ...(city ? { city } : {}),
            countryCode: country,
          },
        }));
      } catch {
        // silently ignore lookup failures
      }
    }, 500);
  };

  const handleLineItemChange = <K extends keyof LineItem>(
    index: number,
    field: K,
    value: LineItem[K],
  ) => {
    const newLineItems = [...form.lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    setForm({ ...form, lineItems: newLineItems });
  };

  const addLineItem = () => {
    setLineItemProductIds((prev) => [...prev, null]);
    setForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { variantId: "", quantity: 1, isExistingOrderLine: false },
      ],
    }));
  };

  const buildProperties = (
    item: LineItem,
  ): { name: string; value: string }[] => {
    const props: { name: string; value: string }[] = [];
    if (item.item_no) props.push({ name: "item_no", value: item.item_no });
    if (item.lot_no) props.push({ name: "lot_no", value: item.lot_no });
    if (item.unit_price != null)
      props.push({ name: "unit_price", value: String(item.unit_price) });
    if (item.return_reason_code)
      props.push({
        name: "return_reason_code",
        value: item.return_reason_code,
      });
    if (selectedReasonCode)
      props.push({ name: "reason_code", value: selectedReasonCode });
    if (selectedExternalDocInfo.trim())
      props.push({
        name: "external_doc_info",
        value: selectedExternalDocInfo.trim(),
      });
    return props;
  };

  const getStoreCode = (storeName: string) =>
    storeName.split("-")[0].trim().replace(/\s+/g, "");
  const vendor = getStoreCode(selectedStoreOption?.label ?? "");

  const buildLineItemsPayload = (items: LineItem[]) => {
    const result: any[] = [];
    const storeLabel = selectedStoreOption?.label ?? "";
    const forcePartsZeroPrice =
      !washWholeUnit &&
      (storeLabel.startsWith("CP02") || storeLabel.startsWith("CP05"));

    for (const item of items) {
      const properties = buildProperties(item);
      const activeParts = !washWholeUnit
        ? (item.parts ?? []).filter((p) => p.parts_item_no)
        : [];

      if (activeParts.length > 0) {
        // Parts exist → each part gets shared line props + its own return_reason_code
        for (const part of activeParts) {
          const partProps = [...properties];
          if (part.reason_code)
            partProps.push({
              name: "return_reason_code",
              value: part.reason_code,
            });
          if (part.touchup_color)
            partProps.push({
              name: "touchup_color",
              value: part.touchup_color,
            });
          result.push({
            quantity: part.parts_qty,
            title: part.parts_item_no,
            price: forcePartsZeroPrice
              ? "0.00"
              : part.parts_unit_price != null
                ? String(part.parts_unit_price)
                : "0.00",
            sku: part.parts_item_no,
            ...(partProps.length > 0 && { properties: partProps }),
          });
        }
      } else {
        // No parts → line item itself; reason code from the line-item dropdown
        const lineProps = [...properties];
        if (item.reason_code)
          lineProps.push({
            name: "return_reason_code",
            value: item.reason_code,
          });
        result.push({
          quantity: item.quantity,
          title: item.description || item.item_no || "Custom Item",
          price: item.unit_price != null ? String(item.unit_price) : "0.00",
          sku: item.item_no || undefined,
          ...(lineProps.length > 0 && { properties: lineProps }),
        });
      }
    }
    return result;
  };

  const allPricesZero = (items: LineItem[]) =>
    items.length > 0 &&
    items.every((item) => {
      const lineZero = item.unit_price == null || Number(item.unit_price) === 0;
      const partsZero =
        !item.parts ||
        item.parts.length === 0 ||
        item.parts.every(
          (p) => p.parts_unit_price == null || Number(p.parts_unit_price) === 0,
        );
      return lineZero && partsZero;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreOption) {
      toast.error("Please select a store first.");
      return;
    }
    // const shouldCreateOrder = washWholeUnit || allPricesZero(form.lineItems);
    try {
      // if (shouldCreateOrder) {
      //   await createOrder({
      //     store: selectedStore,
      //     email: form.email,
      //     tags: [selectedTag],
      //     lineItems: buildLineItemsPayload(form.lineItems),
      //     shippingAddress: form.shippingAddress,
      //     inventoryBehaviour: "BYPASS",
      //     sendReceipt: false,
      //     sendFulfillmentReceipt: false,
      //   }).unwrap();
      //   toast.success("Order created successfully!");
      // } else {
      const draftTags = washWholeUnit ? ["cxi-washwholeunit"] : [];
      await createDraftOrder({
        store: selectedStore,
        email: form.email,
        tags: draftTags,
        washWholeUnit,
        lineItems: buildLineItemsPayload(form.lineItems),
        shippingAddress: form.shippingAddress,
        vendor,
      }).unwrap();
      toast.success("Draft order created successfully!");
      // }
    } catch (err) {
      console.error(err);
      toast.error("Error creating draft order");
    }
  };

  // ── Edit mode: handlers ───────────────────────────────────────────────────

  const addOperation = () => setOperations([...operations, newOperation()]);
  const removeOperation = (id: string) =>
    setOperations(operations.filter((o) => o.id !== id));
  const updateOperation = (id: string, updates: Partial<EditOperation>) =>
    setOperations(
      operations.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    );

  const buildEditBody = () => {
    const body: any = {};
    if (editEmail.trim()) body.email = editEmail.trim();
    const parsedTags = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (parsedTags.length) body.tags = parsedTags;
    const hasAddr = Object.values(editAddr).some((v) => v?.trim());
    if (hasAddr) {
      const filteredAddr: any = {};
      Object.entries(editAddr).forEach(([k, v]) => {
        if ((v as string)?.trim()) filteredAddr[k] = (v as string).trim();
      });
      body.shippingAddress = filteredAddr;
    }
    const validAttrs = customAttrs.filter((a) => a.key.trim());
    if (validAttrs.length) body.customAttributes = validAttrs;
    return body;
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreOption) {
      toast.error("Please select a store first.");
      return;
    }
    if (!editOrderId.trim()) {
      toast.error("Please enter an Order ID");
      return;
    }
    try {
      await updateOrder({
        orderId: editOrderId.trim(),
        store: selectedStore,
        ...buildEditBody(),
        vendor,
      }).unwrap();
      toast.success("Order updated successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreOption) {
      toast.error("Please select a store first.");
      return;
    }
    if (!editDraftOrderId.trim()) {
      toast.error("Please enter a Draft Order ID");
      return;
    }
    if (draftOrderStatus === "COMPLETED") {
      toast.error(
        "This draft order has been completed and converted to a real order. It cannot be updated here.",
      );
      return;
    }
    try {
      const body = buildEditBody();
      // Attach order-level attrs; backend merges with existing customAttributes
      if (draftEditReasonCode.trim() || draftEditExternalDocInfo.trim()) {
        const existingAttrs =
          (body.customAttributes as { key: string; value: string }[]) ?? [];
        const filtered = existingAttrs.filter(
          (a) => a.key !== "reason_code" && a.key !== "external_doc_info",
        );
        if (draftEditReasonCode.trim())
          filtered.push({
            key: "reason_code",
            value: draftEditReasonCode.trim(),
          });
        if (draftEditExternalDocInfo.trim())
          filtered.push({
            key: "external_doc_info",
            value: draftEditExternalDocInfo.trim(),
          });
        body.customAttributes = filtered;
      }
      await updateDraftOrder({
        draftOrderId: editDraftOrderId.trim(),
        store: selectedStore,
        ...body,
        vendor,
      }).unwrap();
      toast.success("Draft order updated successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateDraftLineItems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreOption) {
      toast.error("Please select a store first.");
      return;
    }
    if (!editDraftOrderId.trim()) {
      toast.error("Please select a draft order first.");
      return;
    }

    // Build the merged line items payload:
    // - Existing variant items (qty=0 tells backend to remove)
    // - New variant items added by user (qty>0 only)
    // - All existing custom items (qty=0 if pendingRemove → backend drops them)
    // - New custom items with reason codes (title required, OR parts-only items)
    const validNewCustom = draftNewCustomItems.filter(
      (li) =>
        (!draftWashWholeUnit && li.parts.some((p) => p.parts_item_no.trim())) ||
        (li.title.trim() && li.quantity > 0),
    );

    // Expand custom items with parts into individual part line items (same as create flow)
    const expandedNewCustom: Array<{
      title?: string;
      quantity: number;
      originalUnitPrice?: string;
      returnReasonCode?: string;
      sku?: string;
      lotNo?: string;
      itemNo?: string;
      touchupColor?: string;
    }> = [];
    for (const li of validNewCustom) {
      const activeParts = !draftWashWholeUnit
        ? li.parts.filter((p) => p.parts_item_no.trim())
        : [];
      if (activeParts.length > 0) {
        for (const part of activeParts) {
          expandedNewCustom.push({
            title: part.parts_item_no,
            quantity: part.parts_qty,
            ...(part.parts_unit_price != null
              ? { originalUnitPrice: String(part.parts_unit_price) }
              : {}),
            ...(part.reason_code ? { returnReasonCode: part.reason_code } : {}),
            ...(li.title ? { itemNo: li.title } : {}),
            ...(li.lot_no ? { lotNo: li.lot_no } : {}),
            sku: part.parts_item_no,
            ...(part.touchup_color ? { touchupColor: part.touchup_color } : {}),
          });
        }
      } else {
        expandedNewCustom.push({
          title: li.title.trim(),
          quantity: li.quantity,
          ...(li.price ? { originalUnitPrice: li.price } : {}),
          ...(li.returnReasonCode
            ? { returnReasonCode: li.returnReasonCode }
            : {}),
          sku: li.title.trim(),
          ...(li.lot_no ? { lotNo: li.lot_no } : {}),
        });
      }
    }

    const sharedReasonCode = validNewCustom.find(
      (li) => li.reasonCode,
    )?.reasonCode;

    const lineItems: Array<{
      variantId?: string;
      title?: string;
      quantity: number;
      originalUnitPrice?: string;
      returnReasonCode?: string;
      sku?: string;
      lotNo?: string;
      itemNo?: string;
      touchupColor?: string;
    }> = [
      ...draftVariantItems.map((li) => ({
        variantId: li.variantId,
        quantity: li.pendingRemove ? 0 : li.quantity,
      })),
      ...draftNewItems
        .filter((li) => li.quantity > 0 && li.variantId)
        .map((li) => ({ variantId: li.variantId, quantity: li.quantity })),
      // Send all existing custom items so backend replaces them (removed ones use qty=0)
      ...draftCustomItems.map((li) => ({
        title: li.title,
        quantity: li.pendingRemove ? 0 : li.quantity,
        ...(li.price ? { originalUnitPrice: li.price } : {}),
      })),
      ...expandedNewCustom,
    ];

    if (lineItems.length === 0) {
      toast.error("No line item changes to save.");
      return;
    }

    const result = await updateDraftOrder({
      draftOrderId: editDraftOrderId.trim(),
      store: selectedStore,
      lineItems,
      ...(sharedReasonCode
        ? {
            customAttributes: [{ key: "reason_code", value: sharedReasonCode }],
          }
        : {}),
      vendor,
    });

    if ("error" in result) {
      console.error("Failed to update draft line items:", result.error);
      toast.error("Failed to update line items. Check console for details.");
      return;
    }

    // Sync local state from the response so no re-fetch is needed
    const updatedEdges: any[] = result.data?.data?.lineItems?.edges ?? [];
    setDraftVariantItems(
      updatedEdges
        .filter((edge: any) => edge.node?.variant?.id)
        .map((edge: any, i: number) => ({
          key: `${edge.node.variant.id}_${i}`,
          variantId: edge.node.variant.id,
          title: edge.node.title ?? "",
          quantity: edge.node.quantity ?? 0,
          pendingRemove: false,
        })),
    );
    setDraftNewItems([]);
    setDraftNewCustomItems([]);
    toast.success("Draft order line items updated successfully!");
  };

  const handleEditLineItems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreOption) {
      toast.error("Please select a store first.");
      return;
    }
    if (!editOrderId.trim()) {
      toast.error("Please enter an Order ID");
      return;
    }
    const filledOperations = operations.filter((op) => {
      if (op.type === "addVariant") return op.variantId.trim() !== "";
      if (op.type === "setQuantity") return op.lineItemId.trim() !== "";
      if (op.type === "addDiscount")
        return op.lineItemId.trim() !== "" && op.discountValue.trim() !== "";
      if (op.type === "addCustomItem")
        return op.customTitle.trim() !== "" && op.customPrice.trim() !== "";
      return false;
    });
    const ops = filledOperations.map((op) => {
      const base: any = { type: op.type };
      if (op.type === "addVariant") {
        base.variantId = op.variantId;
        base.quantity = op.quantity;
        if (op.allowDuplicates) base.allowDuplicates = true;
      } else if (op.type === "setQuantity") {
        base.lineItemId = op.lineItemId;
        base.quantity = op.quantity;
        if (op.restock) base.restock = true;
      } else if (op.type === "addDiscount") {
        base.lineItemId = op.lineItemId;
        const disc: any = {};
        if (op.discountDescription.trim())
          disc.description = op.discountDescription.trim();
        if (op.discountType === "percent") {
          disc.percentValue = parseFloat(op.discountValue);
        } else {
          disc.fixedValue = {
            amount: parseFloat(op.discountValue),
            currencyCode: op.discountCurrencyCode,
          };
        }
        base.discount = disc;
      } else if (op.type === "addCustomItem") {
        base.customTitle = op.customTitle;
        base.customPrice = parseFloat(op.customPrice);
        base.customCurrencyCode = op.customCurrencyCode || "USD";
        base.quantity = op.quantity;
        if (op.reasonCode) base.reasonCode = op.reasonCode;
        if (op.returnReasonCode) base.returnReasonCode = op.returnReasonCode;
      }
      return base;
    });
    // Silently append setQuantity→0 for each item marked for removal
    const removalOps = Array.from(removedLineItemIds).map((lineItemId) => ({
      type: "setQuantity",
      lineItemId,
      quantity: 0,
    }));
    const allOps = [...ops, ...removalOps];
    if (allOps.length === 0) {
      toast.error("No operations to apply.");
      return;
    }
    try {
      await editOrderMutation({
        orderId: editOrderId.trim(),
        store: selectedStore,
        operations: allOps,
        notifyCustomer,
        staffNote: staffNote.trim() || undefined,
        vendor,
      }).unwrap();
      setRemovedLineItemIds(new Set());
      setOperations([newOperation()]);
      refetchLineItems();
      toast.success("Order edited successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreOption) {
      toast.error("Please select a store first.");
      return;
    }
    if (!editOrderId.trim()) {
      toast.error("Please select an order first.");
      return;
    }
    if (!cancelConfirmed) {
      toast.error("Please check the confirmation box before cancelling.");
      return;
    }
    try {
      await cancelOrderMutation({
        orderId: editOrderId.trim(),
        store: selectedStore,
        reason: cancelReason,
        staffNote: cancelStaffNote.trim() || undefined,
      }).unwrap();
      setCancelConfirmed(false);
      setCancelStaffNote("");
      setCancelNoteCategory("");
      setCancelNoteReason("");
      toast.success("Order cancelled successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  // ── Shared address fields renderer ────────────────────────────────────────
  const addr = form.shippingAddress;

  const renderEditAddressFields = (
    addrState: typeof editAddr,
    onChange: (field: keyof Address, val: string) => void,
  ) => (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
    >
      {(
        [
          {
            field: "firstName",
            label: "First Name",
            placeholder: "e.g., John",
          },
          { field: "lastName", label: "Last Name", placeholder: "e.g., Doe" },
          {
            field: "address1",
            label: "Address Line 1",
            placeholder: "e.g., 123 Main St",
          },
          {
            field: "address2",
            label: "Address Line 2",
            placeholder: "Apt, suite, etc.",
          },
          { field: "city", label: "City", placeholder: "e.g., New York" },
          {
            field: "zip",
            label: "ZIP / Postal Code",
            placeholder: "e.g., 10001",
          },
          {
            field: "provinceCode",
            label: "Province / State Code",
            placeholder: "e.g., NY",
          },
          {
            field: "countryCode",
            label: "Country Code",
            placeholder: "e.g., US",
          },
          {
            field: "company",
            label: "Company",
            placeholder: "e.g., Acme Inc.",
          },
          {
            field: "phone",
            label: "Phone",
            placeholder: "e.g., +1 555 000 0000",
          },
        ] as { field: keyof Address; label: string; placeholder: string }[]
      ).map(({ field, label, placeholder }) => (
        <div key={field} style={fieldWrap}>
          <label style={labelStyle}>{label}</label>
          <input
            style={inputStyle}
            placeholder={placeholder}
            value={(addrState as any)[field] ?? ""}
            onChange={(e) => onChange(field, e.target.value)}
          />
        </div>
      ))}
    </div>
  );

  // ── Shared Order ID + Store search / eligibility banner (Edit & Cancel) ────
  const renderEditOrderSearchHeader = () => (
    <>
      {/* Order ID + Store */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        <div style={{ ...fieldWrap, order: isCancelMode ? 2 : 1 }}>
          <label style={labelStyle}>Order ID *</label>
          <>
            <Autocomplete
              options={editOrderSuggestions}
              loading={isEditOrderSearching}
              getOptionLabel={(o: any) =>
                o.name || o.id?.split("/").pop() || ""
              }
              isOptionEqualToValue={(o: any, v: any) => o.id === v.id}
              filterOptions={(x) => x}
              value={editSelectedOrder}
              inputValue={editSearchInput}
              onInputChange={(_, val, reason) => {
                if (reason === "input") {
                  setEditSearchInput(val);
                  if (editSearchDebounceRef.current)
                    clearTimeout(editSearchDebounceRef.current);
                  editSearchDebounceRef.current = setTimeout(() => {
                    setEditSearchFilter(buildShopifyQuery(val));
                  }, 400);
                }
              }}
              onChange={(_, selected) => {
                setEditSelectedOrder(selected);
                if (selected) {
                  handleSelectEditOrder(selected, false);
                } else {
                  setEditOrderId("");
                  setLoadLineItemsOrderId("");
                  setEditSearchInput("");
                  setEditSearchFilter(undefined);
                  setEditEmail("");
                  setEditTags("");
                  setEditAddr({ ...defaultAddress });
                  setRemovedLineItemIds(new Set());
                  setOperations([newOperation()]);
                  resetEditOrder();
                }
              }}
              renderOption={(props, option: any) => {
                const { key, ...liProps } = props as any;
                const numericId = option.id?.split("/").pop() || "";
                return (
                  <li key={key} {...liProps} style={{ padding: "6px 12px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "nowrap",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: "#4f46e5",
                          fontSize: "12px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {option.name}
                      </span>
                      <span
                        style={{
                          color: "#9ca3af",
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        #{numericId}
                      </span>
                      {option.email && (
                        <span
                          style={{
                            color: "#6b7280",
                            fontSize: "11px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {option.email}
                        </span>
                      )}
                      {option.shippingAddress?.firstName && (
                        <span
                          style={{
                            color: "#9ca3af",
                            fontSize: "11px",
                            whiteSpace: "nowrap",
                            marginLeft: "auto",
                          }}
                        >
                          {option.shippingAddress.firstName}{" "}
                          {option.shippingAddress.lastName}
                        </span>
                      )}
                    </div>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search by order # or email…"
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "8px",
                      fontSize: "14px",
                      "& fieldset": {
                        borderColor: editOrderId ? "#6366f1" : "#e5e7eb",
                      },
                    },
                  }}
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {isEditOrderSearching && (
                            <CircularProgress color="inherit" size={14} />
                          )}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
            />
            <span
              style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}
            >
              {isCancelMode
                ? "Search by order # or email — cancellation eligibility is then looked up in WISMO"
                : "Type order # (e.g. 1001) or email to search"}
            </span>
          </>
        </div>
        <div style={{ ...fieldWrap, order: isCancelMode ? 1 : 2 }}>
          <label style={labelStyle}>Store *</label>
          <StoreDropdown
            selectedLabel={selectedStoreOption?.label ?? ""}
            onChange={(opt) => setSelectedStoreOption(opt)}
            options={isCancelMode ? CANCEL_STORE_OPTIONS : STORE_OPTIONS}
          />
        </div>
      </div>

      {/* ── Edit/cancel eligibility banner ── */}
      {editOrderId.trim() && (
        <div style={{ marginBottom: "20px" }}>
          {isCheckingActiveEligibility ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "8px",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                fontSize: "13px",
                color: "#6b7280",
              }}
            >
              <CircularProgress size={13} />
              {isCancelMode
                ? "Checking cancellation eligibility in WISMO…"
                : "Checking edit eligibility…"}
            </div>
          ) : activeEligibility && !activeEligibility.canEdit ? (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                fontSize: "13px",
                color: "#dc2626",
                fontWeight: 500,
              }}
            >
              <div>{activeEligibility.reason}</div>
              {isCancelMode &&
                (cancelEligibility?.wismo && cancelEligibility.wismo.length > 0 ? (
                  <div
                    style={{
                      marginTop: "6px",
                      fontWeight: 400,
                      color: "#991b1b",
                    }}
                  >
                    WISMO status:
                    {cancelEligibility.wismo.map((row, i) => (
                      <div key={i}>
                        order status: {row.order_status ?? "—"} · location code:{" "}
                        {row.location_code ?? "—"} · Whse Shipment No:{" "}
                        {row.Whse_Shipment_No ?? "—"} · WH status:{" "}
                        {row.WH_Status ?? "—"}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: "6px",
                      fontWeight: 400,
                      color: "#991b1b",
                    }}
                  >
                    No WISMO record found for this order
                  </div>
                ))}
            </div>
          ) : isCancelMode && activeEligibility?.canEdit ? (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                background:
                  (activeEligibility.remainingMinutes ?? 90) < 10
                    ? "#fffbeb"
                    : "#f0fdf4",
                border: `1px solid ${(activeEligibility.remainingMinutes ?? 90) < 10 ? "#fde68a" : "#86efac"}`,
                fontSize: "13px",
                color:
                  (activeEligibility.remainingMinutes ?? 90) < 10
                    ? "#b45309"
                    : "#15803d",
                fontWeight: 500,
              }}
            >
              <div>
                {activeEligibility.remainingMinutes !== null
                  ? (activeEligibility.remainingMinutes ?? 90) < 10
                    ? `Cancellation window closing — ${activeEligibility.remainingMinutes} min remaining`
                    : `Order can be cancelled — ${activeEligibility.remainingMinutes} min remaining`
                  : "Order can be cancelled"}
              </div>
              {cancelEligibility?.wismo &&
              cancelEligibility.wismo.length > 0 ? (
                <div
                  style={{
                    marginTop: "6px",
                    fontWeight: 400,
                    color: "#166534",
                  }}
                >
                  {cancelEligibility.wismo.map((row, i) => (
                    <div key={i}>
                      order status: {row.order_status ?? "—"} · location code:{" "}
                      {row.location_code ?? "—"} · Whse Shipment No:{" "}
                      {row.Whse_Shipment_No ?? "—"} · WH status:{" "}
                      {row.WH_Status ?? "—"}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    marginTop: "6px",
                    fontWeight: 400,
                    color: "#166534",
                  }}
                >
                  No WISMO record found for this order yet
                </div>
              )}
            </div>
          ) : activeEligibility?.canEdit &&
            activeEligibility.remainingMinutes !== null ? (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                background:
                  (activeEligibility.remainingMinutes ?? 90) < 10
                    ? "#fffbeb"
                    : "#f0fdf4",
                border: `1px solid ${(activeEligibility.remainingMinutes ?? 90) < 10 ? "#fde68a" : "#86efac"}`,
                fontSize: "13px",
                color:
                  (activeEligibility.remainingMinutes ?? 90) < 10
                    ? "#b45309"
                    : "#15803d",
                fontWeight: 500,
              }}
            >
              {(activeEligibility.remainingMinutes ?? 90) < 10
                ? `Editing window closing — ${activeEligibility.remainingMinutes} min remaining`
                : `Order editable — ${activeEligibility.remainingMinutes} min remaining`}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
  // ── Render ────────────────────────────────────────────────────────────────

  const modeConfig: Record<FormMode, { title: string; subtitle: string }> = {
    create: {
      title: "Create Order",
      subtitle: "Fill in the details to create a new Shopify order",
    },
    editOrder: {
      title: "Edit Order",
      subtitle: "Update details or edit line items on an existing order",
    },
    cancelOrder: {
      title: "Cancel Order",
      subtitle: "Cancel an existing order",
    },
    editDraft: {
      title: "Edit Draft Order",
      subtitle: "Update details on an existing draft order",
    },
    createProduct: {
      title: "Create Product",
      subtitle: "Create a new Shopify product with a variant",
    },
  };

  return (
    <div
      style={{
        background: "#fff",
        width: "100%",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          padding: "24px 28px 0",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.18)",
                borderRadius: "12px",
                padding: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  color: "#fff",
                  fontSize: "22px",
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {modeConfig[mode].title}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.78)",
                  fontSize: "13px",
                  marginTop: "2px",
                }}
              >
                {modeConfig[mode].subtitle}
              </div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.85)",
                cursor: "pointer",
                fontSize: "22px",
                lineHeight: 1,
                padding: "4px",
                borderRadius: "6px",
              }}
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* Mode Tabs */}
        <div style={{ display: "flex", gap: "4px" }}>
          {(
            [
              { key: "create", label: "Create Order" },
              { key: "cancelOrder", label: "Cancel Order" },

              // Hidden for now
              // { key: "editOrder", label: "Edit Order" },
              // { key: "editDraft", label: "Edit Draft" },
              // { key: "createProduct", label: "Create Product" },
            ] as { key: FormMode; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              style={{
                padding: "8px 18px",
                border: "none",
                borderRadius: "8px 8px 0 0",
                fontSize: "13px",
                fontWeight: mode === key ? 700 : 500,
                cursor: "pointer",
                background: mode === key ? "#fff" : "rgba(255,255,255,0.15)",
                color: mode === key ? "#4f46e5" : "rgba(255,255,255,0.85)",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          CREATE ORDER MODE
      ════════════════════════════════════════════════ */}
      {mode === "create" && (
        <form onSubmit={handleSubmit} style={{ padding: "28px" }}>
          {/* Order Search */}
          <div style={{ marginBottom: "24px" }} ref={orderSearchRef}>
            <label style={labelStyle}>Import from Existing Order</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={orderSearchInput}
                  onChange={handleOrderSearchChange}
                  onFocus={() => orderSearchInput && setShowOrderDropdown(true)}
                  placeholder="Search by Order ID to auto-fill fields..."
                  style={{
                    ...inputStyle,
                    paddingLeft: "40px",
                    border: showOrderDropdown
                      ? "1.5px solid #6366f1"
                      : "1.5px solid #e5e7eb",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: "13px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    display: "flex",
                  }}
                >
                  {isOrderSearching ? (
                    <CircularProgress size={16} />
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  )}
                </span>
              </div>
              {showOrderDropdown && orderSuggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    background: "#fff",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "10px",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                    zIndex: 999,
                    maxHeight: "220px",
                    overflowY: "auto",
                    padding: "6px",
                  }}
                >
                  {/* Deduplicate by order_id — show one row per unique order */}
                  {Array.from(
                    new Map(
                      orderSuggestions.map((o: any) => [o.order_id, o]),
                    ).values(),
                  ).map((order: any) => (
                    <div
                      key={order.order_id}
                      onClick={() => handleSelectOrder(order)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: "#111827",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background =
                          "#f5f3ff";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background =
                          "transparent";
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "#4f46e5" }}>
                        #{order.order_id}
                      </span>
                      {order.customer_email && (
                        <span style={{ marginLeft: "10px", color: "#6b7280" }}>
                          {order.customer_email}
                        </span>
                      )}
                      {order.phone_no && (
                        <span
                          style={{
                            marginLeft: "10px",
                            color: "#9ca3af",
                            fontSize: "12px",
                          }}
                        >
                          {order.phone_no}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {showOrderDropdown &&
                !isOrderSearching &&
                orderSearchFilter &&
                orderSuggestions.length === 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: "1.5px solid #e5e7eb",
                      borderRadius: "10px",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                      zIndex: 999,
                      padding: "14px 16px",
                      fontSize: "13px",
                      color: "#9ca3af",
                      textAlign: "center",
                    }}
                  >
                    No orders found
                  </div>
                )}
            </div>
          </div>

          {/* Store + Email */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            <div style={fieldWrap}>
              <label style={labelStyle}>Store *</label>
              <StoreDropdown
                selectedLabel={selectedStoreOption?.label ?? ""}
                onChange={(opt) => setSelectedStoreOption(opt)}
                options={STORE_OPTIONS}
              />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Customer Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="e.g., customer@email.com"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Reason Code + Wash Whole Unit */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "16px",
              alignItems: "end",
              marginBottom: "20px",
            }}
          >
            <div style={fieldWrap}>
              <label style={labelStyle}>Reason Code</label>
              <SearchableDropdown
                value={selectedReasonCode}
                onChange={setSelectedReasonCode}
                options={reasonCodeOptions}
                placeholder="— select reason code —"
              />
              {selectedReasonCode &&
                `cxi-rc_${selectedReasonCode}`.length > 40 && (
                  <span
                    style={{
                      fontSize: "11px",
                      marginTop: "3px",
                      color: "#dc2626",
                    }}
                  >
                    Tag limit exceeded: "cxi-rc_{selectedReasonCode}" is{" "}
                    {`cxi-rc_${selectedReasonCode}`.length} characters (max 40).
                  </span>
                )}
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>
                Zendesk Ticket #{" "}
                {/* <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                  (order level)
                </span> */}
              </label>
              <input
                style={inputStyle}
                type="text"
                placeholder="zendesk_"
                value={selectedExternalDocInfo}
                onChange={(e) => setSelectedExternalDocInfo(e.target.value)}
              />
              {`zendesk_${selectedExternalDocInfo}`.length > 40 && (
                <span
                  style={{
                    fontSize: "11px",
                    marginTop: "3px",
                    color: "#dc2626",
                  }}
                >
                  Tag limit exceeded: "zendesk_{selectedExternalDocInfo}" is{" "}
                  {`zendesk_${selectedExternalDocInfo}`.length} characters (max
                  40).
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                paddingBottom: "2px",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => {
                setWashWholeUnit((p) => {
                  const next = !p;
                  if (next) {
                    setForm((prev) => ({
                      ...prev,
                      lineItems: prev.lineItems.map((item) => ({
                        ...item,
                        parts: [],
                      })),
                    }));
                  }
                  return next;
                });
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "4px",
                  border: `2px solid ${washWholeUnit ? "#6366f1" : "#d1d5db"}`,
                  background: washWholeUnit ? "#6366f1" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >
                {washWholeUnit && (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#374151",
                  whiteSpace: "nowrap",
                }}
              >
                Wash Whole Unit
              </span>
            </div>
          </div>

          {/* Line Items */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ ...labelStyle, marginBottom: "10px" }}>
              Line Items *
            </label>

            {/* Dropdown to pick a line item from the selected order */}
            {availableLineItems.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10);
                    if (!isNaN(idx)) {
                      handleAddLineItemFromDropdown(availableLineItems[idx]);
                      e.target.value = "";
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1.5px solid #a5b4fc",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#374151",
                    background: "#f5f3ff",
                    cursor: "pointer",
                  }}
                >
                  <option value="" disabled>
                    — select line item to add —
                  </option>
                  {availableLineItems.map((row, i) => (
                    <option key={i} value={i}>
                      {[row.item_no, row.lot_no].filter(Boolean).join(" / ")}
                      {row.description ? ` — ${row.description}` : ""}
                      {row.quantity != null ? ` — Qty: ${row.quantity}` : ""}
                      {row.unit_price != null ? ` — $${row.unit_price}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.lineItems.map((item, index) => (
              <div
                key={index}
                style={{
                  border: "1.5px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  marginBottom: "10px",
                  background: "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                }}
              >
                {/* Row header: line number badge + remove */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#6366f1",
                      background: "#ede9fe",
                      borderRadius: "4px",
                      padding: "2px 8px",
                    }}
                  >
                    Line {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLineItemProductIds((prev) =>
                        prev.filter((_, i) => i !== index),
                      );
                      setForm((prev) => ({
                        ...prev,
                        lineItems: prev.lineItems.filter((_, i) => i !== index),
                      }));
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#ef4444",
                      fontSize: "18px",
                      lineHeight: 1,
                      padding: "0 2px",
                    }}
                    title="Remove line item"
                  >
                    ×
                  </button>
                </div>

                {/* Product + Variant selectors */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: productHasVariantChoice(
                      lineItemProductIds[index],
                    )
                      ? "1fr 1fr"
                      : "1fr",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  {/* <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#6b7280",
                      }}
                    >
                      Product
                    </span>
                    <select
                      value={lineItemProductIds[index] ?? ""}
                      onChange={(e) => {
                        const productId = e.target.value || null;
                        setLineItemProductIds((prev) => {
                          const next = [...prev];
                          next[index] = productId;
                          return next;
                        });
                        if (productId && products) {
                          const product = products.find(
                            (p) => p.id === productId,
                          );
                          if (product) {
                            const variants = product.variants.edges;
                            const autoVariant =
                              variants.length === 1 ||
                              variants[0]?.node.title === "Default Title"
                                ? (variants[0]?.node.id ?? "")
                                : "";
                            handleLineItemChange(
                              index,
                              "variantId",
                              autoVariant,
                            );
                          }
                        } else {
                          handleLineItemChange(index, "variantId", "");
                        }
                      }}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      <option value="">— select product —</option>
                      {(products ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div> */}

                  {productHasVariantChoice(lineItemProductIds[index]) && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#6b7280",
                        }}
                      >
                        Variant
                      </span>
                      <select
                        value={item.variantId}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            "variantId",
                            e.target.value,
                          )
                        }
                        style={{ ...inputStyle, cursor: "pointer" }}
                      >
                        <option value="">— select variant —</option>
                        {getProductVariants(lineItemProductIds[index]).map(
                          (v) => (
                            <option key={v.id} value={v.id}>
                              {v.title}
                              {v.sku ? ` (${v.sku})` : ""} · ${v.price}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  )}
                </div>

                {/* Description — full width */}
                {item.description && (
                  <div style={{ marginBottom: "10px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#6b7280",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Description
                    </span>
                    <div
                      style={{
                        padding: "8px 12px",
                        border: "1.5px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "13px",
                        color: "#111827",
                        background: "#f9fafb",
                      }}
                    >
                      {item.description}
                    </div>
                  </div>
                )}

                {/* Info fields + Quantity: single row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr) 90px",
                    gap: "10px",
                  }}
                >
                  {item.item_no || item.lot_no ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#6b7280",
                          }}
                        >
                          Item No
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "8px 12px",
                            border: "1.5px solid #e5e7eb",
                            borderRadius: "8px",
                            fontSize: "13px",
                            color: item.item_no ? "#111827" : "#9ca3af",
                            background: "#f9fafb",
                            gap: "6px",
                          }}
                        >
                          <span style={{ flex: 1 }}>{item.item_no || "—"}</span>
                          {!item.isExistingOrderLine && (
                            <button
                              type="button"
                              onClick={() =>
                                setForm((prev) => {
                                  const updated = [...prev.lineItems];
                                  updated[index] = {
                                    ...updated[index],
                                    item_no: undefined,
                                    lot_no: null,
                                    unit_price: null,
                                  };
                                  return { ...prev, lineItems: updated };
                                })
                              }
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#9ca3af",
                                fontSize: "14px",
                                lineHeight: 1,
                                padding: 0,
                              }}
                              title="Clear item / lot"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#6b7280",
                          }}
                        >
                          Lot No
                        </span>
                        <div
                          style={{
                            padding: "8px 12px",
                            border: "1.5px solid #e5e7eb",
                            borderRadius: "8px",
                            fontSize: "13px",
                            color: item.lot_no ? "#111827" : "#9ca3af",
                            background: "#f9fafb",
                          }}
                        >
                          {item.lot_no || "—"}
                        </div>
                      </div>
                    </>
                  ) : (
                    <LineItemSearchFields
                      onPopulate={({ item_no, lot_no, unit_price }) => {
                        setForm((prev) => {
                          const newLineItems = [...prev.lineItems];
                          newLineItems[index] = {
                            ...newLineItems[index],
                            item_no,
                            lot_no,
                            unit_price: unit_price ?? null,
                            quantity: 1,
                          };
                          return { ...prev, lineItems: newLineItems };
                        });
                      }}
                    />
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#6b7280",
                      }}
                    >
                      Unit Price
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unit_price ?? ""}
                      disabled={washWholeUnit}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        handleLineItemChange(
                          index,
                          "unit_price",
                          isNaN(v) ? null : v,
                        );
                      }}
                      placeholder="0.00"
                      style={{
                        ...inputStyle,
                        fontSize: "13px",
                        padding: "8px 12px",
                        ...(washWholeUnit
                          ? {
                              background: "#f3f4f6",
                              color: "#9ca3af",
                              cursor: "not-allowed",
                            }
                          : item.unit_price == null ||
                              Number(item.unit_price) === 0
                            ? {
                                border: "1.5px solid #f59e0b",
                                background: "#fffbeb",
                              }
                            : {}),
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#6b7280",
                      }}
                    >
                      Line Amount
                    </span>
                    <div
                      style={{
                        padding: "8px 12px",
                        border: "1.5px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "13px",
                        color: item.unit_price != null ? "#047857" : "#9ca3af",
                        background:
                          item.unit_price != null ? "#f0fdf4" : "#f9fafb",
                        fontWeight: item.unit_price != null ? 600 : 400,
                      }}
                    >
                      {item.unit_price != null
                        ? `$${(Number(item.unit_price) * item.quantity).toFixed(2)}`
                        : "—"}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#6b7280",
                      }}
                    >
                      Qty
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={item.quantity}
                      disabled={washWholeUnit}
                      onKeyDown={(e) => {
                        if (/^[0-9]$/.test(e.key))
                          (e.target as HTMLInputElement).select();
                      }}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10);
                        if (isNaN(parsed)) return;
                        const clamped = Math.min(5, Math.max(1, parsed));
                        handleLineItemChange(index, "quantity", clamped);
                      }}
                      required
                      placeholder="Qty"
                      style={{
                        ...inputStyle,
                        ...(washWholeUnit
                          ? {
                              background: "#f3f4f6",
                              color: "#9ca3af",
                              cursor: "not-allowed",
                            }
                          : {}),
                      }}
                    />
                  </div>
                </div>

                {/* Return Reason Code — only on line item when it has no parts */}
                {(!item.parts || item.parts.length === 0) && (
                  <div style={{ marginTop: "10px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#6b7280",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Return Reason Code
                    </span>
                    <SearchableDropdown
                      value={item.reason_code ?? ""}
                      onChange={(val) =>
                        handleLineItemChange(
                          index,
                          "reason_code",
                          val || undefined,
                        )
                      }
                      options={lineReasonCodeOptions}
                      placeholder="— select return reason code —"
                    />
                  </div>
                )}

                <PartsSubSection
                  item_no={item.item_no}
                  lot_no={item.lot_no}
                  parts={item.parts ?? []}
                  onChange={(parts) =>
                    handleLineItemChange(index, "parts", parts)
                  }
                  unitPriceLocked={washWholeUnit}
                  reasonCodeOptions={lineReasonCodeOptions}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addLineItem}
              style={{
                padding: "8px 16px",
                border: "1.5px dashed #a5b4fc",
                borderRadius: "8px",
                background: "#f5f3ff",
                color: "#4f46e5",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              + Add Line Item
            </button>
          </div>

          {/* Shipping Address */}
          <div
            style={{
              borderTop: "1px solid #f3f4f6",
              paddingTop: "20px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "16px",
              }}
            >
              Shipping Address
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div style={fieldWrap}>
                <label style={labelStyle}>First Name *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g., John"
                  value={addr.firstName}
                  required
                  onChange={(e) =>
                    handleAddressChange(
                      "shippingAddress",
                      "firstName",
                      e.target.value,
                    )
                  }
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Last Name *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g., Doe"
                  value={addr.lastName}
                  required
                  onChange={(e) =>
                    handleAddressChange(
                      "shippingAddress",
                      "lastName",
                      e.target.value,
                    )
                  }
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Address Line 1 *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g., 123 Main St"
                  value={addr.address1}
                  required
                  onChange={(e) =>
                    handleAddressChange(
                      "shippingAddress",
                      "address1",
                      e.target.value,
                    )
                  }
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Address Line 2</label>
                <input
                  style={inputStyle}
                  placeholder="Apt, suite, etc."
                  value={addr.address2}
                  onChange={(e) =>
                    handleAddressChange(
                      "shippingAddress",
                      "address2",
                      e.target.value,
                    )
                  }
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>City *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g., New York"
                  value={addr.city}
                  required
                  onChange={(e) =>
                    handleAddressChange(
                      "shippingAddress",
                      "city",
                      e.target.value,
                    )
                  }
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>ZIP / Postal Code *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g., 10001"
                  value={addr.zip}
                  required
                  onChange={(e) => handleShippingZipChange(e.target.value)}
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Province / State Code *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g., NY"
                  value={addr.provinceCode}
                  required
                  onChange={(e) =>
                    handleAddressChange(
                      "shippingAddress",
                      "provinceCode",
                      e.target.value,
                    )
                  }
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Country Code *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g., US"
                  value={addr.countryCode}
                  required
                  onChange={(e) =>
                    handleAddressChange(
                      "shippingAddress",
                      "countryCode",
                      e.target.value,
                    )
                  }
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Company</label>
                <input
                  style={inputStyle}
                  placeholder="e.g., Acme Inc."
                  value={addr.company}
                  onChange={(e) =>
                    handleAddressChange(
                      "shippingAddress",
                      "company",
                      e.target.value,
                    )
                  }
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Phone</label>
                <input
                  style={inputStyle}
                  placeholder="e.g., +1 555 000 0000"
                  value={addr.phone}
                  onChange={(e) =>
                    handleAddressChange(
                      "shippingAddress",
                      "phone",
                      e.target.value,
                    )
                  }
                />
              </div>
            </div>
          </div>

          <ResultBox
            data={data}
            error={error}
            adminUrl={
              data?.data?.id && selectedStoreOption?.handle
                ? `https://admin.shopify.com/store/${selectedStoreOption?.handle}/orders/${data.data.id.split("/").pop()}`
                : undefined
            }
          />
          <ResultBox
            data={draftData}
            error={draftError}
            successColor="#0369a1"
            successBg="#f0f9ff"
            adminUrl={
              draftData?.data?.id && selectedStoreOption?.handle
                ? `https://admin.shopify.com/store/${selectedStoreOption?.handle}/draft_orders/${draftData.data.id.split("/").pop()}`
                : undefined
            }
          />

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #f3f4f6",
              paddingTop: "20px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 24px",
                border: "1.5px solid #d1d5db",
                borderRadius: "8px",
                background: "#fff",
                color: "#374151",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="submit"
                disabled={isLoading || isDraftLoading}
                style={{
                  padding: "10px 28px",
                  border: "none",
                  borderRadius: "8px",
                  background:
                    isLoading || isDraftLoading
                      ? "#a5b4fc"
                      : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  color: "#fff",
                  cursor:
                    isLoading || isDraftLoading ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                {isLoading || isDraftLoading
                  ? "Submitting..."
                  : "+ Create Draft Order"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ════════════════════════════════════════════════
          EDIT ORDER MODE
      ════════════════════════════════════════════════ */}
      {mode === "editOrder" && (
        <div style={{ padding: "28px" }}>
          {/* Order ID + Store */}
          {renderEditOrderSearchHeader()}

          {/* Sub-tabs */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              borderBottom: "2px solid #f3f4f6",
              marginBottom: "24px",
            }}
          >
            {(
              [
                { key: "details", label: "Update Details" },
                { key: "lineItems", label: "Edit Line Items" },
                { key: "cancel", label: "Cancel Order" },
              ] as { key: EditSubTab; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setEditSubTab(key)}
                style={{
                  padding: "8px 18px",
                  border: "none",
                  borderBottom:
                    editSubTab === key
                      ? "2px solid #4f46e5"
                      : "2px solid transparent",
                  marginBottom: "-2px",
                  background: "none",
                  fontSize: "13px",
                  fontWeight: editSubTab === key ? 700 : 500,
                  color: editSubTab === key ? "#4f46e5" : "#6b7280",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Update Details sub-tab ── */}
          {editSubTab === "details" && (
            <form onSubmit={handleUpdateOrder}>
              <div style={{ ...fieldWrap, marginBottom: "20px" }}>
                <label style={labelStyle}>
                  Email{" "}
                  <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                    (optional)
                  </span>
                </label>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="New email address"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>

              <div style={{ ...fieldWrap, marginBottom: "20px" }}>
                <label style={labelStyle}>
                  Tags{" "}
                  <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                    (optional, comma-separated)
                  </span>
                </label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="e.g. wholesale, priority, vip"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                />
                {editTags
                  .split(",")
                  .map((t) => t.trim())
                  .filter((t) => t.length > 40)
                  .map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: "11px",
                        marginTop: "3px",
                        color: "#dc2626",
                        display: "block",
                      }}
                    >
                      Tag limit exceeded: "{t}" is {t.length} characters (max
                      40).
                    </span>
                  ))}
              </div>

              {/* Custom Attributes */}
              {/* <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <label style={labelStyle}>
                    Custom Attributes{" "}
                    <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                      (optional)
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={addCustomAttr}
                    style={{
                      padding: "5px 12px",
                      border: "1.5px dashed #a5b4fc",
                      borderRadius: "6px",
                      background: "#f5f3ff",
                      color: "#4f46e5",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    + Add
                  </button>
                </div>
                {customAttrs.length === 0 && (
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#9ca3af",
                      padding: "10px 0",
                    }}
                  >
                    No attributes added yet.
                  </div>
                )}
                {customAttrs.map((attr, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr auto",
                      gap: "10px",
                      marginBottom: "8px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      style={inputStyle}
                      placeholder="Key"
                      value={attr.key}
                      onChange={(e) =>
                        updateCustomAttr(i, "key", e.target.value)
                      }
                    />
                    <input
                      style={inputStyle}
                      placeholder="Value"
                      value={attr.value}
                      onChange={(e) =>
                        updateCustomAttr(i, "value", e.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomAttr(i)}
                      style={{
                        padding: "8px 12px",
                        border: "1.5px solid #fca5a5",
                        borderRadius: "8px",
                        background: "#fff",
                        color: "#dc2626",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div> */}

              {/* Shipping Address */}
              <div
                style={{
                  // borderTop: "1px solid #f3f4f6",
                  paddingTop: "20px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "16px",
                  }}
                >
                  Shipping Address{" "}
                  <span
                    style={{
                      textTransform: "none",
                      fontWeight: 400,
                      color: "#9ca3af",
                    }}
                  >
                    (fill only fields to change)
                  </span>
                </div>
                {renderEditAddressFields(editAddr, (field, val) =>
                  setEditAddr((p) => ({ ...p, [field]: val })),
                )}
              </div>

              <ResultBox
                data={updateData}
                error={updateError}
                adminUrl={
                  updateData?.data?.id && selectedStoreOption?.handle
                    ? `https://admin.shopify.com/store/${selectedStoreOption?.handle}/orders/${updateData.data.id.split("/").pop()}`
                    : undefined
                }
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  borderTop: "1px solid #f3f4f6",
                  paddingTop: "20px",
                }}
              >
                <button
                  type="submit"
                  disabled={
                    isUpdating ||
                    isCheckingEligibility ||
                    editEligibility?.canEdit === false
                  }
                  title={
                    editEligibility?.canEdit === false
                      ? (editEligibility.reason ?? undefined)
                      : undefined
                  }
                  style={{
                    padding: "10px 28px",
                    border: "none",
                    borderRadius: "8px",
                    background:
                      isUpdating ||
                      isCheckingEligibility ||
                      editEligibility?.canEdit === false
                        ? "#a5b4fc"
                        : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    color: "#fff",
                    cursor:
                      isUpdating ||
                      isCheckingEligibility ||
                      editEligibility?.canEdit === false
                        ? "not-allowed"
                        : "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* ── Edit Line Items sub-tab ── */}
          {editSubTab === "lineItems" && (
            <form onSubmit={handleEditLineItems}>
              {/* Line items auto-load when order is selected */}
              {isLoadingLineItems && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "16px",
                    color: "#9ca3af",
                    fontSize: "13px",
                  }}
                >
                  <CircularProgress size={14} />
                  Loading line items…
                </div>
              )}
              {!editOrderId.trim() &&
                !isLoadingLineItems &&
                existingLineItems.length === 0 && (
                  <div
                    style={{
                      marginBottom: "16px",
                      fontSize: "13px",
                      color: "#9ca3af",
                    }}
                  >
                    Select an order above to load its line items.
                  </div>
                )}

              {existingLineItems.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "10px",
                    }}
                  >
                    Loaded Line Items — click × to remove
                  </div>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {existingLineItems.map((item) => {
                      const pendingRemove = removedLineItemIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "7px 10px 7px 12px",
                            borderRadius: "8px",
                            border: `1.5px solid ${pendingRemove ? "#fca5a5" : "#e5e7eb"}`,
                            background: pendingRemove ? "#fff7f7" : "#fafafa",
                            fontSize: "13px",
                            opacity: pendingRemove ? 0.7 : 1,
                          }}
                        >
                          <div>
                            <span
                              style={{
                                fontWeight: 600,
                                color: pendingRemove ? "#dc2626" : "#111827",
                                textDecoration: pendingRemove
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {item.title}
                            </span>
                            {item.sku && (
                              <span
                                style={{
                                  marginLeft: "6px",
                                  color: "#9ca3af",
                                  fontSize: "11px",
                                }}
                              >
                                SKU: {item.sku}
                              </span>
                            )}
                            <span
                              style={{
                                marginLeft: "8px",
                                color: "#6b7280",
                                fontSize: "12px",
                              }}
                            >
                              × {item.quantity}
                            </span>
                          </div>
                          <button
                            type="button"
                            title={
                              pendingRemove ? "Undo removal" : "Remove item"
                            }
                            onClick={() => {
                              setRemovedLineItemIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.id)) next.delete(item.id);
                                else next.add(item.id);
                                return next;
                              });
                            }}
                            style={{
                              width: "20px",
                              height: "20px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: `1px solid ${pendingRemove ? "#fca5a5" : "#d1d5db"}`,
                              borderRadius: "50%",
                              background: pendingRemove ? "#fee2e2" : "#f3f4f6",
                              color: pendingRemove ? "#dc2626" : "#6b7280",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: 700,
                              lineHeight: 1,
                              flexShrink: 0,
                            }}
                          >
                            {pendingRemove ? "↩" : "×"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <label style={labelStyle}>Operations</label>
                  <button
                    type="button"
                    onClick={addOperation}
                    style={{
                      padding: "5px 12px",
                      border: "1.5px dashed #a5b4fc",
                      borderRadius: "6px",
                      background: "#f5f3ff",
                      color: "#4f46e5",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    + Add Operation
                  </button>
                </div>

                {operations.map((op, idx) => (
                  <div
                    key={op.id}
                    style={{
                      border: "1.5px solid #e5e7eb",
                      borderRadius: "10px",
                      padding: "16px",
                      marginBottom: "12px",
                      background: "#fafafa",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "14px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#6b7280",
                        }}
                      >
                        Operation #{idx + 1}
                      </span>
                      {operations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOperation(op.id)}
                          style={{
                            padding: "4px 10px",
                            border: "1.5px solid #fca5a5",
                            borderRadius: "6px",
                            background: "#fff",
                            color: "#dc2626",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Type selector */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "180px 1fr",
                        gap: "12px",
                        alignItems: "start",
                      }}
                    >
                      <div style={fieldWrap}>
                        <label style={labelStyle}>Type</label>
                        <CustomDropdown
                          value={op.type}
                          onChange={(v) =>
                            updateOperation(op.id, { type: v as OpType })
                          }
                          options={[
                            { value: "addVariant", label: "Add Variant" },
                            { value: "setQuantity", label: "Set Quantity" },
                            { value: "addDiscount", label: "Add Discount" },
                            {
                              value: "addCustomItem",
                              label: "Add Custom Item",
                            },
                          ]}
                        />
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(180px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        {/* addVariant fields */}
                        {op.type === "addVariant" && (
                          <>
                            <div style={fieldWrap}>
                              <label style={labelStyle}>Variant *</label>
                              <Autocomplete
                                options={variantOptions}
                                loading={productsLoading}
                                getOptionKey={(o) => o.variantId}
                                getOptionLabel={(o) => o.label}
                                isOptionEqualToValue={(o, v) =>
                                  o.variantId === v.variantId
                                }
                                value={
                                  variantOptions.find(
                                    (o) => o.variantId === op.variantId,
                                  ) ?? null
                                }
                                onChange={(_, sel) =>
                                  updateOperation(op.id, {
                                    variantId: sel?.variantId ?? "",
                                  })
                                }
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="Search variant..."
                                    size="small"
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        "& fieldset": {
                                          borderColor: "#e5e7eb",
                                        },
                                      },
                                    }}
                                    slotProps={{
                                      input: {
                                        ...params.InputProps,
                                        endAdornment: (
                                          <>
                                            {productsLoading && (
                                              <CircularProgress
                                                color="inherit"
                                                size={14}
                                              />
                                            )}
                                            {params.InputProps.endAdornment}
                                          </>
                                        ),
                                      },
                                    }}
                                  />
                                )}
                              />
                            </div>
                            <div style={fieldWrap}>
                              <label style={labelStyle}>Quantity *</label>
                              <input
                                type="number"
                                min={1}
                                value={op.quantity}
                                onChange={(e) =>
                                  updateOperation(op.id, {
                                    quantity: parseInt(e.target.value, 10) || 1,
                                  })
                                }
                                style={inputStyle}
                              />
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                paddingTop: "22px",
                              }}
                            >
                              <input
                                type="checkbox"
                                id={`dup-${op.id}`}
                                checked={op.allowDuplicates}
                                onChange={(e) =>
                                  updateOperation(op.id, {
                                    allowDuplicates: e.target.checked,
                                  })
                                }
                              />
                              <label
                                htmlFor={`dup-${op.id}`}
                                style={{ fontSize: "13px", color: "#374151" }}
                              >
                                Allow duplicates
                              </label>
                            </div>
                          </>
                        )}

                        {/* setQuantity fields */}
                        {op.type === "setQuantity" && (
                          <>
                            <div style={fieldWrap}>
                              <label style={labelStyle}>Line Item *</label>
                              {existingLineItems.length > 0 ? (
                                <CustomDropdown
                                  value={op.lineItemId}
                                  onChange={(v) =>
                                    updateOperation(op.id, { lineItemId: v })
                                  }
                                  placeholder="— select line item —"
                                  options={existingLineItems.map((li) => ({
                                    value: li.id,
                                    label: `${li.title}${li.sku ? ` (${li.sku})` : ""} · qty ${li.quantity}`,
                                  }))}
                                />
                              ) : (
                                <input
                                  style={inputStyle}
                                  placeholder="Load order first or paste LineItem ID"
                                  value={op.lineItemId}
                                  onChange={(e) =>
                                    updateOperation(op.id, {
                                      lineItemId: e.target.value,
                                    })
                                  }
                                />
                              )}
                            </div>
                            <div style={fieldWrap}>
                              <label style={labelStyle}>
                                New Quantity *{" "}
                                <span
                                  style={{ color: "#9ca3af", fontWeight: 400 }}
                                >
                                  (0 = remove)
                                </span>
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={op.quantity}
                                onChange={(e) =>
                                  updateOperation(op.id, {
                                    quantity: parseInt(e.target.value, 10) || 0,
                                  })
                                }
                                style={inputStyle}
                              />
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                paddingTop: "22px",
                              }}
                            >
                              <input
                                type="checkbox"
                                id={`restock-${op.id}`}
                                checked={op.restock}
                                onChange={(e) =>
                                  updateOperation(op.id, {
                                    restock: e.target.checked,
                                  })
                                }
                              />
                              <label
                                htmlFor={`restock-${op.id}`}
                                style={{ fontSize: "13px", color: "#374151" }}
                              >
                                Restock inventory
                              </label>
                            </div>
                          </>
                        )}

                        {/* addCustomItem fields */}
                        {op.type === "addCustomItem" && (
                          <CustomItemFields
                            op={op}
                            onUpdate={(updates) =>
                              updateOperation(op.id, updates)
                            }
                            reasonCodeOptions={reasonCodeOptions}
                            lineReasonCodeOptions={lineReasonCodeOptions}
                          />
                        )}

                        {/* addDiscount fields */}
                        {op.type === "addDiscount" && (
                          <>
                            <div style={fieldWrap}>
                              <label style={labelStyle}>Line Item *</label>
                              {existingLineItems.length > 0 ? (
                                <CustomDropdown
                                  value={op.lineItemId}
                                  onChange={(v) =>
                                    updateOperation(op.id, { lineItemId: v })
                                  }
                                  placeholder="— select line item —"
                                  options={existingLineItems.map((li) => ({
                                    value: li.id,
                                    label: `${li.title}${li.sku ? ` (${li.sku})` : ""} · qty ${li.quantity}`,
                                  }))}
                                />
                              ) : (
                                <input
                                  style={inputStyle}
                                  placeholder="Load order first or paste LineItem ID"
                                  value={op.lineItemId}
                                  onChange={(e) =>
                                    updateOperation(op.id, {
                                      lineItemId: e.target.value,
                                    })
                                  }
                                />
                              )}
                            </div>
                            <div style={fieldWrap}>
                              <label style={labelStyle}>Discount Type</label>
                              <CustomDropdown
                                value={op.discountType}
                                onChange={(v) =>
                                  updateOperation(op.id, {
                                    discountType: v as "percent" | "fixed",
                                  })
                                }
                                options={[
                                  { value: "percent", label: "Percentage" },
                                  { value: "fixed", label: "Fixed Amount" },
                                ]}
                              />
                            </div>
                            <div style={fieldWrap}>
                              <label style={labelStyle}>
                                {op.discountType === "percent"
                                  ? "Percent (0–100)"
                                  : "Amount"}{" "}
                                *
                              </label>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={op.discountValue}
                                onChange={(e) =>
                                  updateOperation(op.id, {
                                    discountValue: e.target.value,
                                  })
                                }
                                style={inputStyle}
                                placeholder={
                                  op.discountType === "percent"
                                    ? "e.g., 10"
                                    : "e.g., 5.00"
                                }
                              />
                            </div>
                            {op.discountType === "fixed" && (
                              <div style={fieldWrap}>
                                <label style={labelStyle}>Currency Code</label>
                                <input
                                  style={inputStyle}
                                  placeholder="USD"
                                  value={op.discountCurrencyCode}
                                  onChange={(e) =>
                                    updateOperation(op.id, {
                                      discountCurrencyCode: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            )}
                            <div style={fieldWrap}>
                              <label style={labelStyle}>Description</label>
                              <input
                                style={inputStyle}
                                placeholder="e.g., 10% off"
                                value={op.discountDescription}
                                onChange={(e) =>
                                  updateOperation(op.id, {
                                    discountDescription: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Commit options */}
              {/* <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "20px",
                  alignItems: "start",
                  marginBottom: "20px",
                  padding: "16px",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <input
                    type="checkbox"
                    id="notify"
                    checked={notifyCustomer}
                    onChange={(e) => setNotifyCustomer(e.target.checked)}
                  />
                  <label
                    htmlFor="notify"
                    style={{
                      fontSize: "13px",
                      color: "#374151",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Notify customer
                  </label>
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>
                    Staff Note{" "}
                    <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                      (optional)
                    </span>
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="Internal note for this edit..."
                    value={staffNote}
                    onChange={(e) => setStaffNote(e.target.value)}
                  />
                </div>
              </div> */}

              {/* <ResultBox data={editData} error={editError} /> */}
              {editError && (
                <div
                  style={{
                    marginBottom: "20px",
                    padding: "16px",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fca5a5",
                    borderRadius: "10px",
                    color: "#dc2626",
                    fontSize: "14px",
                  }}
                >
                  <strong>❌ Error editing order:</strong>
                  <br />
                  {typeof editError === "string"
                    ? editError
                    : JSON.stringify(editError, null, 2)}
                </div>
              )}

              {editData && (
                <div
                  style={{
                    marginBottom: "20px",
                    padding: "16px 20px",
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #86efac",
                    borderRadius: "10px",
                    color: "#166534",
                  }}
                >
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      marginBottom: "12px",
                    }}
                  >
                    ✅ Order edited and committed successfully!
                  </div>

                  {editData.order?.id && (
                    <a
                      href={`https://admin.shopify.com/store/${selectedStoreOption?.handle}/orders/${editData.order.id.split("/").pop()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#2563eb",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "14px",
                        padding: "8px 16px",
                        background: "#eff6ff",
                        borderRadius: "8px",
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      🔗 View Order in Shopify Admin
                      <span style={{ fontSize: "13px" }}>
                        #
                        {editData.order.name ||
                          editData.order.id.split("/").pop()}
                      </span>
                    </a>
                  )}

                  {editData.operations_applied &&
                    editData.operations_applied.length > 0 && (
                      <div
                        style={{
                          marginTop: "12px",
                          fontSize: "13px",
                          color: "#15803d",
                        }}
                      >
                        Operations applied: {editData.operations_applied.length}
                      </div>
                    )}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  borderTop: "1px solid #f3f4f6",
                  paddingTop: "20px",
                }}
              >
                <button
                  type="submit"
                  disabled={
                    isEditing ||
                    isCheckingEligibility ||
                    editEligibility?.canEdit === false
                  }
                  title={
                    editEligibility?.canEdit === false
                      ? (editEligibility.reason ?? undefined)
                      : undefined
                  }
                  style={{
                    padding: "10px 28px",
                    border: "none",
                    borderRadius: "8px",
                    background:
                      isEditing ||
                      isCheckingEligibility ||
                      editEligibility?.canEdit === false
                        ? "#a5b4fc"
                        : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    color: "#fff",
                    cursor:
                      isEditing ||
                      isCheckingEligibility ||
                      editEligibility?.canEdit === false
                        ? "not-allowed"
                        : "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  {isEditing ? "Applying..." : "Apply Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          CANCEL ORDER MODE
      ════════════════════════════════════════════════ */}
      {mode === "cancelOrder" && (
        <div style={{ padding: "28px" }}>
          {renderEditOrderSearchHeader()}
          <form onSubmit={handleCancelOrder}>
            {/* Reason */}
            <div style={{ ...fieldWrap, marginBottom: "20px" }}>
              <label style={labelStyle}>Cancellation Reason</label>
              <select
                style={{ ...inputStyle, background: "#fff" }}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                disabled={activeEligibility?.canEdit === false}
              >
                <option value="CUSTOMER">Customer</option>
                <option value="FRAUD">Fraud</option>
                <option value="INVENTORY">Inventory</option>
                <option value="DECLINED">Declined</option>
                <option value="STAFF">Staff</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Internal Staff Note */}
            <div style={{ ...fieldWrap, marginBottom: "20px" }}>
              <label style={labelStyle}>
                Internal Staff Note{" "}
                <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                  (optional)
                </span>
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "10px",
                }}
              >
                <PortalDropdown
                  value={cancelNoteCategory}
                  placeholder="— Select category —"
                  onChange={(category) => {
                    setCancelNoteCategory(category);
                    setCancelNoteReason("");
                    setCancelStaffNote("");
                  }}
                  options={[
                    ...Object.keys(CANCELLATION_NOTE_OPTIONS).map(
                      (category) => ({ value: category, label: category }),
                    ),
                    {
                      value: CANCELLATION_CATEGORY_OTHER,
                      label: CANCELLATION_CATEGORY_OTHER,
                    },
                  ]}
                />

                {cancelNoteCategory &&
                cancelNoteCategory !== CANCELLATION_CATEGORY_OTHER ? (
                  <PortalDropdown
                    value={cancelNoteReason}
                    placeholder="— Select reason —"
                    onChange={(reason) => {
                      setCancelNoteReason(reason);
                      if (reason) {
                        setCancelStaffNote(`${cancelNoteCategory}: ${reason}`);
                      }
                    }}
                    options={(CANCELLATION_NOTE_OPTIONS[cancelNoteCategory] ?? []).map(
                      (reason) => ({ value: reason, label: reason }),
                    )}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderWidth: "1.5px",
                      borderStyle: "solid",
                      borderColor: "#e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px",
                      background: "#f9fafb",
                      color: "#9ca3af",
                    }}
                  >
                    — Select reason —
                  </div>
                )}
              </div>

              {cancelNoteCategory === CANCELLATION_CATEGORY_OTHER && (
                <textarea
                  style={{
                    ...inputStyle,
                    minHeight: "72px",
                    resize: "vertical",
                  }}
                  placeholder="Internal note for this cancellation..."
                  value={cancelStaffNote}
                  onChange={(e) => setCancelStaffNote(e.target.value)}
                  disabled={activeEligibility?.canEdit === false}
                  autoFocus
                />
              )}
            </div>

            {/* Confirmation checkbox */}
            <div
              style={{
                marginBottom: "24px",
                padding: "12px 14px",
                borderRadius: "8px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                fontSize: "13px",
                color: "#92400e",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={cancelConfirmed}
                  onChange={(e) => setCancelConfirmed(e.target.checked)}
                  disabled={activeEligibility?.canEdit === false}
                  style={{ marginTop: "2px", flexShrink: 0 }}
                />
                I understand this action cannot be undone. I confirm I want to
                cancel this order.
              </label>
            </div>

            {/* Result */}
            {(cancelData || cancelError) && (
              <div style={{ marginBottom: "20px" }}>
                <ResultBox data={cancelData} error={cancelError} />
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                borderTop: "1px solid #f3f4f6",
                paddingTop: "20px",
              }}
            >
              <button
                type="submit"
                disabled={
                  isCancelling ||
                  isCheckingActiveEligibility ||
                  activeEligibility?.canEdit === false ||
                  !cancelConfirmed
                }
                title={
                  activeEligibility?.canEdit === false
                    ? (activeEligibility.reason ?? undefined)
                    : undefined
                }
                style={{
                  padding: "10px 28px",
                  border: "none",
                  borderRadius: "8px",
                  background:
                    isCancelling ||
                    isCheckingActiveEligibility ||
                    activeEligibility?.canEdit === false ||
                    !cancelConfirmed
                      ? "#fca5a5"
                      : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                  color: "#fff",
                  cursor:
                    isCancelling ||
                    isCheckingActiveEligibility ||
                    activeEligibility?.canEdit === false ||
                    !cancelConfirmed
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                {isCancelling ? "Cancelling..." : "Cancel Order"}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* ════════════════════════════════════════════════
          EDIT DRAFT MODE
      ════════════════════════════════════════════════ */}
      {mode === "editDraft" && (
        <div style={{ padding: "28px" }}>
          {/* Draft Order ID + Store */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              marginBottom: "24px",
            }}
          >
            <div style={fieldWrap}>
              <label style={labelStyle}>Draft Order ID *</label>
              <Autocomplete
                options={draftOrderSuggestions}
                loading={isDraftOrderSearching}
                getOptionLabel={(o: any) =>
                  o.name || o.id?.split("/").pop() || ""
                }
                isOptionEqualToValue={(o: any, v: any) => o.id === v.id}
                filterOptions={(x) => x}
                value={draftSelectedOrder}
                inputValue={draftSearchInput}
                onInputChange={(_, val, reason) => {
                  if (reason === "input") {
                    setDraftSearchInput(val);
                    if (draftSearchDebounceRef.current)
                      clearTimeout(draftSearchDebounceRef.current);
                    draftSearchDebounceRef.current = setTimeout(() => {
                      setDraftSearchFilter(buildShopifyQuery(val));
                    }, 400);
                  }
                }}
                onChange={(_, selected) => {
                  setDraftSelectedOrder(selected);
                  if (selected) {
                    handleSelectDraftOrder(selected);
                  } else {
                    setEditDraftOrderId("");
                    setDraftSearchInput("");
                    setDraftSearchFilter(undefined);
                    setEditEmail("");
                    setEditAddr({ ...defaultAddress });
                    setLoadDraftLineItemsId("");
                    setDraftVariantItems([]);
                    setDraftCustomItems([]);
                    setDraftNewItems([]);
                    setDraftNewCustomItems([]);
                    resetUpdateDraft();
                  }
                }}
                renderOption={(props, option: any) => {
                  const { key, ...liProps } = props as any;
                  const numericId = option.id?.split("/").pop() || "";
                  return (
                    <li key={key} {...liProps}>
                      <span style={{ fontWeight: 600, color: "#4f46e5" }}>
                        {option.name}
                      </span>
                      <span
                        style={{
                          marginLeft: "8px",
                          color: "#9ca3af",
                          fontSize: "12px",
                        }}
                      >
                        #{numericId}
                      </span>
                      {option.email && (
                        <span
                          style={{
                            marginLeft: "10px",
                            color: "#6b7280",
                            fontSize: "12px",
                          }}
                        >
                          {option.email}
                        </span>
                      )}
                      {option.shippingAddress?.firstName && (
                        <span
                          style={{
                            marginLeft: "10px",
                            color: "#9ca3af",
                            fontSize: "12px",
                          }}
                        >
                          {option.shippingAddress.firstName}{" "}
                          {option.shippingAddress.lastName}
                        </span>
                      )}
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search by draft order # or email…"
                    size="small"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "8px",
                        fontSize: "14px",
                        "& fieldset": {
                          borderColor: editDraftOrderId ? "#6366f1" : "#e5e7eb",
                        },
                      },
                    }}
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isDraftOrderSearching && (
                              <CircularProgress color="inherit" size={14} />
                            )}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      },
                    }}
                  />
                )}
              />
              <span
                style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}
              >
                Type draft order # (e.g. D1) or email to search
              </span>
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Store *</label>
              <StoreDropdown
                selectedLabel={selectedStoreOption?.label ?? ""}
                onChange={(opt) => setSelectedStoreOption(opt)}
                options={STORE_OPTIONS}
              />
            </div>
          </div>

          {/* ── Sub-tabs ── */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              borderBottom: "2px solid #f3f4f6",
              marginBottom: "24px",
            }}
          >
            {(
              [
                { key: "details", label: "Update Details" },
                { key: "lineItems", label: "Edit Line Items" },
              ] as { key: DraftSubTab; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDraftSubTab(key)}
                style={{
                  padding: "8px 18px",
                  border: "none",
                  borderBottom:
                    draftSubTab === key
                      ? "2px solid #4f46e5"
                      : "2px solid transparent",
                  marginBottom: "-2px",
                  background: "none",
                  fontSize: "13px",
                  fontWeight: draftSubTab === key ? 700 : 500,
                  color: draftSubTab === key ? "#4f46e5" : "#6b7280",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Update Details sub-tab ── */}
          {draftSubTab === "details" && (
            <form onSubmit={handleUpdateDraft}>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>
                  Email{" "}
                  <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                    (optional)
                  </span>
                </label>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="New email address"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>
                  Tags{" "}
                  <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                    (optional, comma-separated)
                  </span>
                </label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="e.g. wholesale, priority, vip"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                />
                {editTags
                  .split(",")
                  .map((t) => t.trim())
                  .filter((t) => t.length > 40)
                  .map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: "11px",
                        marginTop: "3px",
                        color: "#dc2626",
                        display: "block",
                      }}
                    >
                      Tag limit exceeded: "{t}" is {t.length} characters (max
                      40).
                    </span>
                  ))}
              </div>

              {/* Reason Code */}
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>
                  Reason Code{" "}
                  <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                    (order level)
                  </span>
                </label>
                {draftOrderStatus === "COMPLETED" ? (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#fef3c7",
                      border: "1px solid #fcd34d",
                      borderRadius: "8px",
                      fontSize: "13px",
                      color: "#92400e",
                    }}
                  >
                    This draft order is completed and cannot be updated.
                  </div>
                ) : (
                  <>
                    <SearchableDropdown
                      value={draftEditReasonCode}
                      onChange={(val) => setDraftEditReasonCode(val)}
                      options={reasonCodeOptions}
                      placeholder="— select reason code —"
                    />
                    {draftEditReasonCode &&
                      `cxi-rc_${draftEditReasonCode}`.length > 40 && (
                        <span
                          style={{
                            fontSize: "11px",
                            marginTop: "3px",
                            color: "#dc2626",
                          }}
                        >
                          Tag limit exceeded: "cxi-rc_{draftEditReasonCode}" is{" "}
                          {`cxi-rc_${draftEditReasonCode}`.length} characters
                          (max 40).
                        </span>
                      )}
                  </>
                )}
              </div>

              {/* Zendesk Ticket # */}
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>
                  Zendesk Ticket #{" "}
                  {/* <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                    (order level)
                  </span> */}
                </label>
                {draftOrderStatus === "COMPLETED" ? (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#fef3c7",
                      border: "1px solid #fcd34d",
                      borderRadius: "8px",
                      fontSize: "13px",
                      color: "#92400e",
                    }}
                  >
                    This draft order is completed and cannot be updated.
                  </div>
                ) : (
                  <>
                    <input
                      style={inputStyle}
                      type="text"
                      placeholder="zendesk_"
                      value={draftEditExternalDocInfo}
                      onChange={(e) =>
                        setDraftEditExternalDocInfo(e.target.value)
                      }
                    />
                    {`zendesk_${draftEditExternalDocInfo}`.length > 40 && (
                      <span
                        style={{
                          fontSize: "11px",
                          marginTop: "3px",
                          color: "#dc2626",
                        }}
                      >
                        Tag limit exceeded: "zendesk_{draftEditExternalDocInfo}"
                        is {`zendesk_${draftEditExternalDocInfo}`.length}{" "}
                        characters (max 40).
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Shipping Address */}
              <div
                style={{
                  borderTop: "1px solid #f3f4f6",
                  paddingTop: "20px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "16px",
                  }}
                >
                  Shipping Address{" "}
                  <span
                    style={{
                      textTransform: "none",
                      fontWeight: 400,
                      color: "#9ca3af",
                    }}
                  >
                    (fill only fields to change)
                  </span>
                </div>
                {renderEditAddressFields(editAddr, (field, val) =>
                  setEditAddr((p) => ({ ...p, [field]: val })),
                )}
              </div>

              <ResultBox
                data={updateDraftData}
                error={updateDraftError}
                successColor="#0369a1"
                successBg="#f0f9ff"
                adminUrl={
                  updateDraftData?.data?.id && selectedStoreOption?.handle
                    ? `https://admin.shopify.com/store/${selectedStoreOption?.handle}/draft_orders/${updateDraftData.data.id.split("/").pop()}`
                    : undefined
                }
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  borderTop: "1px solid #f3f4f6",
                  paddingTop: "20px",
                }}
              >
                <button
                  type="submit"
                  disabled={isDraftUpdating || draftOrderStatus === "COMPLETED"}
                  style={{
                    padding: "10px 28px",
                    border: "none",
                    borderRadius: "8px",
                    background:
                      isDraftUpdating || draftOrderStatus === "COMPLETED"
                        ? "#a5b4fc"
                        : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    color: "#fff",
                    cursor:
                      isDraftUpdating || draftOrderStatus === "COMPLETED"
                        ? "not-allowed"
                        : "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  {isDraftUpdating ? "Saving..." : "Save Draft Changes"}
                </button>
              </div>
            </form>
          )}

          {/* ── Edit Line Items sub-tab ── */}
          {draftSubTab === "lineItems" && (
            <form onSubmit={handleUpdateDraftLineItems}>
              {/* Loading state */}
              {isLoadingDraftLineItems && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "16px",
                    color: "#9ca3af",
                    fontSize: "13px",
                  }}
                >
                  <CircularProgress size={14} />
                  Loading line items…
                </div>
              )}

              {/* Prompt to select order */}
              {!editDraftOrderId.trim() && !isLoadingDraftLineItems && (
                <div
                  style={{
                    marginBottom: "16px",
                    fontSize: "13px",
                    color: "#9ca3af",
                  }}
                >
                  Select a draft order above to load its line items.
                </div>
              )}

              {/* ── Wash Whole Unit toggle ── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  marginBottom: "16px",
                }}
              >
                <div
                  role="checkbox"
                  aria-checked={draftWashWholeUnit}
                  tabIndex={0}
                  onClick={() => setDraftWashWholeUnit((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter")
                      setDraftWashWholeUnit((v) => !v);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    userSelect: "none",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: `1.5px solid ${draftWashWholeUnit ? "#6366f1" : "#d1d5db"}`,
                    background: draftWashWholeUnit ? "#eef2ff" : "#fff",
                  }}
                >
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "4px",
                      border: `2px solid ${draftWashWholeUnit ? "#6366f1" : "#d1d5db"}`,
                      background: draftWashWholeUnit ? "#6366f1" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                  >
                    {draftWashWholeUnit && (
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: draftWashWholeUnit ? "#4f46e5" : "#374151",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Wash Whole Unit
                  </span>
                </div>
              </div>

              {/* ── Import from Existing Order ── */}
              <div style={{ marginBottom: "24px" }} ref={draftImportSearchRef}>
                <label style={labelStyle}>Import from Existing Order</label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={draftImportOrderInput}
                      onChange={handleDraftImportSearchChange}
                      onFocus={() =>
                        draftImportOrderInput &&
                        setShowDraftImportDropdown(true)
                      }
                      placeholder="Search by Order ID to auto-fill fields..."
                      style={{
                        ...inputStyle,
                        paddingLeft: "40px",
                        border: showDraftImportDropdown
                          ? "1.5px solid #6366f1"
                          : "1.5px solid #e5e7eb",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: "13px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#9ca3af",
                        display: "flex",
                      }}
                    >
                      {isDraftImportSearching ? (
                        <CircularProgress size={16} />
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      )}
                    </span>
                  </div>
                  {showDraftImportDropdown &&
                    draftImportSuggestions.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          left: 0,
                          right: 0,
                          background: "#fff",
                          border: "1.5px solid #e5e7eb",
                          borderRadius: "10px",
                          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                          zIndex: 999,
                          maxHeight: "220px",
                          overflowY: "auto",
                          padding: "6px",
                        }}
                      >
                        {Array.from(
                          new Map(
                            draftImportSuggestions.map((o: any) => [
                              o.order_id,
                              o,
                            ]),
                          ).values(),
                        ).map((order: any) => (
                          <div
                            key={order.order_id}
                            onClick={() => handleSelectDraftImportOrder(order)}
                            style={{
                              padding: "10px 14px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "13px",
                              color: "#111827",
                            }}
                            onMouseEnter={(e) => {
                              (
                                e.currentTarget as HTMLDivElement
                              ).style.background = "#f5f3ff";
                            }}
                            onMouseLeave={(e) => {
                              (
                                e.currentTarget as HTMLDivElement
                              ).style.background = "transparent";
                            }}
                          >
                            <span style={{ fontWeight: 600, color: "#4f46e5" }}>
                              #{order.order_id}
                            </span>
                            {order.customer_email && (
                              <span
                                style={{ marginLeft: "10px", color: "#6b7280" }}
                              >
                                {order.customer_email}
                              </span>
                            )}
                            {order.phone_no && (
                              <span
                                style={{
                                  marginLeft: "10px",
                                  color: "#9ca3af",
                                  fontSize: "12px",
                                }}
                              >
                                {order.phone_no}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  {showDraftImportDropdown &&
                    !isDraftImportSearching &&
                    draftImportOrderFilter &&
                    draftImportSuggestions.length === 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          left: 0,
                          right: 0,
                          background: "#fff",
                          border: "1.5px solid #e5e7eb",
                          borderRadius: "10px",
                          padding: "12px 16px",
                          fontSize: "13px",
                          color: "#9ca3af",
                          zIndex: 999,
                        }}
                      >
                        No orders found
                      </div>
                    )}
                </div>

                {/* Line item picker from selected order */}
                {draftImportAvailableItems.length > 0 && (
                  <div style={{ marginTop: "10px" }}>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const idx = parseInt(e.target.value, 10);
                        if (!isNaN(idx)) {
                          handleAddDraftImportLineItem(
                            draftImportAvailableItems[idx],
                          );
                          e.target.value = "";
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1.5px solid #a5b4fc",
                        borderRadius: "8px",
                        fontSize: "13px",
                        color: "#374151",
                        background: "#f5f3ff",
                        cursor: "pointer",
                      }}
                    >
                      <option value="" disabled>
                        — select line item to add —
                      </option>
                      {draftImportAvailableItems.map((row, i) => (
                        <option key={i} value={i}>
                          {[row.item_no, row.lot_no]
                            .filter(Boolean)
                            .join(" / ")}
                          {row.description ? ` — ${row.description}` : ""}
                          {row.quantity != null
                            ? ` — Qty: ${row.quantity}`
                            : ""}
                          {row.unit_price != null
                            ? ` — $${row.unit_price}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* ── Existing variant-based line items ── */}
              {draftVariantItems.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "10px",
                    }}
                  >
                    Existing Items — edit qty or remove
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {draftVariantItems.map((item) => (
                      <div
                        key={item.key}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 120px auto",
                          gap: "12px",
                          alignItems: "center",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: `1.5px solid ${item.pendingRemove ? "#fca5a5" : "#e5e7eb"}`,
                          background: item.pendingRemove
                            ? "#fff7f7"
                            : "#fafafa",
                          opacity: item.pendingRemove ? 0.75 : 1,
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: "13px",
                              color: item.pendingRemove ? "#dc2626" : "#111827",
                              textDecoration: item.pendingRemove
                                ? "line-through"
                                : "none",
                            }}
                          >
                            {item.title}
                          </span>
                          <span
                            style={{
                              marginLeft: "8px",
                              fontSize: "11px",
                              color: "#9ca3af",
                            }}
                          >
                            {item.variantId.split("/").pop()}
                          </span>
                        </div>
                        <input
                          type="number"
                          min={1}
                          value={item.pendingRemove ? 0 : item.quantity}
                          disabled={item.pendingRemove}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value, 10);
                            if (!isNaN(qty) && qty >= 1) {
                              setDraftVariantItems((prev) =>
                                prev.map((li) =>
                                  li.key === item.key
                                    ? { ...li, quantity: qty }
                                    : li,
                                ),
                              );
                            }
                          }}
                          style={{
                            ...inputStyle,
                            opacity: item.pendingRemove ? 0.5 : 1,
                          }}
                        />
                        <button
                          type="button"
                          title={
                            item.pendingRemove ? "Undo removal" : "Remove item"
                          }
                          onClick={() =>
                            setDraftVariantItems((prev) =>
                              prev.map((li) =>
                                li.key === item.key
                                  ? { ...li, pendingRemove: !li.pendingRemove }
                                  : li,
                              ),
                            )
                          }
                          style={{
                            padding: "7px 12px",
                            border: `1.5px solid ${item.pendingRemove ? "#a5b4fc" : "#fca5a5"}`,
                            borderRadius: "8px",
                            background: "#fff",
                            color: item.pendingRemove ? "#4f46e5" : "#dc2626",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.pendingRemove ? "↩ Undo" : "✕ Remove"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Existing custom items — editable ── */}
              {draftCustomItems.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "10px",
                    }}
                  >
                    Existing Custom Items — edit qty or remove
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {draftCustomItems.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: `1.5px solid ${item.pendingRemove ? "#fca5a5" : "#e5e7eb"}`,
                          background: item.pendingRemove
                            ? "#fff7f7"
                            : "#fafafa",
                          opacity: item.pendingRemove ? 0.75 : 1,
                        }}
                      >
                        {/* Title + attributes */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "3px",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "13px",
                              color: item.pendingRemove ? "#dc2626" : "#111827",
                              textDecoration: item.pendingRemove
                                ? "line-through"
                                : "none",
                            }}
                          >
                            {item.title}
                          </span>
                          {item.customAttributes.map((attr) => (
                            <span
                              key={attr.key}
                              style={{
                                fontSize: "11px",
                                color: "#6b7280",
                                lineHeight: 1.4,
                              }}
                            >
                              <span
                                style={{ fontWeight: 600, color: "#374151" }}
                              >
                                {attr.key}:
                              </span>{" "}
                              {attr.value}
                            </span>
                          ))}
                        </div>

                        {/* Controls */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr auto",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.price ?? ""}
                            disabled={item.pendingRemove}
                            onChange={(e) =>
                              setDraftCustomItems((prev) =>
                                prev.map((li, idx) =>
                                  idx === i
                                    ? { ...li, price: e.target.value || null }
                                    : li,
                                ),
                              )
                            }
                            placeholder="Price"
                            style={{
                              ...inputStyle,
                              fontSize: "12px",
                              padding: "6px 10px",
                              opacity: item.pendingRemove ? 0.5 : 1,
                            }}
                          />
                          <input
                            type="number"
                            min={1}
                            value={item.pendingRemove ? 0 : item.quantity}
                            disabled={item.pendingRemove}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value, 10);
                              if (!isNaN(qty) && qty >= 1) {
                                setDraftCustomItems((prev) =>
                                  prev.map((li, idx) =>
                                    idx === i ? { ...li, quantity: qty } : li,
                                  ),
                                );
                              }
                            }}
                            placeholder="Qty"
                            style={{
                              ...inputStyle,
                              fontSize: "12px",
                              padding: "6px 10px",
                              opacity: item.pendingRemove ? 0.5 : 1,
                            }}
                          />
                          <button
                            type="button"
                            title={
                              item.pendingRemove
                                ? "Undo removal"
                                : "Remove item"
                            }
                            onClick={() =>
                              setDraftCustomItems((prev) =>
                                prev.map((li, idx) =>
                                  idx === i
                                    ? {
                                        ...li,
                                        pendingRemove: !li.pendingRemove,
                                      }
                                    : li,
                                ),
                              )
                            }
                            style={{
                              padding: "6px 12px",
                              border: `1.5px solid ${item.pendingRemove ? "#a5b4fc" : "#fca5a5"}`,
                              borderRadius: "8px",
                              background: "#fff",
                              color: item.pendingRemove ? "#4f46e5" : "#dc2626",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.pendingRemove ? "↩ Undo" : "✕ Remove"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── New items ── */}
              {/* <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Add New Items
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftNewItems((prev) => [
                        ...prev,
                        {
                          key: Math.random().toString(36).slice(2),
                          variantId: "",
                          title: "",
                          quantity: 1,
                        },
                      ])
                    }
                    style={{
                      padding: "5px 12px",
                      border: "1.5px dashed #a5b4fc",
                      borderRadius: "6px",
                      background: "#f5f3ff",
                      color: "#4f46e5",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    + Add Item
                  </button>
                </div>

                {draftNewItems.length === 0 && (
                  <div style={{ fontSize: "13px", color: "#9ca3af" }}>
                    Click "+ Add Item" to add a new product variant.
                  </div>
                )}

                {draftNewItems.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px auto",
                      gap: "12px",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <Autocomplete
                      options={variantOptions}
                      loading={productsLoading}
                      getOptionKey={(o) => o.variantId}
                      getOptionLabel={(o) => o.label}
                      isOptionEqualToValue={(o, v) =>
                        o.variantId === v.variantId
                      }
                      value={
                        variantOptions.find(
                          (o) => o.variantId === item.variantId,
                        ) ?? null
                      }
                      onChange={(_, selected) =>
                        setDraftNewItems((prev) =>
                          prev.map((li) =>
                            li.key === item.key
                              ? {
                                  ...li,
                                  variantId: selected?.variantId ?? "",
                                  title: selected
                                    ? `${selected.product.title} — ${selected.variant.title}`
                                    : "",
                                }
                              : li,
                          ),
                        )
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Search product variant…"
                          size="small"
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "8px",
                              fontSize: "14px",
                              "& fieldset": { borderColor: "#e5e7eb" },
                            },
                          }}
                          slotProps={{
                            input: {
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {productsLoading && (
                                    <CircularProgress
                                      color="inherit"
                                      size={14}
                                    />
                                  )}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            },
                          }}
                        />
                      )}
                    />
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => {
                        const qty = parseInt(e.target.value, 10);
                        setDraftNewItems((prev) =>
                          prev.map((li) =>
                            li.key === item.key
                              ? { ...li, quantity: isNaN(qty) ? 1 : qty }
                              : li,
                          ),
                        );
                      }}
                      placeholder="Qty"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraftNewItems((prev) =>
                          prev.filter((li) => li.key !== item.key),
                        )
                      }
                      style={{
                        padding: "7px 12px",
                        border: "1.5px solid #fca5a5",
                        borderRadius: "8px",
                        background: "#fff",
                        color: "#dc2626",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div> */}

              {/* ── Add Custom Items section ── */}
              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Add Custom Items
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftNewCustomItems((prev) => [
                        ...prev,
                        {
                          key: Math.random().toString(36).slice(2),
                          title: "",
                          lot_no: "",
                          price: "",
                          quantity: 1,
                          reasonCode: "",
                          returnReasonCode: "",
                          parts: [],
                        },
                      ])
                    }
                    style={{
                      padding: "5px 12px",
                      border: "1.5px dashed #a5b4fc",
                      borderRadius: "6px",
                      background: "#f5f3ff",
                      color: "#4f46e5",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    + Add Custom Item
                  </button>
                </div>

                {draftNewCustomItems.length === 0 && (
                  <div style={{ fontSize: "13px", color: "#9ca3af" }}>
                    Click "+ Add Custom Item" to add a custom product by item
                    no.
                  </div>
                )}

                {draftNewCustomItems.map((item) => (
                  <DraftCustomItemRow
                    key={item.key}
                    item={item}
                    onUpdate={(updates) =>
                      setDraftNewCustomItems((prev) =>
                        prev.map((li) =>
                          li.key === item.key ? { ...li, ...updates } : li,
                        ),
                      )
                    }
                    onRemove={() =>
                      setDraftNewCustomItems((prev) =>
                        prev.filter((li) => li.key !== item.key),
                      )
                    }
                    reasonCodeOptions={reasonCodeOptions}
                    lineReasonCodeOptions={lineReasonCodeOptions}
                    washWholeUnit={draftWashWholeUnit}
                  />
                ))}
              </div>

              <ResultBox
                data={updateDraftData}
                error={updateDraftError}
                successColor="#0369a1"
                successBg="#f0f9ff"
                adminUrl={
                  updateDraftData?.data?.id && selectedStoreOption?.handle
                    ? `https://admin.shopify.com/store/${selectedStoreOption?.handle}/draft_orders/${updateDraftData.data.id.split("/").pop()}`
                    : undefined
                }
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  borderTop: "1px solid #f3f4f6",
                  paddingTop: "20px",
                }}
              >
                <button
                  type="submit"
                  disabled={isDraftUpdating}
                  style={{
                    padding: "10px 28px",
                    border: "none",
                    borderRadius: "8px",
                    background: isDraftUpdating
                      ? "#a5b4fc"
                      : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    color: "#fff",
                    cursor: isDraftUpdating ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  {isDraftUpdating ? "Saving..." : "Save Line Items"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          CREATE PRODUCT MODE
      ════════════════════════════════════════════════ */}
      {mode === "createProduct" && (
        <form
          style={{ padding: "28px" }}
          onSubmit={async (e) => {
            e.preventDefault();
            const price = parseFloat(productForm.price);
            if (!productForm.title.trim()) {
              toast.error("Title is required");
              return;
            }
            if (isNaN(price) || price < 0) {
              toast.error("Enter a valid price");
              return;
            }
            try {
              await createProduct({
                store: selectedStore,
                title: productForm.title.trim(),
                price,
                sku: productForm.sku.trim() || undefined,
                product_type: productForm.product_type.trim() || undefined,
                vendor: productForm.vendor.trim() || undefined,
              }).unwrap();
              toast.success("Product created successfully");
              setProductForm({
                title: "",
                price: "",
                sku: "",
                product_type: "",
                vendor: "",
              });
              refetchProducts();
            } catch (err: any) {
              toast.error(err?.data?.message || "Failed to create product");
            }
          }}
        >
          {/* Store */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Store</label>
            <StoreDropdown
              selectedLabel={selectedStoreOption?.label ?? ""}
              onChange={setSelectedStoreOption}
              options={STORE_OPTIONS}
            />
          </div>

          {/* Title */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Title *</label>
            <input
              style={inputStyle}
              placeholder="e.g. Crib"
              value={productForm.title}
              onChange={(e) =>
                setProductForm((p) => ({ ...p, title: e.target.value }))
              }
              required
            />
          </div>

          {/* Price */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Price *</label>
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 25.00"
              value={productForm.price}
              onChange={(e) =>
                setProductForm((p) => ({ ...p, price: e.target.value }))
              }
              required
            />
          </div>

          {/* SKU */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>
              SKU{" "}
              <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                (optional — auto-generated if blank)
              </span>
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. MUG-25-4821"
              value={productForm.sku}
              onChange={(e) =>
                setProductForm((p) => ({ ...p, sku: e.target.value }))
              }
            />
          </div>

          {/* Product Type */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>
              Product Type{" "}
              <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                (default: Custom)
              </span>
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. Cribs"
              value={productForm.product_type}
              onChange={(e) =>
                setProductForm((p) => ({ ...p, product_type: e.target.value }))
              }
            />
          </div>

          {/* Vendor */}
          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>
              Vendor{" "}
              <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                (default: Custom Store)
              </span>
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. My Brand"
              value={productForm.vendor}
              onChange={(e) =>
                setProductForm((p) => ({ ...p, vendor: e.target.value }))
              }
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              borderTop: "1px solid #f3f4f6",
              paddingTop: "20px",
            }}
          >
            <button
              type="submit"
              disabled={isProductCreating}
              style={{
                padding: "10px 28px",
                border: "none",
                borderRadius: "8px",
                background: isProductCreating
                  ? "#a5b4fc"
                  : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                color: "#fff",
                cursor: isProductCreating ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              {isProductCreating ? "Creating..." : "Create Product"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ShopifyOrderForm;
