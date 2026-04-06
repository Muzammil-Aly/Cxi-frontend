"use client";
import { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import AgGridTable from "@/components/ag-grid";
import { location_item_lot } from "@/constants/Grid-Table/ColDefs";
import useLocationItemLot from "@/hooks/Ag-Grid/useLocationItemLot";
import Loader from "@/components/Common/Loader";
import { useGetLocationItemLotQuery } from "@/redux/services/profileApi";
import { getRowStyle } from "@/utils/gridStyles";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../redux/store";
import { setTouchupsOpen } from "@/redux/slices/tabSlice";
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

interface ZPartETAItem {
  document_no: string;
  external_document_no: string;
  no: string;
  associated_whole_unit: string;
  description: string;
  alternative_status: string;
  customer_no: string;
  order_date: string;
  sales_order_aging_days: number;
  earliest_eta: string;
  earliest_eta_to_rex: string;
  earliest_eta_to_unga: string;
  earliest_eta_to_unnj: string | null;
  earliest_eta_to_ggtj: string | null;
  "Days to Earliest ETA": number;
  "Days to Rex ETA": number;
  qty: number;
}

const LocationItemLot = ({ sku, source }: Props) => {
  // Use column preferences hook
  // LocationItemLot is always nested (requires sku prop), so always disable tab management
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
    endpoint: "location_item_lot",
    tabName: "LocationItemLot",
    defaultColumns: location_item_lot,
    disableTabManagement: false,
    parentTabName: "orders", // Refetch when orders tab is activated
  });

  // Apply column customization
  const orderItemsCol = useLocationItemLot(filteredColumns);
  const handleExport = () => {
    exportToExcel({ data: rowData, columns: orderItemsCol, fileName: "Location_Item_Lot.xlsx" });
  };
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [highlightedId, setHighlightedId] = useState<string | number | null>(
    null,
  );
  const [selectedItemDetail, setSelectedItemDetail] =
    useState<ZPartETAItem | null>(null);

  //  Fetch filtered ZPart ETA data (based on SKU)
  const { data, isLoading, isFetching } = useGetLocationItemLotQuery(
    {
      page,
      page_size: pageSize,
      sku: sku || "",
      source,
    },
    { skip: !sku }, // Only fetch if sku is provided
  );

  //  Map the response data to table format
  const rowData = useMemo(() => {
    const items = data?.data || data || [];
    if (!Array.isArray(items)) return [];

    //   return items.map((item: any) => ({
    //     sku: item.sku,
    //     parts_item_no: item.parts_item_no,
    //     parts_item_name: item.parts_item_name,
    //     parts_item_name_2: item.parts_item_name_2,
    //     potential_qty_available: item.potential_qty_available,
    //   }));
    // }, [data]);
    return items.map((item: any) => ({
      item_no: item.item_no,
      lot_no: item.lot_no,
      location_code: item.location_code,
      qty: item.qty,
      lot_test_quality: item.lot_test_quality,
      blocked: item.blocked,
      parts_version: item.parts_version,
      transaction_specification: item.transaction_specification,
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
        Location Item Lot{sku ? `— ${sku}` : ""}
      </Typography>

      {/* Loader or Table */}
      {isLoading || isFetching ? (
        <Loader />
      ) : rowData.length === 0 ? (
        <Typography color="text.secondary" fontSize={14}>
          {sku
            ? `No  data found for SKU "${sku}"`
            : "Please select an SKU to view  data"}
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

export default LocationItemLot;
