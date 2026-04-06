"use client";
import { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import AgGridTable from "@/components/ag-grid";
import { Returns } from "@/constants/Grid-Table/ColDefs";
import useZpartETA from "@/hooks/Ag-Grid/useLocationItemLot";
import useReturnColumn from "@/hooks/Ag-Grid/useReturnColumn";
import Loader from "@/components/Common/Loader";
import {
  useGetReturnsQuery,
  useGetUserPreferencesQuery,
} from "@/redux/services/profileApi";
import { getRowStyle } from "@/utils/gridStyles";
import { useColumnPreferences } from "@/hooks/useColumnPreferences";
import { exportToExcel } from "@/utils/exportToExcel";

interface Props {
  orderId?: string;
  customer_id?: string;
  setSelectedOrderItem?: React.Dispatch<React.SetStateAction<any | null>>;
  orderItemSec?: boolean;
  filters?: string;
}

interface Return {
  rma: string;
  customer_id: string;
  sell_to_customer_no: string;
  sell_to_customer_name: string;
  item: string;
  description: string;
  status: string;
  quantity: number;
  line_amount: number;
  return_reason_code: string;
  return_reason: string;
  return_shipment_status: string;
  tracking_no: string;
  carrier_name: string;
  deliverydate: string;
  pickupdate: string;
  pickupcontactname: string;
  your_reference: string;
  shopify_refund_date: string | null;
  shopify_refund_quantity: number | null;
  shopify_refund_subtotal: number | null;
  shopify_refund_tax: number | null;
  shopify_refund_note: string | null;
  sku?: string;
}

const Return = ({ customer_id }: Props) => {
  // Get user ID from localStorage
  // const userId = localStorage.getItem("userId") || undefined;

  // // Fetch user preferences for column ordering filtered by endpoint
  // const { data: userPreferences } = useGetUserPreferencesQuery({
  //   user_id: userId,
  //   endpoint: "orders_return",
  // });

  // // Sort columns based on user preferences
  // const filteredColumns = useMemo(() => {
  //   // If no preferences data, return all default columns
  //   if (
  //     !userPreferences ||
  //     !(userPreferences as any)?.data ||
  //     (userPreferences as any).data.length === 0
  //   ) {
  //     return Returns;
  //   }

  //   const prefsData = (userPreferences as any).data;

  //   // Create a map of preference field to sort order
  //   const preferenceMap = new Map(
  //     prefsData.map((pref: any) => [pref.preference, pref.preference_sort])
  //   );

  //   // Filter columns that exist in preferences and sort by preference_sort
  //   const orderedColumns = Returns.filter((col) =>
  //     preferenceMap.has(col.field)
  //   ).sort((a, b) => {
  //     const sortA = (preferenceMap.get(a.field) as number) || 999;
  //     const sortB = (preferenceMap.get(b.field) as number) || 999;
  //     return sortA - sortB;
  //   });

  //   return orderedColumns;
  // }, [userPreferences]);
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
    endpoint: "orders_return",
    tabName: "returns",
    defaultColumns: Returns,
  });
  const columns = useReturnColumn(filteredColumns);
  const handleExport = () => {
    exportToExcel({ data: rowData, columns, fileName: "Returns.xlsx" });
  };

  const [highlightedId, setHighlightedId] = useState<string | number | null>(
    null
  );

  // Fetch filtered ZPart ETA data (based on SKU)
  const { data, isLoading, isFetching } = useGetReturnsQuery(
    { customer_id: customer_id || "", source: "Returns" },
    { skip: !customer_id } // Only fetch if sku is provided
  );

  // Map the response data to table format
  const rowData = useMemo(() => {
    const items = data?.data || data || [];
    if (!Array.isArray(items)) return [];

    return items.map((item: any) => ({
      rma: item.rma,
      customer_id: item.customer_id,
      sell_to_customer_no: item.sell_to_customer_no,
      sell_to_customer_name: item.sell_to_customer_name,
      item: item.item,
      description: item.description,
      status: item.status,
      quantity: item.quantity,
      line_amount: item.line_amount,
      return_reason_code: item.return_reason_code,
      return_reason: item.return_reason,
      return_shipment_status: item.return_shipment_status,
      tracking_no: item.tracking_no,
      carrier_name: item.carrier_name,
      deliverydate: item.deliverydate,
      pickupdate: item.pickupdate,
      pickupcontactname: item.pickupcontactname,
      your_reference: item.your_reference,
      shopify_refund_date: item.shopify_refund_date,
      shopify_refund_quantity: item.shopify_refund_quantity,
      shopify_refund_subtotal: item.shopify_refund_subtotal,
      shopify_refund_tax: item.shopify_refund_tax,
      shopify_refund_note: item.shopify_refund_note,
      sku: item.sku,
    }));
  }, [data]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      width="100%"
      justifyContent="center"
      alignItems="center"
    >
      {/* Loader or Table */}
      {isLoading || isFetching ? (
        <Loader />
      ) : rowData.length === 0 ? (
        <Typography color="text.secondary" fontSize={14}>
          {customer_id
            ? `No return data found for Customer ID "${customer_id}"`
            : "Please select a Customer ID to view return data"}
        </Typography>
      ) : (
        <AgGridTable
          rowData={rowData}
          columnDefs={columns}
          height={480}
          enablePagination={false}
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

export default Return;
