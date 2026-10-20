"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Link as MuiLink,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import AddIcon from "@mui/icons-material/Add";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  useGetPartRequestsQuery,
  useGetPartRequestDetailQuery,
  useMarkPartRequestSubmittedMutation,
  PartRequestTab,
  PartRequestHeader,
} from "@/redux/services/partRequestsApi";
import {
  useLazyPreviewPartRequestRefundQuery,
  useCreatePartRequestRefundMutation,
} from "@/redux/services/shopifyApi";
import Loader from "@/components/Common/Loader";
import CustomSelect from "@/components/Common/CustomTabs/CustomSelect";
import PartRequestDraftOrderForm from "./PartRequestDraftOrderForm";

const TABS: { key: PartRequestTab; label: string }[] = [
  { key: "needs_review", label: "Needs Review" },
  { key: "submitted", label: "Submitted to Shopify" },
  { key: "all", label: "All" },
];

// ─── Refund action (manual only — no auto-trigger to Shopify) ────────────────
//
// Flat monetary refund matched by SKU, same rules as discussed for the
// 'refund' request_type: looks up the order by order_no, matches a line by
// SKU, refunds item_total_refund_amount as money back — no inventory/quantity
// change. Requires an explicit second click to confirm before it fires.
function RefundCheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
      {ok ? (
        <CheckCircleIcon sx={{ fontSize: 18, color: "#16a34a" }} />
      ) : (
        <CancelIcon sx={{ fontSize: 18, color: "#dc2626" }} />
      )}
      <Typography variant="body2">{label}</Typography>
    </Box>
  );
}

const refundFieldInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  border: "1.5px solid #e5e7eb",
  borderRadius: "6px",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

