"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Paper, Box, Typography } from "@mui/material";
import AgGridTable from "@/components/ag-grid";
import useQTYone from "@/hooks/Ag-Grid/useQTYone";
import { qty_one } from "@/constants/Grid-Table/ColDefs";
// import { useGetQTYoneInventoryTableQuery } from "@/redux/services/InventoryApi";
import { useLazyGetQTYoneInventoryTableQuery } from "@/redux/services/InventoryApi";
import { getRowStyle } from "@/utils/gridStyles";
import Loader from "@/components/Common/Loader";
import test from "node:test";
import { useGetUserPreferencesQuery } from "@/redux/services/profileApi";
import { useColumnPreferences } from "@/hooks/useColumnPreferences";
import { exportToExcel } from "@/utils/exportToExcel";

interface InventoryQTYone {
  location_code?: string;
  item_no?: string;
  setSelectedQtyoneItem?: (item: any) => void;
}

const InventoryQTYone: React.FC<InventoryQTYone> = ({
  location_code,
  item_no,
  setSelectedQtyoneItem,
}) => {
  // Get user ID from localStorage
  // const userId = localStorage.getItem("userId") || undefined;

  // // Fetch user preferences for column ordering filtered by endpoint
  // const { data: userPreferences } = useGetUserPreferencesQuery({
  //   user_id: userId,
  //   endpoint: "qty_available_pop_up1",
  // });

  // // Sort columns based on user preferences
  // const filteredColumns = useMemo(() => {
  //   // If no preferences data, return all default columns
  //   if (
  //     !userPreferences ||
  //     !(userPreferences as any)?.data ||
  //     (userPreferences as any).data.length === 0
  //   ) {
  //     return qty_one;
  //   }

  //   const prefsData = (userPreferences as any).data;

  //   // Create a map of preference field to sort order
  //   const preferenceMap = new Map(
  //     prefsData.map((pref: any) => [pref.preference, pref.preference_sort])
  //   );

  //   // Filter columns that exist in preferences and sort by preference_sort
  //   const orderedColumns = qty_one
  //     .filter((col) => preferenceMap.has(col.field))
  //     .sort((a, b) => {
  //       const sortA = (preferenceMap.get(a.field) as number) || 999;
  //       const sortB = (preferenceMap.get(b.field) as number) || 999;
  //       return sortA - sortB;
  //     });

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
    endpoint: "qty_available_pop_up1",
    tabName: "InventoryQTYone",
    defaultColumns: qty_one,
    disableTabManagement: false,
    parentTabName: "Inventory",
  });
  // Apply column customization
  const tiCol = useQTYone(filteredColumns);
  const handleExport = () => {
    exportToExcel({
      data: rowData,
      columns: tiCol,
      fileName: "Lot Level Detail.xlsx",
    });
  };

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // const { data, isLoading, isFetching } = useGetQTYoneInventoryTableQuery(
  //   {
  //     page,
  //     page_size: pageSize,
  //     location_code: location_code,
  //     item_no: item_no,
  //   },
  //   {
  //     // skip: !location_code && !item_no,
  //     skip: !location_code || !item_no,
  //   }
  // );
  const [getQTYone, { data, isLoading, isFetching }] =
    useLazyGetQTYoneInventoryTableQuery();

  // Trigger manually when props change or drawer opens
  useEffect(() => {
    if (location_code && item_no) {
      getQTYone({
        location_code,
        item_no,
        page,
        page_size: pageSize,
        source: "Inventory",
      });
    }
  }, [location_code, item_no, page, pageSize, getQTYone]);

  const rowData = useMemo(() => {
    const items = data?.data || data || [];
    return Array.isArray(items)
      ? items.map((item: any) => ({
          item_no: item.item_no ?? "-",
          description: item.description ?? "-",
          description_2: item.description_2 ?? "-",
          location_code: item.location_code ?? "-",
          zone_code: item.zone_code ?? "-",
          lot_no: item.lot_no ?? "-",
          total_qty: item.total_qty ?? 0,
          parts_version: item.parts_version ?? 0,
          test_quality: item.test_quality ?? "-",
          blocked: item.blocked ?? "-",
        }))
      : [];
  }, [data]);

  const onRowClicked = (params: any) => {
    const clickedId = params.data.item_no;
    if (highlightedId === clickedId) {
      setHighlightedId(null);
      setSelectedQtyoneItem?.(null);
    } else {
      setHighlightedId(clickedId);
      setSelectedQtyoneItem?.(params.data);
    }
  };

  useEffect(() => {
    if (data?.data?.length > 0) {
      setSelectedQtyoneItem?.(data.data[0]);
    }
  }, [data, setSelectedQtyoneItem]);
  return (
    <Box sx={{ width: "100%", minHeight: "100vh", p: 1 }}>
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
        Lot Level Detail
      </Typography>
      <Paper sx={{ p: 2, borderRadius: 3, height: "100vh" }}>
        {isLoading || isFetching ? (
          <Loader />
        ) : (
          <AgGridTable
            key={data?.data?.length || 0}
            rowData={rowData}
            columnDefs={tiCol}
            onRowClicked={onRowClicked}
            getRowStyle={getRowStyle(highlightedId)}
            enablePagination
            currentPage={page}
            totalPages={data?.total_pages || 1}
            onPageChange={setPage}
            pagination
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
      </Paper>
    </Box>
  );
};

export default InventoryQTYone;
