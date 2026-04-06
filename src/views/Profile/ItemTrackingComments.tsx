"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputAdornment,
  IconButton,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import AgGridTable from "@/components/ag-grid";
import { item_tracking_comments } from "@/constants/Grid-Table/ColDefs";
import useItemTrackingComments from "@/hooks/Ag-Grid/useItemTrackigComments";
import Loader from "@/components/Common/Loader";
import { useGetItemTrackingCommentsQuery } from "@/redux/services/profileApi";
import { getRowStyle } from "@/utils/gridStyles";
import { useColumnPreferences } from "@/hooks/useColumnPreferences";
import { exportToExcel } from "@/utils/exportToExcel";
import { Cancel as CancelIcon } from "@mui/icons-material";
import debounce from "lodash.debounce";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
interface Props {
  orderId?: string;
  sku?: string;
  lotNo?: string;
  setSelectedOrderItem?: React.Dispatch<React.SetStateAction<any | null>>;
  orderItemSec?: boolean;
  filters?: string;
  shouldFilterNull?: boolean;
  source?: string; // Track which tab is calling: "orders" | "inventory"
}

const ItemTrackingComments = ({
  sku,
  lotNo,
  shouldFilterNull = false,
  source,
}: Props) => {
  const isNestedComponent = !!lotNo || !!sku;
  const [refetchKey, setRefetchKey] = useState<number>(0);
  const { isActive, activeTabName, isTouchupPensOpen, isTouchupsOpen } =
    useSelector((state: RootState) => state.tab);
  // Column preferences hook
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
    endpoint: "item_tracking_comments",
    tabName: "Item Tracking Comments",
    defaultColumns: item_tracking_comments,
    disableTabManagement: false,
    // parentTabName: "orders",
    parentTabName: isNestedComponent ? ["Inventory", "Orders"] : undefined, // Refetch when Inventory or Orders tab is activated
    isVisible: isNestedComponent ? isTouchupsOpen : undefined, // Track visibility for nested component
    refetchTrigger: isNestedComponent ? refetchKey : undefined, // Refetch when refetchKey changes
  });

  const orderItemsCol = useItemTrackingComments(filteredColumns);
  const handleExport = () => {
    exportToExcel({ data: rowData, columns: orderItemsCol, fileName: "Item_Tracking_Comments.xlsx" });
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeInput, setPageSizeInput] = useState(pageSize);
  const [highlightedId, setHighlightedId] = useState<string | number | null>(
    null,
  );

  // 🔹 Filters
  const [filters, setFilters] = useState<{
    item_no?: string;
    serial_lot_no?: string;
    transaction_specification?: string;
  }>({});
  const [inputs, setInputs] = useState<{
    item_no: string;
    serial_lot_no: string;
    transaction_specification: string;
  }>({
    item_no: "",
    serial_lot_no: "",
    transaction_specification: "",
  });
  const [isTyping, setIsTyping] = useState<{
    item_no: boolean;
    serial_lot_no: boolean;
    transaction_specification: boolean;
  }>({
    item_no: false,
    serial_lot_no: false,
    transaction_specification: false,
  });

  const handlePageSizeChange = (value: number) => {
    setPageSizeInput(value);
    setPage(1);
  };

  // 🔹 Debounced filter handler
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

  // 🔹 Query Params
  const queryParams = {
    page,
    page_size: pageSizeInput,
    item_no: filters.item_no ? filters.item_no : sku,
    serial_lot_no: filters.serial_lot_no ? filters.serial_lot_no : lotNo,
    transaction_specification: filters.transaction_specification
      ? filters.transaction_specification
      : undefined,
    isFromProps: !filters.item_no && !!sku, // true when using sku prop, false when searching
    source, // Track source for activity logging
  };

  const { data, isLoading, isFetching } =
    useGetItemTrackingCommentsQuery(queryParams);

  // 🔹 Map response for AG Grid
  const rowData = useMemo(() => {
    const items = data?.data || data || [];
    if (!Array.isArray(items)) return [];

    return items.map((item: any) => ({
      item_no: item.item_no,
      lot_no: item.lot_no,
      parts_version: item.parts_version,
      transaction_specification: item.transaction_specification,
      date: item.date,
      comment_2: item.comment_2,
      comment: item.comment,
      blocked: item.blocked,
      test_quality: item.test_quality,
      country_region_of_origin_code: item.country_region_of_origin_code,
    }));
  }, [data]);

  // 🔹 Reset filter
  const handleCancelFilter = (key: keyof typeof filters) => {
    setInputs((prev) => ({ ...prev, [key]: "" }));
    setFilters((prev) => ({ ...prev, [key]: undefined }));
    setPage(1);
  };

  // 🔹 Render input filter
  const renderFilter = (label: string, key: keyof typeof filters) => (
    <FormControl sx={{ width: 160 }}>
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
            textTransform: "uppercase",
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
  if (!lotNo && shouldFilterNull) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height={320}
        mt={10}
        sx={{
          background: "linear-gradient(180deg, #fafafa 0%, #f0f0f0 100%)",
          borderRadius: "16px",
          border: "1px dashed #c7c7c7",
          boxShadow: "inset 0 1px 4px rgba(0,0,0,0.05)",
          transition: "all 0.3s ease-in-out",
          "&:hover": {
            background: "linear-gradient(180deg, #fdfdfd 0%, #f5f5f5 100%)",
            borderColor: "#b0b0b0",
          },
        }}
      >
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            backgroundColor: "#e3f2fd",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <Typography
            variant="h5"
            sx={{ color: "#1976d2", fontWeight: 700, letterSpacing: "1px" }}
          >
            ℹ️
          </Typography>
        </Box>

        <Typography
          variant="h6"
          sx={{
            color: "#424242",
            fontWeight: 600,
            mb: 0.5,
            letterSpacing: "0.5px",
          }}
        >
          No Lot Number Found
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: "#757575",
            maxWidth: 300,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Please select or provide a valid <strong>Lot No</strong> to view Item
          Tracking Comments.
        </Typography>
      </Box>
    );
  }
  return (
    <Box display="flex" flexDirection="column" width="100%" gap={2}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
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
          Item Tracking Comments
        </Typography>

        {/* Filters */}
        <Box display="flex" gap={1.5} flexWrap="wrap" marginRight={3}>
          {renderFilter("Item No", "item_no")}
          {renderFilter("Lot No", "serial_lot_no")}
          {renderFilter("Trans Spec", "transaction_specification")}

          {/* Page Size */}
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
      </Box>

      {/* Table */}
      {isLoading || isFetching ? (
        <Loader />
      ) : (
        <AgGridTable
          rowData={rowData}
          columnDefs={orderItemsCol}
          // height={480}
          height={lotNo ? 300 : 400}
          enablePagination
          getRowStyle={getRowStyle(highlightedId)}
          currentPage={page}
          totalPages={data?.total_pages || 1}
          // onPageChange={(newPage) => setPage(newPage)}
          onPageChange={(newPage: number) => setPage(newPage)}
          pagination={false}
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
    </Box>
  );
};

export default ItemTrackingComments;
