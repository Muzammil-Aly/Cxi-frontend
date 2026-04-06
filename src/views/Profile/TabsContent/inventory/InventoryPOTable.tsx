"use client";
import React, { useState, useMemo, useEffect } from "react";
import AgGridTable from "@/components/ag-grid";
import useInventoryColumn from "@/hooks/Ag-Grid/useInventoryColumn";
import usePurchaseOrders from "@/hooks/Ag-Grid/usePurchaseOrders";
import { inventory_columns } from "@/constants/Grid-Table/ColDefs";
import { purchase_orders } from "@/constants/Grid-Table/ColDefs";
import { useGetPOInventoryTableQuery } from "@/redux/services/InventoryApi";
import { useLazyGetPOInventoryTableQuery } from "@/redux/services/InventoryApi";
import { getRowStyle } from "@/utils/gridStyles";
import Loader from "@/components/Common/Loader";
import { Paper, Box, FormControl, TextField, MenuItem } from "@mui/material";
import { useGetUserPreferencesQuery } from "@/redux/services/profileApi";
import { useColumnPreferences } from "@/hooks/useColumnPreferences";
import { exportToExcel } from "@/utils/exportToExcel";

interface InventoryPOTableProps {
  location_code?: string;
  item_no?: string;
}

const InventoryPOTable: React.FC<InventoryPOTableProps> = ({
  location_code,
  item_no,
}) => {
  // Get user ID from localStorage
  // const userId = localStorage.getItem("userId") || undefined;

  // // Fetch user preferences for column ordering filtered by endpoint
  // const { data: userPreferences } = useGetUserPreferencesQuery({
  //   user_id: userId,
  //   endpoint: "qty_po_pop_up",
  // });

  // // Sort columns based on user preferences
  // const filteredColumns = useMemo(() => {
  //   // If no preferences data, return all default columns
  //   if (!userPreferences || !(userPreferences as any)?.data || (userPreferences as any).data.length === 0) {
  //     return purchase_orders;
  //   }

  //   const prefsData = (userPreferences as any).data;

  //   // Create a map of preference field to sort order
  //   const preferenceMap = new Map(
  //     prefsData.map((pref: any) => [
  //       pref.preference,
  //       pref.preference_sort,
  //     ])
  //   );

  //   // Filter columns that exist in preferences and sort by preference_sort
  //   const orderedColumns = purchase_orders
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
    endpoint: "qty_po_pop_up",
    tabName: "InventoryPOTable",
    defaultColumns: purchase_orders,
  });
  // Apply column customization
  const tiCol = usePurchaseOrders(filteredColumns);
  const handleExport = () => {
    exportToExcel({ data: rowData, columns: tiCol, fileName: "Inventory_PO.xlsx" });
  };

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [getPOInventory, { data, isLoading, isFetching }] =
    useLazyGetPOInventoryTableQuery();
  const [pageSizeInput, setPageSizeInput] = useState(pageSize);

  useEffect(() => {
    if (location_code && item_no) {
      setPage(1);
      getPOInventory({
        page: 1,
        page_size: pageSizeInput,
        location_code,
        item_no,
        source: "Inventory",
      });
    }
  }, [location_code, item_no, pageSizeInput, getPOInventory]);

  // const { data, isLoading, isFetching } = useGetPOInventoryTableQuery(
  //   {
  //     page,
  //     page_size: pageSize,
  //     location_code: location_code,
  //     item_no: item_no,
  //   },
  //   {
  //     skip: !location_code && !item_no,
  //     refetchOnMountOrArgChange: true,
  //   }
  // );
  useEffect(() => {
    setPage(1);
  }, [location_code, item_no]);

  const rowData = useMemo(() => {
    const items = data?.data || data || [];
    return Array.isArray(items)
      ? items.map((item: any) => ({
          location_code: item.location_code ?? "-",
          item_no: item.item_no ?? "-",
          expected_receipt_date: item.expected_receipt_date ?? "-",
          shipment_status: item.shipment_status ?? "-",
          qty_on_po: item.qty_on_po != null ? item.qty_on_po : 0,
          buy_from_vendor_code: item.buy_from_vendor_code ?? "-",
          document_no: item.document_no ?? "-",
        }))
      : [];
  }, [data]);

  const onRowClicked = (params: any) => {
    const clickedId = params.data.item_no;
    if (highlightedId === clickedId) {
      setHighlightedId(null);
    } else {
      setHighlightedId(clickedId);
    }
  };
  const handlePageSizeChange = (value: number) => {
    setPageSizeInput(value);
    setPage(1);
  };
  console.log("row data for PO table", data);
  return (
    <Box sx={{ width: "100%", minHeight: "100vh", p: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "end",
          marginLeft: "40vw",
          marginBottom: "10px",
        }}
      >
        <FormControl sx={{ width: 150 }}>
          <TextField
            select
            value={pageSizeInput}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            size="small"
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "20px",
                backgroundColor: "#ffffff",
                border: "1px solid #e0e0e0",
                fontSize: "0.8rem",
                fontWeight: 500,
                transition: "all 0.25s ease",
                "&:hover": {
                  borderColor: "#42a5f5",
                  boxShadow: "0 2px 6px rgba(66, 165, 245, 0.15)",
                },
                "&.Mui-focused": {
                  borderColor: "#1976d2",
                  boxShadow: "0 0 6px rgba(25, 118, 210, 0.25)",
                },
              },
              "& .MuiInputBase-input": {
                padding: "6px 14px",
              },
            }}
            InputLabelProps={{ style: { display: "none" } }}
          >
            {[10, 50, 100].map((size) => (
              <MenuItem key={size} value={size}>
                {size}
              </MenuItem>
            ))}
          </TextField>
        </FormControl>
      </Box>
      <Paper sx={{ p: 2, borderRadius: 3, height: "85vh" }}>
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
            onPageChange={(newPage: number) => setPage(newPage)}
            pagination={true}
            paginationPageSize={pageSizeInput}
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

export default InventoryPOTable;
