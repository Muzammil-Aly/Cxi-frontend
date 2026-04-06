"use client";
import React, { useMemo, useState } from "react";
import AgGridTable from "@/components/ag-grid";
import { touchups_columns } from "@/constants/Grid-Table/ColDefs";
import useTouchupsColumn from "@/hooks/Ag-Grid/useTouchupsColumn";
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  InputAdornment,
  FormControl,
  IconButton,
  MenuItem,
} from "@mui/material";
import { Cancel as CancelIcon } from "@mui/icons-material";
import Loader from "@/components/Common/Loader";
import { useGetTouchupsQuery } from "@/redux/services/profileApi";
import { getRowStyle } from "@/utils/gridStyles";
import debounce from "lodash.debounce";
import { exportToExcel } from "@/utils/exportToExcel";
import type { DebouncedFunc } from "lodash";

type FilterKey = "lot_no" | "order_id" | "customer_id" | "sku" | "color_slug";

const AllTouchups: React.FC = () => {
  const touchupsCol = useTouchupsColumn(touchups_columns);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Filter states
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    lot_no: "",
    order_id: "",
    customer_id: "",
    sku: "",
    color_slug: "",
  });

  const [isTyping, setIsTyping] = useState<Record<FilterKey, boolean>>({
    lot_no: false,
    order_id: false,
    customer_id: false,
    sku: false,
    color_slug: false,
  });

  const [appliedFilters, setAppliedFilters] = useState<
    Partial<Record<FilterKey, string>>
  >({});

  const [page, setPage] = useState(1);
  const [pageSizeInput, setPageSizeInput] = useState(10);

  const handlePageSizeChange = (value: number) => {
    setPageSizeInput(value);
    setPage(1);
  };

  // API Query
  const { data, isLoading, isFetching } = useGetTouchupsQuery(
    {
      page,
      page_size: pageSizeInput,
      ...appliedFilters,
    },
    { skip: false }
  );

  const rowData = useMemo(() => {
    const items = data?.data || data || [];
    return Array.isArray(items)
      ? items.map((item: any) => ({
          order_id: item.order_id,
          lot_no: item.lot_no,
          sku: item.sku,
          customer_id: item.customer_id,
          parts_item_no: item.parts_item_no,
          parts_item_name: item.parts_item_name,
          parts_item_name_2: item.parts_item_name_2,
          touchup_pen_item_no: item.touchup_pen_item_no,
          touchup_pen_item_name: item.touchup_pen_item_name,
          brand: item.brand,
          color_slug: item.color_slug,
          color_name: item.color_name,
        }))
      : [];
  }, [data]);

  const handleExport = () => {
    exportToExcel({ data: rowData, columns: touchupsCol, fileName: "All_Touchups.xlsx" });
  };

  const onRowClicked = (params: any) => {
    const clicked = params.data;
    setHighlightedId(
      highlightedId === clicked.order_id ? null : clicked.order_id
    );
  };

  // Debounced filter creator
  const createDebouncedFilter = (
    key: FilterKey
  ): DebouncedFunc<(value: string) => void> =>
    debounce((value: string) => {
      setAppliedFilters((prev) => ({
        ...prev,
        [key]: value || undefined,
      }));
      setPage(1);
      setIsTyping((prev) => ({ ...prev, [key]: false }));
    }, 700);

  const debouncedFilters = useMemo(
    () => ({
      lot_no: createDebouncedFilter("lot_no"),
      order_id: createDebouncedFilter("order_id"),
      customer_id: createDebouncedFilter("customer_id"),
      sku: createDebouncedFilter("sku"),
      color_slug: createDebouncedFilter("color_slug"),
    }),
    []
  );

  const handleFilterChange = (key: FilterKey, value: string) => {
    const normalized = value.toUpperCase();
    setFilters((prev) => ({ ...prev, [key]: normalized }));

    if (normalized.trim() === "") {
      setAppliedFilters((prev) => ({ ...prev, [key]: undefined }));
      debouncedFilters[key].cancel();
    } else {
      setIsTyping((prev) => ({ ...prev, [key]: true }));
      debouncedFilters[key](normalized);
    }
  };

  const handleCancelFilter = (key: FilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: "" }));
    setAppliedFilters((prev) => ({ ...prev, [key]: undefined }));
    setPage(1);
  };

  const renderFilter = (label: string, key: FilterKey) => (
    <FormControl sx={{ width: 150 }}>
      <TextField
        value={filters[key].toUpperCase()}
        onChange={(e) => handleFilterChange(key, e.target.value)}
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
              ) : filters[key].trim() !== "" ? (
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
      />
    </FormControl>
  );

  return (
    <Box display="flex" flexDirection="column" width="100%" gap={2}>
      {/* Header + Filters */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1.5}
      >
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
          All Touchups
        </Typography>

        <Box display="flex" gap={1.5} flexWrap="wrap" marginRight={3}>
          {renderFilter("Lot No", "lot_no")}
          {/* {renderFilter("Order ID", "order_id")} */}
          {/* {renderFilter("Customer ID", "customer_id")} */}
          {renderFilter("SKU", "sku")}
          {/* {renderFilter("Color Slug", "color_slug")} */}

          {/* Page Size Dropdown */}
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
          columnDefs={touchupsCol}
          height={400}
          onRowClicked={onRowClicked}
          getRowStyle={getRowStyle(highlightedId)}
          enablePagination
          pagination={false}
          currentPage={page}
          totalPages={data?.total_pages || 1}
          onPageChange={(newPage: number) => setPage(newPage)}
          paginationPageSize={pageSizeInput}
          onExport={handleExport}
        />
      )}
    </Box>
  );
};

export default AllTouchups;
