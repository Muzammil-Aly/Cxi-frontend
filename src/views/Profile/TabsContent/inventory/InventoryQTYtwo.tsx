"use client";
import React, { useState, useMemo } from "react";
import {
  Paper,
  Box,
  TextField,
  FormControl,
  InputAdornment,
  CircularProgress,
  IconButton,
  MenuItem,
  Typography,
} from "@mui/material";
import AgGridTable from "@/components/ag-grid";
import useQTYtwo from "@/hooks/Ag-Grid/useQTYtwo";
import { qty_two } from "@/constants/Grid-Table/ColDefs";
import { useGetQTYtwoInventoryTableQuery } from "@/redux/services/InventoryApi";
import { getRowStyle } from "@/utils/gridStyles";
import Loader from "@/components/Common/Loader";
import { Cancel as CancelIcon } from "@mui/icons-material";
import debounce from "lodash.debounce";
import { useGetUserPreferencesQuery } from "@/redux/services/profileApi";
import { useColumnPreferences } from "@/hooks/useColumnPreferences";
import { exportToExcel } from "@/utils/exportToExcel";

interface InventoryQTYtwo {
  location_code?: string;
  item_no?: (item: any) => void;
  selectedQtyoneItem?: string;
  selectedQtyoneLocationCode?: string;
}

const InventoryQTYtwo: React.FC<InventoryQTYtwo> = ({
  location_code,
  item_no,
  selectedQtyoneItem,
  selectedQtyoneLocationCode,
}) => {
  // Get user ID from localStorage
  // const userId = localStorage.getItem("userId") || undefined;

  // // Fetch user preferences for column ordering filtered by endpoint
  // const { data: userPreferences } = useGetUserPreferencesQuery({
  //   user_id: userId,
  //   endpoint: "qty_available_pop_up2",
  // });

  // // Sort columns based on user preferences
  // const filteredColumns = useMemo(() => {
  //   // If no preferences data, return all default columns
  //   if (
  //     !userPreferences ||
  //     !(userPreferences as any)?.data ||
  //     (userPreferences as any).data.length === 0
  //   ) {
  //     return qty_two;
  //   }

  //   const prefsData = (userPreferences as any).data;

  //   // Create a map of preference field to sort order
  //   const preferenceMap = new Map(
  //     prefsData.map((pref: any) => [pref.preference, pref.preference_sort])
  //   );

  //   // Filter columns that exist in preferences and sort by preference_sort
  //   const orderedColumns = qty_two
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
    endpoint: "qty_available_pop_up2",
    tabName: "InventoryQTYtwo",
    defaultColumns: qty_two,
    disableTabManagement: false,
    parentTabName: "Inventory",
  });
  // Apply column customization
  const tiCol = useQTYtwo(filteredColumns);
  const handleExport = () => {
    exportToExcel({
      data: rowData,
      columns: tiCol,
      fileName: "Bin Level Detail.xlsx",
    });
  };
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // 🔹 Filters
  const [filters, setFilters] = useState<{
    bin_code?: string;
    zone_code?: string;
  }>({});

  const [inputs, setInputs] = useState({
    bin_code: "",
    zone_code: "",
  });

  const [isTyping, setIsTyping] = useState({
    bin_code: false,
    zone_code: false,
  });

  const handleFilterChange = useMemo(
    () =>
      debounce((key: keyof typeof filters, value: string) => {
        setFilters((prev) => ({
          ...prev,
          [key]: value.trim() || undefined,
        }));
        setIsTyping((prev) => ({ ...prev, [key]: false }));
        setPage(1);
      }, 800),
    [],
  );

  const queryParams = {
    page,
    page_size: pageSize,
    source: "Inventory",
    location_code: selectedQtyoneLocationCode,
    item_no: selectedQtyoneItem,
    bin_code: filters.bin_code,
    zone_code: filters.zone_code,
  };

  const { data, isLoading, isFetching } = useGetQTYtwoInventoryTableQuery(
    queryParams,
    { skip: !selectedQtyoneItem },
  );

  const rowData = useMemo(() => {
    if (!selectedQtyoneItem || selectedQtyoneItem.length === 0) return [];
    const items = data?.data || data || [];
    return Array.isArray(items)
      ? items.map((item: any) => ({
          item_no: item.item_no ?? "-",
          description: item.description ?? "-",
          description_2: item.description_2 ?? "-",
          location_code: item.location_code ?? "-",
          zone_code: item.zone_code ?? "-",
          lot_no: item.lot_no ?? "-",
          total_qty: item.total_qty != null ? item.total_qty : 0,
          parts_version: item.parts_version != null ? item.parts_version : 0,
          bin_code: item.bin_code ?? "-",
        }))
      : [];
  }, [data, selectedQtyoneItem]);

  const onRowClicked = (params: any) => {
    const clickedId = params.data.item_no;
    if (highlightedId === clickedId) {
      setHighlightedId(null);
    } else {
      setHighlightedId(clickedId);
    }
  };

  const handleCancelFilter = (key: keyof typeof filters) => {
    setInputs((prev) => ({ ...prev, [key]: "" }));
    setFilters((prev) => ({ ...prev, [key]: undefined }));
    setPage(1);
  };

  const renderFilter = (label: string, key: keyof typeof filters) => (
    <FormControl sx={{ width: 150 }}>
      <TextField
        value={inputs[key].toUpperCase()}
        onChange={(e) => {
          const val = e.target.value;
          setInputs((prev) => ({ ...prev, [key]: val }));
          setIsTyping((prev) => ({ ...prev, [key]: true }));
          handleFilterChange(key, val);
        }}
        placeholder={label}
        size="small"
        variant="outlined"
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "20px",
            backgroundColor: "#fff",
            fontSize: "0.8rem",
          },
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {isTyping[key] ? (
                <CircularProgress size={16} />
              ) : inputs[key].trim() !== "" ? (
                <IconButton
                  size="small"
                  onClick={() => handleCancelFilter(key)}
                  sx={{ p: 0.2 }}
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              ) : null}
            </InputAdornment>
          ),
        }}
        InputLabelProps={{ style: { display: "none" } }}
      />
    </FormControl>
  );

  if (!data?.data?.length) return null;

  return (
    <Box sx={{ width: "100%", minHeight: "100vh", p: 3 }}>
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
        Bin Level Detail
      </Typography>
      <Paper sx={{ px: 2, py: 1, borderRadius: 3, height: "100vh" }}>
        <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
          {renderFilter("Bin Code", "bin_code")}
          {renderFilter("Zone Code", "zone_code")}
        </Box>

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
            totalPages={rowData.length > 0 ? data?.total_pages || 1 : 1}
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

export default InventoryQTYtwo;
