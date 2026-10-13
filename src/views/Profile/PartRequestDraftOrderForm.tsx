"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Dialog, DialogContent } from "@mui/material";
import { PartRequestDetail, useMarkPartRequestSubmittedMutation } from "@/redux/services/partRequestsApi";
import {
  useGetShopifyReturnReasonsQuery,
  useGetShopifyReturnReasonsCodeQuery,
  useCreateDraftOrderMutation,
} from "@/redux/services/shopifyApi";
import { useLazyGetAutoWholeunitPartsQuery } from "@/redux/services/InventoryApi";
import {
  LineItemSearchFields,
  PartsSubSection,
  ResultBox,
  SearchableDropdown,
  STORE_OPTIONS,
  type PartRow,
} from "./ShopifyOrderForm";

// ─── Styles (mirrors ShopifyOrderForm.tsx's visual language) ─────────────────

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

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: "16px",
};

const fieldWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

// Match the request's store to a Create Order store option by full label or by
// its code prefix (e.g. "CP02"). Read-only: nothing here is written anywhere.
export function matchStoreOption(raw: unknown) {
  // raw is typed as a string, but data from the API isn't guaranteed to
  // actually be one at runtime — String(...) guards against a .trim() crash.
  const v = (raw != null ? String(raw) : "").trim().toLowerCase();
  if (!v) return null;
  return (
    STORE_OPTIONS.find((o) => o.label.toLowerCase() === v) ||
    STORE_OPTIONS.find((o) => o.label.split("-")[0].trim().toLowerCase() === v) ||
    STORE_OPTIONS.find((o) => v.startsWith(o.label.split("-")[0].trim().toLowerCase())) ||
    null
  );
}

interface DraftLineItem {
  key: string;
  item_no: string;
  lot_no: string | null;
  unit_price: number | null;
  quantity: number;
  description: string;
  reason_code?: string;
  parts: PartRow[];
}

const EMPTY_LINE_ITEM = (key: string): DraftLineItem => ({
  key,
  item_no: "",
  lot_no: null,
  unit_price: null,
  quantity: 1,
  description: "",
  parts: [],
});

const smallLabelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#6b7280",
};

const readOnlyBoxStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "8px 12px",
  border: "1.5px solid #e5e7eb",
  borderRadius: "8px",
  fontSize: "13px",
  background: "#f9fafb",
  gap: "6px",
};

