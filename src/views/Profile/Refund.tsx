"use client";
import { useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import AgGridTable from "@/components/ag-grid";
import { Refunds } from "@/constants/Grid-Table/ColDefs";
import useRefundColumn from "@/hooks/Ag-Grid/useRefundColumn";
import Loader from "@/components/Common/Loader";
import {
  useGetRefundsQuery,
  useGetUserPreferencesQuery,
} from "@/redux/services/profileApi";
import { getRowStyle } from "@/utils/gridStyles";
import { useColumnPreferences } from "@/hooks/useColumnPreferences";
import { exportToExcel } from "@/utils/exportToExcel";

interface Props {
  customer_id?: string;
  setSelectedOrderItem?: React.Dispatch<React.SetStateAction<any | null>>;
  orderItemSec?: boolean;
  filters?: string;
}

interface ReturnItem {
  doc_no_: string;
  doc_type: string;
  external_document_no_: string;
  customer_id: string;
  sell_to_customer_no_: string;
  profit_name: string;
  created_date: string;
  order_date: string;
  posting_date: string;
  doc_status: string;
  item_no: string;
  description: string | null;
  description_2: string | null;
  qty_: number;
  gross_amount: number;
  amt_: number;
  entered_by: string;
  return_reason_code: string;
}

const Refund = ({ customer_id }: Props) => {
  // Get user ID from localStorage
  // const userId = localStorage.getItem("userId") || undefined;

  // // Fetch user preferences for column ordering filtered by endpoint
  // const { data: userPreferences } = useGetUserPreferencesQuery({
  //   user_id: userId,
  //   endpoint: "orders_refund",
  // });

  // // Sort columns based on user preferences
  // const filteredColumns = useMemo(() => {
  //   // If no preferences data, return all default columns
  //   if (
  //     !userPreferences ||
  //     !(userPreferences as any)?.data ||
  //     (userPreferences as any).data.length === 0
  //   ) {
  //     return Refunds;
  //   }

  //   const prefsData = (userPreferences as any).data;

  //   // Create a map of preference field to sort order
  //   const preferenceMap = new Map(
  //     prefsData.map((pref: any) => [pref.preference, pref.preference_sort])
  //   );

  //   // Filter columns that exist in preferences and sort by preference_sort
  //   const orderedColumns = Refunds.filter((col) =>
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
    endpoint: "orders_refund",
    tabName: "refunds",
    defaultColumns: Refunds,
  });
  const columns = useRefundColumn(filteredColumns);
  const handleExport = () => {
    exportToExcel({ data: rowData, columns, fileName: "Refunds.xlsx" });
  };

  const [highlightedId, setHighlightedId] = useState<string | number | null>(
    null
  );

  // Fetch returns data filtered by customer_id
  const { data, isLoading, isFetching } = useGetRefundsQuery(
    { customer_id: customer_id || "", source: "Refunds" },
    { skip: !customer_id }
  );

  // Map response to table format
  const rowData = useMemo(() => {
    const items = data?.data || data || [];
    if (!Array.isArray(items)) return [];

    return items.map((item: any) => ({
      doc_no_: item.doc_no_,
      doc_type: item.doc_type,
      external_document_no_: item.external_document_no_,
      customer_id: item.customer_id,
      sell_to_customer_no_: item.sell_to_customer_no_,
      profit_name: item.profit_name,
      created_date: item.created_date ? item.created_date.split("T")[0] : "N/A",

      order_date: item.order_date ? item.order_date.split("T")[0] : "N/A",
      posting_date: item.posting_date ? item.posting_date.split("T")[0] : "N/A",
      doc_status: item.doc_status,
      item_no: item.item_no,
      description: item.description,
      description_2: item.description_2,
      qty_: item.qty_,
      gross_amount: item.gross_amount,
      amt_: item.amt_,
      entered_by: item.entered_by,
      return_reason_code: item.return_reason_code,
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
            ? `No refund data found for Customer ID "${customer_id}"`
            : "Please select a Customer ID to view refund data"}
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

export default Refund;
