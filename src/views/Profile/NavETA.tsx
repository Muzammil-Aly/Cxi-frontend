"use client";
import { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import AgGridTable from "@/components/ag-grid";
import { nav_eta } from "@/constants/Grid-Table/ColDefs";
// import useLocationItemLot from "@/hooks/Ag-Grid/useLocationItemLot";
import useNavETA from "@/hooks/Ag-Grid/useNavETA";
import Loader from "@/components/Common/Loader";
import { useGetNavETAQuery } from "@/redux/services/profileApi";
import { getRowStyle } from "@/utils/gridStyles";
import { useColumnPreferences } from "@/hooks/useColumnPreferences";
import { exportToExcel } from "@/utils/exportToExcel";

interface Props {
  orderId?: string;
  sku?: string;
  setSelectedOrderItem?: React.Dispatch<React.SetStateAction<any | null>>;
  orderItemSec?: boolean;
  filters?: string;
  source?: string;
}

const NavETA = ({ sku, source }: Props) => {
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
    endpoint: "nav_eta",
    tabName: "NavETA",
    defaultColumns: nav_eta,
    disableTabManagement: false,
    parentTabName: "orders", // Refetch when orders tab is activated
  });

  // Apply column customization
  const orderItemsCol = useNavETA(filteredColumns);
  const handleExport = () => {
    exportToExcel({ data: rowData, columns: orderItemsCol, fileName: "NavETA.xlsx" });
  };
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [highlightedId, setHighlightedId] = useState<string | number | null>(
    null,
  );

  // Fetch location item lot data (based on SKU)
  const { data, isLoading, isFetching } = useGetNavETAQuery(
    {
      page,
      page_size: pageSize,
      sku: sku || "",
      source,
    },
    { skip: !sku }, // Only fetch if sku is provided
  );

  // Map response data for AgGridTable
  const rowData = useMemo(() => {
    const items = data?.data || data || [];
    if (!Array.isArray(items)) return [];

    return items.map((item: any) => ({
      item_no: item.item_no,
      description: item.description,
      location_code: item.location_code,
      qty: item.qty,
      qty_available: item.qty_available,
      avail_qty_to_commit: item.avail_qty_to_commit,
      qty_on_blocked_lot_bin: item.qty_on_blocked_lot_bin,
      expected_receipt_qty: item.expected_receipt_qty,
      eta: item.eta,
      last_inventory_sync_date: item.last_inventory_sync_date,
      last_inventory_sync_time: item.last_inventory_sync_time,
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
      {/* Title */}
      <Typography
        className="drag-handle"
        variant="caption"
        sx={{
          fontWeight: 600,
          color: "#fff",
          background: "#1976d2",
          px: 1.5,
          py: 0.5,
          fontSize: "1em",
          borderRadius: "3px 5px 5px 3px",
          position: "relative",
          mb: 2,
          display: "inline-block",
          "::before": {
            content: '""',
            position: "absolute",
            left: -8,
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
        NavETA{sku ? ` — ${sku}` : ""}
      </Typography>

      {/* Loader or Table */}
      {isLoading || isFetching ? (
        <Loader />
      ) : rowData.length === 0 ? (
        <Typography color="text.secondary" fontSize={14}>
          {sku
            ? `No data found for Item No "${sku}"`
            : "Please select an Item No to view data"}
        </Typography>
      ) : (
        <AgGridTable
          rowData={rowData}
          columnDefs={orderItemsCol}
          height={480}
          enablePagination
          getRowStyle={getRowStyle(highlightedId)}
          currentPage={page}
          totalPages={data?.total_pages || 1}
          onPageChange={(newPage: any) => setPage(newPage)}
          pagination={false}
          currentMenu="support_tickets"
          paginationPageSize={pageSize}
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

export default NavETA;