function splitName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const trimmed = (fullName || "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

// If any of an item's parts is flagged AutoWholeunitSales in Databricks
// (main.staging.parts_parts_lot, matched by part_number), that item is
// normally handled as a whole-unit replacement — show it as one simple
// line with no Parts Line Items breakdown, instead of listing each part.
function buildLineItems(request: PartRequestDetail, autoWholeunitPartNumbers: Set<string>): DraftLineItem[] {
  return request.items.map((item) => {
    const wholeUnitPart = item.parts.find(
      (part) => part.part_number && autoWholeunitPartNumbers.has(part.part_number),
    );

    return {
      ...EMPTY_LINE_ITEM(String(item.id)),
      item_no: item.sku || "",
      lot_no: item.lot_number || null,
      description: wholeUnitPart
        ? wholeUnitPart.part_name || `Whole Unit (${wholeUnitPart.part_sku || wholeUnitPart.part_number})`
        : item.product_name || item.description || item.sku || "",
      // Line-level reason code — shown/used when this item has no parts.
      reason_code: item.return_reason_code || undefined,
      parts: wholeUnitPart
        ? []
        : item.parts.map((part) => ({
            parts_item_no: part.part_sku || part.part_number || "",
            parts_qty: part.quantity ?? 1,
            parts_unit_price: null,
            reason_code: item.return_reason_code || undefined,
          })),
    };
  });
}

export default function PartRequestDraftOrderForm({
  open,
  onClose,
  request,
}: {
  open: boolean;
  onClose: () => void;
  request: PartRequestDetail;
}) {
  const header = request.header;

  const [storeLabel, setStoreLabel] = useState("");
  const [storeOption, setStoreOption] = useState<(typeof STORE_OPTIONS)[number] | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [zendeskTicket, setZendeskTicket] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([]);
  const [isCheckingWholeUnit, setIsCheckingWholeUnit] = useState(false);
  const { data: returnReasonsData } = useGetShopifyReturnReasonsQuery();
  const { data: headerReasonsData } = useGetShopifyReturnReasonsCodeQuery();
  const reasonCodeLabel = (() => {
    const match = (headerReasonsData?.data ?? []).find((r) => r.Code === reasonCode);
    return match ? `${match.Code} — ${match.Description}` : reasonCode;
  })();
  const lineReasonCodeOptions = (returnReasonsData?.data ?? []).map((r) => ({
    value: r.Code,
    label: `${r.Code} — ${r.Description}`,
  }));

  const [createDraftOrder, { isLoading: isDraftLoading, data: draftData, error: draftError, reset: resetDraft }] =
    useCreateDraftOrderMutation();
  const [triggerAutoWholeunitCheck] = useLazyGetAutoWholeunitPartsQuery();
  const [markSubmitted] = useMarkPartRequestSubmittedMutation();
  const zipLookupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    resetDraft();
    const { firstName: fn, lastName: ln } = splitName(header.customer_name);
    const storeOpt = matchStoreOption(header.store);
    setStoreOption(storeOpt);
    setStoreLabel(storeOpt?.label ?? (header.store as string) ?? "");
    setEmail(header.customer_email || "");
    setFirstName(fn);
    setLastName(ln);
    setAddress1((header.address1 as string) || "");
    setAddress2((header.address2 as string) || "");
    setCity((header.city as string) || "");
    setProvince((header.state as string) || "");
    setZip((header.zip as string) || "");
    setCountry((header.country as string) || "");
    setPhone(header.customer_phone || "");
    setCompany("");
    // zendesk_ticket_id can come back as a number, not a string — `as string`
    // is only a type assertion, it doesn't convert, so .trim() later would
    // throw on a real number. String(...) actually converts it.
    setZendeskTicket(header.zendesk_ticket_id != null ? String(header.zendesk_ticket_id) : "");
    setReasonCode((header.reason_code as string) || "");

    // Wait for the whole-unit check before showing any line items, so the
    // parts breakdown never flashes and then collapses — it just renders
    // correctly the first time.
    setLineItems([]);
    const allPartNumbers = request.items.flatMap((item) =>
      item.parts.map((part) => part.part_number).filter((n): n is string => !!n),
    );
    if (allPartNumbers.length === 0) {
      setLineItems(buildLineItems(request, new Set()));
      return;
    }
    setIsCheckingWholeUnit(true);
    triggerAutoWholeunitCheck(allPartNumbers)
      .unwrap()
      .then(({ autoWholeunitPartNumbers }) => {
        setLineItems(buildLineItems(request, new Set(autoWholeunitPartNumbers)));
      })
      .catch(() => {
        // Check failed — fall back to the normal parts breakdown.
        setLineItems(buildLineItems(request, new Set()));
      })
      .finally(() => setIsCheckingWholeUnit(false));
  }, [open, request, header]);

  const patchLineItem = (key: string, patch: Partial<DraftLineItem>) => {
    setLineItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeLineItem = (key: string) => {
    setLineItems((rows) => rows.filter((r) => r.key !== key));
  };

  const addLineItem = () => {
    setLineItems((rows) => [...rows, EMPTY_LINE_ITEM(`new-${Date.now()}-${rows.length}`)]);
  };

  const handleZipChange = (value: string) => {
    setZip(value);
    if (zipLookupRef.current) clearTimeout(zipLookupRef.current);
    if (!value || value.length < 3) return;
    zipLookupRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.zippopotam.us/us/${value}`);
        if (!res.ok) return;
        const data = await res.json();
        const place = data?.places?.[0];
        if (!place) return;
        const stateAbbr: string = place["state abbreviation"] ?? "";
        const placeName: string = place["place name"] ?? "";
        if (stateAbbr) setProvince(stateAbbr);
        if (placeName) setCity(placeName);
        setCountry(data["country abbreviation"] ?? "US");
      } catch {
        // silently ignore lookup failures
      }
    }, 500);
  };

  const vendorCode = (storeOption?.label ?? "").split("-")[0].trim().replace(/\s+/g, "");

  // Same payload rules as Create Order: order-level reason code and Zendesk
  // ticket ride on every line item's properties (the backend turns them into
  // tags), parts expand to their own lines, and CP02/CP05 parts are $0.
  const buildLineItemsPayload = () => {
    const forcePartsZeroPrice = vendorCode === "CP02" || vendorCode === "CP05";
    const result: any[] = [];

    for (const item of lineItems) {
      const properties: { name: string; value: string }[] = [];
      if (item.item_no) properties.push({ name: "item_no", value: item.item_no });
      if (item.lot_no) properties.push({ name: "lot_no", value: item.lot_no });
      if (item.unit_price != null) properties.push({ name: "unit_price", value: String(item.unit_price) });
      if (reasonCode) properties.push({ name: "reason_code", value: reasonCode });
      if (zendeskTicket.trim()) properties.push({ name: "external_doc_info", value: zendeskTicket.trim() });

      const activeParts = (item.parts ?? []).filter((p) => p.parts_item_no);
      if (activeParts.length > 0) {
        for (const part of activeParts) {
          const partProps = [...properties];
          if (part.reason_code) partProps.push({ name: "return_reason_code", value: part.reason_code });
          if (part.touchup_color) partProps.push({ name: "touchup_color", value: part.touchup_color });
          result.push({
            quantity: part.parts_qty,
            title: part.parts_item_no,
            price: forcePartsZeroPrice ? "0.00" : part.parts_unit_price != null ? String(part.parts_unit_price) : "0.00",
            sku: part.parts_item_no,
            ...(partProps.length > 0 && { properties: partProps }),
          });
        }
      } else {
        const lineProps = [...properties];
        if (item.reason_code) lineProps.push({ name: "return_reason_code", value: item.reason_code });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeOption) {
      toast.error("This part request's store doesn't match a known store.");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Add at least one line item.");
      return;
    }
    try {
      const result = await createDraftOrder({
        store: storeOption.value,
        email,
        // Identifies this draft order as submitted from the Part Request
        // flow, not the main Create Order (ShopifyOrderForm) flow.
        tags: ["parts_request_form"],
        washWholeUnit: false,
        lineItems: buildLineItemsPayload(),
        shippingAddress: {
          firstName,
          lastName,
          address1,
          address2,
          company,
          city,
          provinceCode: province,
          countryCode: country,
          zip,
          phone,
        },
        vendor: vendorCode,
      }).unwrap();
      toast.success("Draft order created successfully!");

      // Best-effort: the Shopify draft order already succeeded above, so a
      // failure here shouldn't look like the whole submit failed.
      try {
        await markSubmitted({
          id: header.id,
          shopify_draft_order_id: result?.data?.draft_order?.id ?? null,
        }).unwrap();
      } catch (markErr) {
        console.error(markErr);
        toast.error("Draft order created, but couldn't update the request's status.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creating draft order");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden", m: 0 } }}
    >
      <DialogContent
        sx={{
          p: 0,
          overflowY: "auto",
          "&::-webkit-scrollbar": { width: "5px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": { background: "rgba(99, 102, 241, 0.35)", borderRadius: "10px" },
          "&::-webkit-scrollbar-thumb:hover": { background: "rgba(99, 102, 241, 0.65)" },
        }}
      >
        <div style={{ background: "#fff", width: "100%", fontFamily: "Inter, sans-serif" }}>
          {/* ── Header ── */}
          <div
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              padding: "24px 28px",
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <div>
                <div style={{ color: "#fff", fontSize: "22px", fontWeight: 700, lineHeight: 1.2 }}>
                  Create Draft Order
                </div>
                <div style={{ color: "rgba(255,255,255,0.78)", fontSize: "13px", marginTop: "2px" }}>
                  Prefilled from Part Request {header.order_no || header.id}
                </div>
              </div>
            </div>
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
          </div>

          {/* ── Body ── */}
          <form onSubmit={handleSubmit} style={{ padding: "28px" }}>
            {/* Store + Email */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div style={fieldWrap}>
                <label style={labelStyle}>Store *</label>
                <div style={{ ...inputStyle, background: "#f3f4f6", color: storeLabel ? "#374151" : "#9ca3af", cursor: "not-allowed" }}>
                  {storeLabel || "—"}
                </div>
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Customer Email *</label>
                <input
                  type="email"
                  required
                  style={inputStyle}
                  placeholder="e.g., customer@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Reason Code (read-only) + Zendesk Ticket # */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div style={fieldWrap}>
                <label style={labelStyle}>Reason Code</label>
                <div style={{ ...inputStyle, background: "#f3f4f6", color: reasonCodeLabel ? "#374151" : "#9ca3af", cursor: "not-allowed" }}>
                  {reasonCodeLabel || "—"}
                </div>
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Zendesk Ticket #</label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="zendesk_"
                  value={zendeskTicket}
                  onChange={(e) => setZendeskTicket(e.target.value)}
                />
                {`zendesk_${zendeskTicket}`.length > 40 && (
                  <span style={{ fontSize: "11px", marginTop: "3px", color: "#dc2626" }}>
                    Tag limit exceeded: "zendesk_{zendeskTicket}" is {`zendesk_${zendeskTicket}`.length} characters (max 40).
                  </span>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ ...labelStyle, marginBottom: "10px" }}>
                Line Items * ({lineItems.length})
              </label>

              {isCheckingWholeUnit ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "14px 16px",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "12px",
                    color: "#6b7280",
                    fontSize: "13px",
                  }}
                >
                  Checking parts…
                </div>
              ) : (
                lineItems.map((item, index) => {
                return (
                  <div
                    key={item.key}
                    style={{
                      border: "1.5px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      marginBottom: "10px",
                      background: "#fff",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
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
                        onClick={() => removeLineItem(item.key)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "18px", lineHeight: 1, padding: "0 2px" }}
                        title="Remove line item"
                      >
                        ×
                      </button>
                    </div>

                    {item.description && (
                      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px" }}>
                        Requested part: <strong style={{ color: "#374151" }}>{item.description}</strong>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) 90px", gap: "10px" }}>
                      {item.item_no || item.lot_no ? (
                        <>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={smallLabelStyle}>Item No</span>
                            <div style={{ ...readOnlyBoxStyle, color: item.item_no ? "#111827" : "#9ca3af" }}>
                              <span style={{ flex: 1 }}>{item.item_no || "—"}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  patchLineItem(item.key, {
                                    item_no: "",
                                    lot_no: null,
                                    unit_price: null,
                                  })
                                }
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "14px", lineHeight: 1, padding: 0 }}
                                title="Clear item / lot"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={smallLabelStyle}>Lot No</span>
                            <div style={{ ...readOnlyBoxStyle, color: item.lot_no ? "#111827" : "#9ca3af" }}>
                              {item.lot_no || "—"}
                            </div>
                          </div>
                        </>
                      ) : (
                        <LineItemSearchFields
                          onPopulate={({
                            item_no,
                            lot_no,
                            unit_price,
                          }) =>
                            patchLineItem(item.key, {
                              item_no,
                              lot_no: lot_no || null,
                              unit_price: unit_price ?? null,
                              quantity: 1,
                            })
                          }
                        />
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={smallLabelStyle}>Unit Price</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unit_price ?? ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            patchLineItem(item.key, { unit_price: isNaN(v) ? null : v });
                          }}
                          placeholder="0.00"
                          style={{
                            ...inputStyle,
                            fontSize: "13px",
                            padding: "8px 12px",
                            ...(item.unit_price == null || Number(item.unit_price) === 0
                              ? { border: "1.5px solid #f59e0b", background: "#fffbeb" }
                              : {}),
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={smallLabelStyle}>Line Amount</span>
                        <div
                          style={{
                            padding: "8px 12px",
                            border: "1.5px solid #e5e7eb",
                            borderRadius: "8px",
                            fontSize: "13px",
                            color: item.unit_price != null ? "#047857" : "#9ca3af",
                            background: item.unit_price != null ? "#f0fdf4" : "#f9fafb",
                            fontWeight: item.unit_price != null ? 600 : 400,
                          }}
                        >
                          {item.unit_price != null ? `$${(Number(item.unit_price) * item.quantity).toFixed(2)}` : "—"}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={smallLabelStyle}>Qty</span>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={item.quantity}
                          onKeyDown={(e) => {
                            if (/^[0-9]$/.test(e.key)) (e.target as HTMLInputElement).select();
                          }}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value, 10);
                            if (isNaN(parsed)) return;
                            patchLineItem(item.key, { quantity: Math.min(5, Math.max(1, parsed)) });
                          }}
                          required
                          placeholder="Qty"
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    {(!item.parts || item.parts.length === 0) && (
                      <div style={{ marginTop: "10px" }}>
                        <span style={{ ...smallLabelStyle, display: "block", marginBottom: "4px" }}>
                          Return Reason Code
                        </span>
                        <SearchableDropdown
                          value={item.reason_code ?? ""}
                          onChange={(val) => patchLineItem(item.key, { reason_code: val || undefined })}
                          options={lineReasonCodeOptions}
                          placeholder="— select return reason code —"
                        />
                      </div>
                    )}

                    <PartsSubSection
                      item_no={item.item_no || undefined}
                      lot_no={item.lot_no}
                      parts={item.parts ?? []}
                      onChange={(parts) => patchLineItem(item.key, { parts })}
                      reasonCodeOptions={lineReasonCodeOptions}
                    />
                  </div>
                );
                })
              )}

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
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "20px", marginBottom: "20px" }}>
              <div style={sectionHeaderStyle}>Shipping Address</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={fieldWrap}>
                  <label style={labelStyle}>First Name *</label>
                  <input style={inputStyle} required placeholder="e.g., John" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Last Name *</label>
                  <input style={inputStyle} required placeholder="e.g., Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Address Line 1 *</label>
                  <input style={inputStyle} required placeholder="e.g., 123 Main St" value={address1} onChange={(e) => setAddress1(e.target.value)} />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Address Line 2</label>
                  <input style={inputStyle} placeholder="Apt, suite, etc." value={address2} onChange={(e) => setAddress2(e.target.value)} />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>City *</label>
                  <input style={inputStyle} required placeholder="e.g., New York" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>ZIP / Postal Code *</label>
                  <input style={inputStyle} required placeholder="e.g., 10001" value={zip} onChange={(e) => handleZipChange(e.target.value)} />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Province / State Code *</label>
                  <input style={inputStyle} required placeholder="e.g., NY" value={province} onChange={(e) => setProvince(e.target.value)} />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Country Code *</label>
                  <input style={inputStyle} required placeholder="e.g., US" value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Company</label>
                  <input style={inputStyle} placeholder="e.g., Acme Inc." value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Phone</label>
                  <input style={inputStyle} placeholder="e.g., +1 555 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
            </div>

            <ResultBox
              data={draftData}
              error={draftError}
              successColor="#0369a1"
              successBg="#f0f9ff"
              adminUrl={
                draftData?.data?.draft_order?.id && storeOption?.handle
                  ? `https://admin.shopify.com/store/${storeOption.handle}/draft_orders/${draftData.data.draft_order.id.split("/").pop()}`
                  : undefined
              }
            />

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f3f4f6", paddingTop: "20px" }}>
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
              <button
                type="submit"
                disabled={isDraftLoading}
                style={{
                  padding: "10px 28px",
                  border: "none",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  color: "#fff",
                  cursor: isDraftLoading ? "not-allowed" : "pointer",
                  opacity: isDraftLoading ? 0.7 : 1,
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                {isDraftLoading ? "Creating..." : "Create Draft Order"}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