function RefundAction({
  requestId,
  orderNo,
  retailerNo,
  sku,
  amount,
}: {
  requestId: string | null;
  orderNo: string | null;
  retailerNo: string | null;
  sku: string | null;
  amount: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  // Editable copies — default to the part request's data, but overridable so
  // this can be pointed at a test-store order/SKU/amount when there's no
  // matching real data to test against (same idea as Create Order's fields).
  // The Shopify store isn't chosen here — the backend picks it from the part
  // request's retailer_no.
  const [editOrderNo, setEditOrderNo] = useState(orderNo ?? "");
  const [editSku, setEditSku] = useState(sku ?? "");
  const [editAmount, setEditAmount] = useState(amount != null ? String(amount) : "");

  const [triggerPreview, { data: preview, isFetching: isPreviewing, error: previewError }] =
    useLazyPreviewPartRequestRefundQuery();
  const [createRefund, { isLoading: isRefunding, error: createError }] = useCreatePartRequestRefundMutation();
  const [markSubmitted] = useMarkPartRequestSubmittedMutation();

  const disabledReason = !requestId
    ? "No request id."
    : !orderNo
      ? "No order number on this request."
      : !sku
        ? "No SKU on this item."
        : amount == null
          ? "No refund amount on this item."
          : null;

  if (done) {
    return <Chip label="Refund created" size="small" sx={{ bgcolor: "#16a34a", color: "#fff", fontWeight: 700 }} />;
  }

  const openDialog = () => {
    setEditOrderNo(orderNo ?? "");
    setEditSku(sku ?? "");
    setEditAmount(amount != null ? String(amount) : "");
    setOpen(true);
    // Auto-run the check on open — no need to click Check the first time,
    // only if the reviewer then edits a field and wants to re-verify.
    if (requestId && orderNo?.trim() && sku?.trim()) {
      triggerPreview({ request_id: requestId, order_no: orderNo.trim(), sku: sku.trim() });
    }
  };

  const runCheck = () => {
    if (!requestId || !editOrderNo.trim() || !editSku.trim()) return;
    triggerPreview({ request_id: requestId, order_no: editOrderNo.trim(), sku: editSku.trim() });
  };

  const canConfirm = !!preview?.orderFound && !!preview?.lineFound && !!preview?.transactionFound;

  const handleConfirm = async () => {
    try {
      await createRefund({
        request_id: requestId!,
        order_no: editOrderNo.trim(),
        sku: editSku.trim(),
        amount: editAmount.trim(),
      }).unwrap();
      toast.success("Refund created in Shopify.");
      setDone(true);
      setOpen(false);

      // Best-effort: the Shopify refund already succeeded above, so a
      // failure here shouldn't look like the whole thing failed.
      if (requestId) {
        try {
          await markSubmitted({ id: requestId }).unwrap();
        } catch (markErr) {
          console.error(markErr);
          toast.error("Refund created, but couldn't update the request's status.");
        }
      }
    } catch {
      toast.error("Refund failed — see details below.");
    }
  };

  return (
    <Box sx={{ flexShrink: 0 }}>
      <Box
        component="button"
        type="button"
        disabled={!!disabledReason}
        onClick={openDialog}
        title={disabledReason ?? undefined}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          height: 32,
          px: 1.75,
          border: "none",
          borderRadius: "8px",
          background: disabledReason ? "#9ca3af" : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 12,
          textTransform: "none",
          lineHeight: 1,
          whiteSpace: "nowrap",
          boxShadow: disabledReason ? "none" : "0 1px 2px rgba(79,70,229,0.25)",
          transition: "filter 0.15s ease",
          cursor: disabledReason ? "not-allowed" : "pointer",
          opacity: disabledReason ? 0.5 : 1,
          "&:hover": disabledReason ? {} : { filter: "brightness(0.94)" },
        }}
      >
        <ReplayOutlinedIcon sx={{ fontSize: 15 }} />
        Create Refund
      </Box>

      <Dialog open={open} onClose={() => !isRefunding && setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>Create refund</DialogTitle>
        <DialogContent>
          <Typography variant="caption" sx={{ color: "#666", display: "block", mb: 1.5 }}>
            Prefilled from the part request. The Shopify store is chosen automatically from the request's retailer.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, mb: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#6b7280", display: "block", mb: 0.5 }}>
                Retailer
              </Typography>
              <div style={{ ...refundFieldInputStyle, background: "#f3f4f6", color: retailerNo ? "#374151" : "#9ca3af", cursor: "not-allowed" }}>
                {retailerNo || "—"}
              </div>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#6b7280", display: "block", mb: 0.5 }}>
                Order No
              </Typography>
              <input
                style={refundFieldInputStyle}
                value={editOrderNo}
                onChange={(e) => setEditOrderNo(e.target.value)}
                placeholder="e.g., #1001"
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#6b7280", display: "block", mb: 0.5 }}>
                SKU
              </Typography>
              <input
                style={refundFieldInputStyle}
                value={editSku}
                onChange={(e) => setEditSku(e.target.value)}
                placeholder="e.g., Z4201W.A"
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#6b7280", display: "block", mb: 0.5 }}>
                Refund Amount
              </Typography>
              <input
                style={refundFieldInputStyle}
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="0.00"
              />
            </Box>
          </Box>

          <Box
            component="button"
            type="button"
            onClick={runCheck}
            disabled={!editOrderNo.trim() || !editSku.trim() || isPreviewing}
            sx={{
              px: 1.5,
              py: 0.6,
              border: "1.5px solid #a5b4fc",
              borderRadius: 1,
              bgcolor: "#f5f3ff",
              color: "#4f46e5",
              fontWeight: 700,
              fontSize: 12,
              cursor: !editOrderNo.trim() || !editSku.trim() ? "not-allowed" : "pointer",
              opacity: !editOrderNo.trim() || !editSku.trim() ? 0.5 : 1,
              width: "100%",
              mb: 1.5,
            }}
          >
            {isPreviewing ? "Checking…" : "Check"}
          </Box>

          {isPreviewing ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Checking Shopify…</Typography>
            </Box>
          ) : previewError ? (
            <Alert severity="error" sx={{ fontSize: 13 }}>
              {(previewError as any)?.data?.detail?.message ||
                (previewError as any)?.data?.detail ||
                "Failed to check this order."}
            </Alert>
          ) : preview ? (
            <>
              {preview.storeName && (
                <Typography variant="caption" sx={{ display: "block", color: "#6b7280", mb: 0.75 }}>
                  Searching Shopify store: <b>{preview.storeName}</b>
                  {preview.storeDomain ? ` (${preview.storeDomain})` : ""}
                </Typography>
              )}
              <RefundCheckRow
                ok={preview.orderFound}
                label={preview.orderFound ? `Order found (${preview.order?.name})` : "Order not found"}
              />
              {preview.orderFound && (
                <>
                  <RefundCheckRow
                    ok={preview.lineFound}
                    label={
                      preview.lineFound
                        ? `Matching line found — ${preview.line?.title ?? "item"} (qty ${preview.line?.currentQuantity ?? "—"} refundable)`
                        : "No line on this order matches that SKU (or it's already fully refunded)"
                    }
                  />
                  <RefundCheckRow
                    ok={preview.transactionFound}
                    label={preview.transactionFound ? "Refundable payment transaction found" : "No refundable payment transaction on this order"}
                  />
                </>
              )}
              {!canConfirm && (
                <Alert severity="warning" sx={{ mt: 1, fontSize: 12 }}>
                  This can't be refunded until every check above passes.
                </Alert>
              )}
            </>
          ) : null}

          {createError && (
            <Alert severity="error" sx={{ mt: 1.5, fontSize: 12 }}>
              {(createError as any)?.data?.detail?.message ||
                (createError as any)?.data?.detail ||
                "Refund failed."}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Box
            component="button"
            type="button"
            onClick={() => setOpen(false)}
            disabled={isRefunding}
            sx={{ px: 2, py: 0.75, border: "1px solid #d1d5db", borderRadius: 1, bgcolor: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
          >
            Cancel
          </Box>
          <Box
            component="button"
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || isRefunding || isPreviewing || !editAmount.trim()}
            sx={{
              px: 2,
              py: 0.75,
              border: "none",
              borderRadius: 1,
              bgcolor: "#b91c1c",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              cursor: !canConfirm || isRefunding ? "not-allowed" : "pointer",
              opacity: !canConfirm || isRefunding ? 0.5 : 1,
            }}
          >
            {isRefunding ? "Refunding…" : `Confirm Refund${editAmount.trim() ? ` ($${editAmount.trim()})` : ""}`}
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function fmtDate(val: string | null) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleString();
}

// Monochrome throughout — color is used only as a small status dot, never as
// a filled chip background, so the UI reads as one calm system rather than a
// row of colored badges.
function statusDotColor(status: string | null) {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "#d97706";
    case "approved":
      return "#16a34a";
    case "rejected":
    case "denied":
      return "#dc2626";
    case "completed":
      return "#2563eb";
    default:
      return "#9ca3af";
  }
}

function initials(name: string | null | undefined) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function DetailField({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ display: "block", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10, mb: 0.4 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, fontFamily: mono ? "monospace" : undefined, color: value ? "#111827" : "#9ca3af" }}
      >
        {value || "—"}
      </Typography>
    </Box>
  );
}

