"use client";
import { useEffect, useCallback } from "react";
import AgGridTable from "@/components/ag-grid";
import { orderItems } from "@/constants/Grid-Table/ColDefs";
import useOrderItems from "@/hooks/Ag-Grid/useOrderItems";
import { Box, Typography } from "@mui/material";
import React, { useState, useMemo } from "react";
import Loader from "@/components/Common/Loader";
import { useGetOrderItemsQuery } from "@/redux/services/profileApi";
import { getRowStyle } from "@/utils/gridStyles";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { useDispatch } from "react-redux";
import {
  setActiveTab,
  setOrderItemsOpen,
  setTouchupsOpen,
  setTouchupPensOpen,
  resetAllTabs,
} from "@/redux/slices/tabSlice";
import { useColumnPreferences } from "@/hooks/useColumnPreferences";
import { exportToExcel } from "@/utils/exportToExcel";
interface Props {
  orderId: string;
  setSelectedOrderItem?: React.Dispatch<React.SetStateAction<any | null>>;
  orderItemSec?: boolean;
  filters?: string;
  onCellClick?: (type: "sku" | "lot_no", data: any) => void;
}
interface OrderItem {
  line_no: string | number;
  order_id: string;
  sku: string;
  product_name: string;
  item_type: string;
  brand: string;
  collection: string;
  quantity: number;
  amount: number;
  lot_no: string;
}
const OrderItems = ({
  orderId,
  setSelectedOrderItem,
  orderItemSec,
  filters,
  onCellClick,
}: Props) => {
  // Wrapper function to handle all cell click types
  const handleCellClick = useCallback(
    (type: "qty" | "sku" | "lot_no" | "so" | "po", data: any) => {
      // Only call onCellClick for sku and lot_no types
      if (onCellClick && (type === "sku" || type === "lot_no")) {
        onCellClick(type, data);
      }
    },
    [onCellClick],
  );

  // Generate base columns with handleCellClick
  const baseColumns = useMemo(
    () => orderItems(handleCellClick),
    [handleCellClick],
  );

  // Use column preferences hook
  // OrderItems is always nested (requires orderId prop), so always disable tab management
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
    endpoint: "customer_order_items",
    tabName: "OrderItems",
    defaultColumns: baseColumns,
    // disableTabManagement: true,
    // parentTabName: "Orders", // Refetch when Orders tab is activated
  });

  const orderItemsCol = useOrderItems(filteredColumns);
  const { isActive, activeTabName, isTouchupsOpen } = useSelector(
    (state: RootState) => state.tab,
  );
  const [highlightedId, setHighlightedId] = useState<string | number | null>(
    null,
  );
  const [selectedItemDetail, setSelectedItemDetail] =
    useState<OrderItem | null>(null);

  // Fetch order items from API using the orderId
  const { data, isLoading, isFetching, refetch } = useGetOrderItemsQuery(
    { orderId, source: "Orders" },
    { skip: !orderId },
  );
  const dispatch = useDispatch();
  // Map API data to rowData for AgGrid
  const rowData = useMemo(() => {
    const items = data?.data || data || [];
    return Array.isArray(items)
      ? items.map((item: any) => ({
          line_no: item.line_no,
          order_id: item.order_id,
          sku: item.sku,
          description: item.description,
          description_2: item.description_2,
          item_type: item.item_type,
          brand: item.brand,
          collection: item.collection,
          quantity: item.quantity,
          tracking: item.tracking,
          fulfillment_status: item.fulfillment_status,
          bol_no: item.bol_no,
          amount: item.amount,
          lot_no: item.lot_no,
          // earliest_eta: item.earliest_eta,
          earliest_eta: item.earliest_eta
            ? item.earliest_eta.split("T")[0]
            : "N/A",

          earliest_eta_to_rex: item.earliest_eta_to_rex,
          alternative_status: item.alternative_status,
          sales_order_aging_days: item.sales_order_aging_days,
          shipping_agent_code: item.shipping_agent_code || "N/A",
          url: item.url || "N/A",
          estimated_delivery_date: item.estimated_delivery_date
            ? item.estimated_delivery_date.split("T")[0]
            : "N/A",
        }))
      : [];
  }, [data]);

  const [orderItemSecOpen, setOrderItemSecOpen] = useState<boolean>(false);

  const handleExport = () => {
    exportToExcel({ data: rowData, columns: orderItemsCol, fileName: "Order_Items.xlsx" });
  };

  const onRowClicked = (params: any) => {
    const event = params?.event;
    if ((event?.target as HTMLElement).closest(".MuiIconButton-root")) {
      return; // ignore clicks from any MUI icon button
    }

    // Ignore clicks on clickable cells (SKU and lot_no) and copy buttons
    const clickedElement = event?.target as HTMLElement;
    const clickedOnClickableCell =
      clickedElement?.closest("span[style*='cursor: pointer']") ||
      clickedElement?.closest("span[style*='cursor:pointer']") ||
      clickedElement?.closest("button") ||
      clickedElement?.tagName === "BUTTON" ||
      clickedElement?.tagName === "svg" ||
      clickedElement?.tagName === "path";

    if (clickedOnClickableCell) {
      return; // ignore clicks from clickable cells and copy buttons
    }

    if (selectedItemDetail?.sku === params.data.sku) {
      setSelectedItemDetail(null);
      setSelectedOrderItem?.(null);
      dispatch(setTouchupsOpen(false));
    } else {
      setSelectedItemDetail(params.data as OrderItem);
      setSelectedOrderItem?.(params.data as OrderItem);
      setOrderItemSecOpen(true);

      //  setOrderItemSec(true);
    }
  };

  useEffect(() => {
    if (isTouchupsOpen && data?.data?.length > 0) {
      setSelectedOrderItem?.(data.data[0]);
      setSelectedItemDetail(data.data[0]);
    }
  }, [data]);
  console.log("touchupsec", orderItemSecOpen);
  console.log("selectedItemDetail", selectedItemDetail);

  return (
    <Box
      display="flex"
      flexDirection="column" // stack vertically
      width="100%"
      justifyContent="center"
      alignItems="center"
      // className="drag-handle"
    >
      {/* Show Order ID */}
      <Typography
        className="drag-handle"
        variant="caption"
        sx={{
          fontWeight: 600,
          color: "#fff",
          background: "#1976d2",
          px: 1.5, // smaller horizontal padding
          py: 0.5, // smaller vertical padding
          fontSize: "1em", // very small text
          borderRadius: "3px 5px 5px 3px",
          position: "relative",
          mb: 2,
          display: "inline-block",
          "::before": {
            content: '""',
            position: "absolute",
            left: -8, // smaller triangle
            top: "50%",
            transform: "translateY(-50%)",
            width: 0,
            height: 0,
            borderTop: "8px solid transparent",
            borderBottom: "8px solid transparent",
            borderRight: "8px solid #1976d2",
          },
        }}
      >
        Order ID: {orderId ?? "N/A"}
      </Typography>

      {/* Loader or Table */}
      {isLoading || isFetching ? (
        <Loader />
      ) : (
        <AgGridTable
          rowData={rowData}
          columnDefs={orderItemsCol}
          height={480}
          enablePagination={false}
          onRowClicked={onRowClicked}
          getRowStyle={getRowStyle(highlightedId)}
          onColumnMoved={handleColumnMoved}
          onResetColumns={handleResetColumns}
          storageKey={storageKey}
          allColumnsWithVisibility={allColumnsWithVisibility}
          onToggleColumnVisibility={toggleColumnVisibility}
          onUpdateColumnsVisibility={updateColumnsVisibility}
          isVisibilityLoading={isSaving}
          onExport={handleExport}
        />
      )}
    </Box>
  );
};

export default OrderItems;
