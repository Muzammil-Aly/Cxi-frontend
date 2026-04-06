"use client";

import React, { useState, useMemo } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import AgGridTable from "@/components/ag-grid";
import Loader from "@/components/Common/Loader";
import { touchups_pens } from "@/constants/Grid-Table/ColDefs";
import useTouchupsPens from "@/hooks/Ag-Grid/useTouchupPens";
import { getRowStyle } from "@/utils/gridStyles";
import { useGetTouchupPensQuery } from "@/redux/services/profileApi";
import { exportToExcel } from "@/utils/exportToExcel";

interface Touchup {
  ItemNum: string;
  ItemName: string;
  ItemName2?: string | null;
  Colorslug?: string | null;
  ColorName?: string | null;
  filters?: any;
}

const AllTouchupsPens: React.FC = () => {
  const touchupsPenCol = useTouchupsPens(touchups_pens);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [selectedTouchupDetail, setSelectedTouchupDetail] =
    useState<Touchup | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Always fetch all data
  const { data, isLoading, isFetching } = useGetTouchupPensQuery(
    {
      page,
      page_size: pageSize,
      color_slug: undefined, // fetch all
    },
    { skip: false }
  );

  const rowData = useMemo(() => data?.results ?? [], [data]);

  const handleExport = () => {
    exportToExcel({ data: rowData, columns: touchupsPenCol, fileName: "All_Touchup_Pens.xlsx" });
  };

  const onRowClicked = (params: any) => {
    const clickedItem = params.data as Touchup;

    if (selectedTouchupDetail?.ItemNum === clickedItem.ItemNum) {
      setSelectedTouchupDetail(null);
      setHighlightedId(null);
    } else {
      setSelectedTouchupDetail(clickedItem);
      setHighlightedId(clickedItem.ItemNum);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      height={"100vh"}
      width="100%"
      gap={2}
    >
      <Typography variant="h6">All Touchup Pens</Typography>

      {isLoading || isFetching ? (
        <Loader />
      ) : (
        <AgGridTable
          rowData={rowData}
          columnDefs={touchupsPenCol}
          height={300}
          onRowClicked={onRowClicked}
          enablePagination
          getRowStyle={getRowStyle(highlightedId)}
          pagination={false}
          currentPage={page}
          totalPages={data?.total_pages || 1}
          onPageChange={(newPage: any) => setPage(newPage)}
          paginationPageSize={pageSize}
          onExport={handleExport}
        />
      )}
    </Box>
  );
};

export default AllTouchupsPens;