// ─── List table ──────────────────────────────────────────────────────────────

function RequestsTable({
  rows,
  tab,
  onRowClick,
}: {
  rows: PartRequestHeader[];
  tab: PartRequestTab;
  onRowClick: (id: string) => void;
}) {
  return (
    <TableContainer
      sx={{
        maxHeight: 600,
        overflowY: "auto",
        bgcolor: "#fff",
        borderRadius: "12px",
        border: "1px solid #eef0f3",
        boxShadow: "0 1px 2px rgba(16,24,40,0.04), 0 4px 10px rgba(16,24,40,0.04)",
      }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {["Submitted", "Customer", "Email", "Type", "Order No", "Status", "Zendesk", tab === "submitted" ? "Shopify Draft Order" : "Picked Up"].map((h) => (
              <TableCell
                key={h}
                sx={{ bgcolor: "#fafafa", color: "#9ca3af", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", py: 1.5, borderBottom: "1px solid #eef0f3" }}
              >
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4, color: "#9ca3af" }}>
                No requests found
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick(row.id)}
                sx={{
                  cursor: "pointer",
                  transition: "background-color 0.1s ease",
                  "&:hover": { bgcolor: "#f5f3ff" },
                  "& td": { borderBottom: "1px solid #f3f4f6", py: 1.6 },
                  "&:last-of-type td": { borderBottom: "none" },
                }}
              >
                <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(row.submitted_at)}</TableCell>
                <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{row.customer_name || "—"}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{row.customer_email || "—"}</TableCell>
                <TableCell sx={{ fontSize: 12, color: "#6b7280", textTransform: "capitalize" }}>
                  {row.customer_type ? row.customer_type.toLowerCase() : "—"}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{row.order_no || "—"}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                    <FiberManualRecordIcon sx={{ fontSize: 7, color: statusDotColor(row.status) }} />
                    <Box component="span" sx={{ textTransform: "capitalize" }}>{row.status || "unknown"}</Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{row.zendesk_ticket_id || "—"}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {tab === "submitted" ? row.shopify_draft_order_id || "—" : row.cxi_picked_up_at ? fmtDate(row.cxi_picked_up_at) : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ─── Detail panel ────────────────────────────────────────────────────────────

function DetailPanel({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const { data, isFetching, isError } = useGetPartRequestDetailQuery(requestId);
  const header = data?.header;
  const [draftOrderOpen, setDraftOrderOpen] = useState(false);
  // Refund requests don't need a draft order — only show the button when
  // at least one item on the request is a 'parts' item.
  const hasPartsItems = !!data?.items.some((item) => item.request_type !== "refund");
  // Same rule the "Submitted to Shopify" tab uses (status submitted, or already
  // has a draft order) — once submitted, neither Create Draft Order nor Create
  // Refund is offered, so it can't be actioned twice from any tab.
  const isSubmitted = header?.status === "submitted" || !!header?.shopify_draft_order_id;

  return (
    <>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1200 }}
        onClick={onClose}
      />
      <motion.div
        key="panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "55vw",
          backgroundColor: "#f9fafb",
          borderLeft: "1px solid #e0e0e0",
          boxShadow: "-6px 0 18px rgba(0,0,0,0.1)",
          zIndex: 1300,
          display: "flex",
          flexDirection: "column",
          borderTopLeftRadius: "20px",
          overflow: "hidden",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 3, py: 2, backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb" }}>
          <Typography variant="h6" fontWeight={700}>Part Request Detail</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {data && hasPartsItems && !isSubmitted && (
              <Box
                component="button"
                onClick={() => setDraftOrderOpen(true)}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.6,
                  height: 36,
                  px: 2,
                  border: "none",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: "none",
                  lineHeight: 1,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 2px rgba(79,70,229,0.25)",
                  transition: "filter 0.15s ease",
                  "&:hover": { filter: "brightness(0.94)" },
                }}
              >
                <AddIcon sx={{ fontSize: 16 }} />
                Create Draft Order
              </Box>
            )}
            <Box
              component="button"
              type="button"
              onClick={onClose}
              aria-label="Close"
              sx={{
                background: "none",
                border: "none",
                p: 0,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                lineHeight: 1,
                fontWeight: 400,
                color: "#9ca3af",
                cursor: "pointer",
                transition: "color 0.15s ease",
                "&:hover": { color: "#111827" },
              }}
            >
              ×
            </Box>
          </Box>
        </Box>
        {data && (
          <PartRequestDraftOrderForm
            open={draftOrderOpen}
            onClose={() => setDraftOrderOpen(false)}
            request={data}
          />
        )}

        <Box sx={{ flexGrow: 1, overflowY: "auto", p: 3 }}>
          {isFetching ? (
            <Loader title="Loading request..." />
          ) : isError || !data ? (
            <Alert severity="error">Failed to load request detail.</Alert>
          ) : (
            <>
              {/* Header info */}
              <Box sx={{ mb: 3, pb: 3, borderBottom: "1px solid #e5e7eb" }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        bgcolor: "#111827",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {initials(header?.customer_name)}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                        {header?.customer_name || "—"}
                      </Typography>
                      {header?.customer_type && (
                        <Typography variant="caption" sx={{ color: "#9ca3af", textTransform: "capitalize" }}>
                          {header.customer_type.toLowerCase()}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  {header?.status && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, border: "1px solid #e5e7eb", borderRadius: "999px", px: 1.25, py: 0.4 }}>
                      <FiberManualRecordIcon sx={{ fontSize: 8, color: statusDotColor(header.status) }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#374151", textTransform: "capitalize" }}>
                        {header.status}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box sx={{ display: "flex", gap: 3, mb: 2.5, flexWrap: "wrap" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <EmailOutlinedIcon sx={{ fontSize: 15, color: "#9ca3af" }} />
                    <Typography variant="body2" sx={{ color: header?.customer_email ? "#111827" : "#9ca3af" }}>
                      {header?.customer_email || "—"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <PhoneOutlinedIcon sx={{ fontSize: 15, color: "#9ca3af" }} />
                    <Typography variant="body2" sx={{ color: header?.customer_phone ? "#111827" : "#9ca3af" }}>
                      {header?.customer_phone || "—"}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", rowGap: 2, columnGap: 3, pt: 2, borderTop: "1px solid #f3f4f6" }}>
                  <DetailField label="Order No" value={header?.order_no} mono />
                  <DetailField label="Review Type" value={header?.review_type} />
                  <DetailField label="Retailer" value={header?.retailer_name} />
                  <DetailField label="Zendesk" value={header?.zendesk_ticket_id ? `#${header.zendesk_ticket_id}` : null} />
                  <DetailField label="Submitted" value={fmtDate(header?.submitted_at ?? null)} />
                  <DetailField label="Picked Up" value={header?.cxi_picked_up_at ? fmtDate(header.cxi_picked_up_at) : "Not yet"} />
                  <DetailField label="Shopify Draft Order" value={header?.shopify_draft_order_id || "Not submitted"} mono={!!header?.shopify_draft_order_id} />
                </Box>

                {(header?.address1 as string) && (
                  <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px solid #f3f4f6" }}>
                    <Typography variant="caption" sx={{ display: "block", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10, mb: 0.4 }}>
                      Ship to
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#111827" }}>
                      {header?.address1 as string}{header?.address2 ? `, ${header.address2}` : ""}, {header?.city as string}, {header?.state as string} {header?.zip as string}, {header?.country as string}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Items + parts */}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: "#374151" }}>
                Items ({data.items.length})
              </Typography>
              {data.items.map((item, itemIndex) => (
                <Box
                  key={item.id}
                  sx={{
                    py: 2.5,
                    borderBottom: itemIndex === data.items.length - 1 ? "none" : "1px solid #f0f0f0",
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: item.reason || item.description ? 1.5 : 0.5, gap: 1.5 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{item.product_name || item.sku || `Item #${item.item_no}`}</Typography>
                      <Typography variant="caption" sx={{ color: "#9ca3af" }}>SKU: {item.sku || "—"} · Lot: {item.lot_number || "—"}</Typography>
                    </Box>
                    {item.item_price != null && (
                      <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>${item.item_price}</Typography>
                    )}
                  </Box>

                  {(item.reason || item.description) && (
                    <Box sx={{ mb: 1.5 }}>
                      {item.reason && (
                        <Typography variant="body2" sx={{ mb: 0.25 }}>
                          <Box component="span" sx={{ fontWeight: 700, color: "#6b7280" }}>Reason: </Box>
                          {item.reason}
                        </Typography>
                      )}
                      {item.description && (
                        <Typography variant="body2" sx={{ color: "#6b7280" }}>{item.description}</Typography>
                      )}
                    </Box>
                  )}

                  {item.image_urls && item.image_urls.length > 0 && (
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
                      {item.image_urls.map((url, i) => (
                        <MuiLink
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ fontSize: 11, fontWeight: 600, color: "#374151", px: 1, py: 0.4, border: "1px solid #e5e7eb", borderRadius: 1, textDecoration: "none" }}
                        >
                          Photo {i + 1}
                        </MuiLink>
                      ))}
                    </Box>
                  )}

                  {item.request_type === "refund" && (
                    <Box
                      sx={{
                        mb: item.parts.length > 0 ? 1.5 : 0.5,
                        pl: 1.5,
                        borderLeft: "2.5px solid #dc2626",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box>
                        <Typography variant="caption" sx={{ display: "block", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10 }}>
                          Refund requested
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#111827" }}>
                          {item.item_total_refund_amount != null ? `$${Number(item.item_total_refund_amount).toFixed(2)}` : "—"}
                        </Typography>
                      </Box>
                      {!isSubmitted && (
                        <RefundAction
                          requestId={header?.id ?? null}
                          orderNo={header?.order_no ?? null}
                          retailerNo={header?.retailer_no ?? null}
                          sku={item.sku}
                          amount={item.item_total_refund_amount}
                        />
                      )}
                    </Box>
                  )}

                  {item.parts.length > 0 && (
                    <Table size="small" sx={{ mt: 0.5 }}>
                      <TableHead>
                        <TableRow>
                          {["Part #", "Part Name", "SKU", "Qty", "Refund Cat", "Refund %", "Refund Max"].map((h) => (
                            <TableCell key={h} sx={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: "1px solid #e5e7eb", px: 0, pr: 2 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {item.parts.map((part) => (
                          <TableRow key={part.id} sx={{ "&:last-of-type td": { borderBottom: 0 } }}>
                            <TableCell sx={{ fontSize: 12, px: 0, pr: 2 }}>{part.part_number || "—"}</TableCell>
                            <TableCell sx={{ fontSize: 12, px: 0, pr: 2 }}>{part.part_name || "—"}</TableCell>
                            <TableCell sx={{ fontSize: 12, px: 0, pr: 2 }}>{part.part_sku || "—"}</TableCell>
                            <TableCell sx={{ fontSize: 12, px: 0, pr: 2 }}>{part.quantity ?? "—"}</TableCell>
                            <TableCell sx={{ fontSize: 12, px: 0, pr: 2 }}>{part.refund_cat || "—"}</TableCell>
                            <TableCell sx={{ fontSize: 12, px: 0, pr: 2 }}>{part.refund_percent != null ? `${part.refund_percent}%` : "—"}</TableCell>
                            <TableCell sx={{ fontSize: 12, px: 0 }}>{part.refund_max != null ? `$${part.refund_max}` : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              ))}
            </>
          )}
        </Box>
      </motion.div>
    </>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function PartsRequests() {
  const [tab, setTab] = useState<PartRequestTab>("needs_review");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const { data, isFetching, isError } = useGetPartRequestsQuery({ tab, q: query, page, page_size: pageSize });

  const rows = useMemo(() => data?.data ?? [], [data]);

  const handleTabClick = (key: PartRequestTab) => {
    setTab(key);
    setPage(1);
  };

  const handleSearch = () => {
    setQuery(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setQuery("");
    setPage(1);
  };

  return (
    <Box sx={{ pt: 2, pr: 2, pb: 2, pl: "80px", height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {/* Filter tabs */}
        <Box sx={{ display: "flex", gap: 3, mb: 3, borderBottom: "1px solid #e5e7eb" }}>
          {TABS.map((t) => {
            const isActive = t.key === tab;
            return (
              <Box
                key={t.key}
                component="button"
                onClick={() => handleTabClick(t.key)}
                sx={{
                  background: "none",
                  border: "none",
                  borderBottom: "2px solid",
                  borderColor: isActive ? "#4f46e5" : "transparent",
                  borderRadius: 0,
                  px: 0.25,
                  pb: 1.25,
                  color: isActive ? "#4f46e5" : "#6b7280",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "color 0.15s ease",
                  "&:hover": { color: isActive ? "#4f46e5" : "#111827" },
                }}
              >
                {t.label}
              </Box>
            );
          })}
        </Box>

        {/* Search bar — one seamless control, pagination on the right */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2.5, flexWrap: "wrap" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "stretch",
              height: 44,
              width: 460,
              bgcolor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
              overflow: "hidden",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              "&:hover": { borderColor: "#d1d5db" },
              "&:focus-within": {
                borderColor: "#4f46e5",
                boxShadow: "0 0 0 3px rgba(79,70,229,0.12)",
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, gap: 1.1, pl: 2, pr: 1 }}>
              <SearchIcon sx={{ fontSize: 18, color: "#9ca3af", flexShrink: 0 }} />
              <Box
                component="input"
                placeholder="Search by customer name, email, or order number…"
                value={searchInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSearch()}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  height: "100%",
                  border: "none",
                  outline: "none",
                  background: "none",
                  fontSize: 13.5,
                  fontFamily: "inherit",
                  color: "#111827",
                  "&::placeholder": { color: "#9ca3af" },
                }}
              />
              {searchInput && (
                <Box
                  component="button"
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                  sx={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    borderRadius: "50%",
                    bgcolor: "#f3f4f6",
                    color: "#6b7280",
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                    "&:hover": { bgcolor: "#e5e7eb", color: "#111827" },
                  }}
                >
                  <ClearIcon sx={{ fontSize: 13 }} />
                </Box>
              )}
            </Box>
            <Box
              component="button"
              onClick={handleSearch}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 2.5,
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.01em",
                cursor: "pointer",
                transition: "filter 0.15s ease",
                "&:hover": { filter: "brightness(0.94)" },
              }}
            >
              <SearchIcon sx={{ fontSize: 15 }} />
              Search
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
            {data && !isFetching && (
              <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                {data.total_records} request{data.total_records !== 1 ? "s" : ""}
              </Typography>
            )}
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

        {/* Table */}
        {isFetching ? (
          <Loader />
        ) : isError ? (
          <Alert severity="error">Failed to load part requests.</Alert>
        ) : (
          <RequestsTable rows={rows} tab={tab} onRowClick={setSelectedRequestId} />
        )}

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", alignItems: "center", mt: 3 }}>
            <Box
              component="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              sx={{
                background: "none",
                border: "none",
                color: page <= 1 ? "#d1d5db" : "#374151",
                fontWeight: 600,
                fontSize: 13,
                cursor: page <= 1 ? "not-allowed" : "pointer",
                "&:hover": page <= 1 ? {} : { color: "#4f46e5" },
              }}
            >
              Prev
            </Box>
            <Typography variant="caption" sx={{ color: "#9ca3af" }}>
              Page {data.current_page} of {data.total_pages}
            </Typography>
            <Box
              component="button"
              disabled={page >= data.total_pages}
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              sx={{
                background: "none",
                border: "none",
                color: page >= data.total_pages ? "#d1d5db" : "#374151",
                fontWeight: 600,
                fontSize: 13,
                cursor: page >= data.total_pages ? "not-allowed" : "pointer",
                "&:hover": page >= data.total_pages ? {} : { color: "#4f46e5" },
              }}
            >
              Next
            </Box>
          </Box>
        )}
      </Box>

      <AnimatePresence>
        {selectedRequestId && (
          <DetailPanel requestId={selectedRequestId} onClose={() => setSelectedRequestId(null)} />
        )}
      </AnimatePresence>
    </Box>
  );
}
