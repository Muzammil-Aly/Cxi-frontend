import React, { useMemo, useCallback, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import "./index.scss";
import { Box, IconButton, Tooltip } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DownloadIcon from "@mui/icons-material/Download";
import ColumnVisibilitySettings from "./ColumnVisibilitySettings";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-material.css";
import {
  ClientSideRowModelModule,
  RowSelectionModule,
  RowSelectionOptions,
  ValidationModule,
  CellStyleModule,
  ModuleRegistry,
  PaginationModule,
  RowAutoHeightModule,
  RowStyleModule,
  ColumnApiModule,
} from "ag-grid-community";
import Pagination from "./Pagination";

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  RowSelectionModule,
  ValidationModule,
  CellStyleModule,
  PaginationModule,
  RowAutoHeightModule,
  RowStyleModule,
  ColumnApiModule,
]);

const AgGridTable: React.FC<any> = ({
  rowData,
  gridRef: externalGridRef,
  columnDefs,
  height = 500,
  width,
  rowHeight = 45,
  paginationPageSize = 10,
  onRowClicked,

  enablePagination = false,
  rowSelection = false,
  handleRowSelection = () => {},
  currentPage = 0,
  totalPages = 1,
  onPageChange = () => {},
  getRowStyle,
  rowClassRules,
  className,
  noTopBorder,
  storageKey, // Optional: unique key for localStorage (e.g., "myGrid-columnOrder")

  // Column visibility props
  allColumnsWithVisibility,
  onToggleColumnVisibility,
  onUpdateColumnsVisibility,
  isVisibilityLoading = false,

  // Export prop
  onExport,

  ...gridProps
}) => {
  // Create internal ref if external one not provided
  const internalGridRef = useRef<any>(null);
  const gridRef = externalGridRef || internalGridRef;

  const rowSelectionMemo = useMemo<
    RowSelectionOptions | "single" | "multiple"
  >(() => {
    return {
      mode: "multiRow",
    };
  }, []);

  // Restore column order from localStorage when grid is ready
  const onGridReady = useCallback(
    (params: any) => {
      if (storageKey) {
        const savedColumnState = localStorage.getItem(storageKey);
        console.log("Loading column state for key:", storageKey);
        console.log("Saved state:", savedColumnState);
        if (
          savedColumnState &&
          savedColumnState !== "undefined" &&
          savedColumnState !== "null"
        ) {
          try {
            const columnState = JSON.parse(savedColumnState);
            console.log("Applying column state:", columnState);
            if (Array.isArray(columnState) && columnState.length > 0) {
              params.api.applyColumnState({
                state: columnState,
                applyOrder: true,
              });
            }
          } catch (error) {
            console.error("Failed to restore column order:", error);
            // Clean up invalid data
            localStorage.removeItem(storageKey);
          }
        }
      }
      // Call the original onGridReady if it exists in gridProps
      if (gridProps.onGridReady) {
        gridProps.onGridReady(params);
      }
    },
    [storageKey, gridProps],
  );

  // Save column order to localStorage when columns are moved
  const onColumnMoved = useCallback(
    (event: any) => {
      console.log("Column moved event:", event);
      if (storageKey && event.finished && event.api) {
        const columnState = event.api.getColumnState();
        console.log("Saving column state for key:", storageKey);
        console.log("Column state:", columnState);
        localStorage.setItem(storageKey, JSON.stringify(columnState));
      }

      // Call custom onColumnMoved handler if provided
      if (gridProps.onColumnMoved) {
        gridProps.onColumnMoved(event);
      }
    },
    [storageKey, gridProps],
  );

  // Reset columns to default order
  const handleResetColumns = useCallback(() => {
    if (storageKey && gridRef?.current?.api) {
      localStorage.removeItem(storageKey);
      gridRef.current.api.resetColumnState();
      console.log(" Columns reset to default order");

      // Call custom onResetColumns handler if provided (to save default order to API)
      if (gridProps.onResetColumns) {
        gridProps.onResetColumns();
      }
    }
  }, [storageKey, gridRef, gridProps]);
  // const onCellClicked = (params: any) => {
  //   navigator.clipboard.writeText(params.value).then(() => {
  //     console.log("Copied:", params.value);
  //   });
  // };

  return (
    <>
      <Box
        sx={{
          width: width || "100%",
          overflowX: "hidden",
          position: "relative",
        }}
      >
        {(storageKey || onExport) && (
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 10,
              display: "flex",
              gap: 1,
            }}
          >
            {/* Column Visibility Settings */}
            {storageKey && (
              <ColumnVisibilitySettings
                columns={allColumnsWithVisibility || []}
                onToggleColumn={onToggleColumnVisibility || (() => {})}
                onUpdateMultiple={onUpdateColumnsVisibility || (() => {})}
                isLoading={isVisibilityLoading}
              />
            )}

            {/* Reset Columns Button */}
            {storageKey && (
              <Tooltip title="Reset columns to default" placement="left">
                <IconButton
                  onClick={handleResetColumns}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    "&:hover": {
                      backgroundColor: "#fff",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                    },
                  }}
                >
                  <RestartAltIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Export Button */}
            {onExport && (
              <Tooltip title="Export to Excel" placement="left">
                <IconButton
                  onClick={onExport}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    "&:hover": {
                      backgroundColor: "#fff",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                    },
                  }}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
        <div
          className={`ag-theme-material ${noTopBorder ? "no-top-border" : ""}`}
          style={{
            height: height,
            width: width || "100%",
            // minWidth: '1000px',
          }}
        >
          {/* <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            rowClassRules={rowClassRules}
            className={className}
            getRowStyle={getRowStyle}
            defaultColDef={{
              flex: 1,
              sortable: true,
            }}
            modules={[ClientSideRowModelModule, RowSelectionModule]}
            pagination={!enablePagination}
            paginationPageSize={
              !enablePagination ? paginationPageSize : undefined
            }
            domLayout="normal"
            rowHeight={rowHeight}
            onRowClicked={onRowClicked}
            suppressPaginationPanel={true}
            rowSelection={rowSelection ? rowSelectionMemo : undefined}
            onRowSelected={handleRowSelection}
            {...gridProps}
          /> */}

          <AgGridReact
            theme="legacy"
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            getRowStyle={getRowStyle}
            rowClassRules={rowClassRules as any}
            defaultColDef={{
              // flex: 1,
              suppressSizeToFit: true,
              resizable: true,
              sortable: true,
            }}
            modules={[
              ClientSideRowModelModule,
              RowSelectionModule,
              ValidationModule,
              CellStyleModule,
              PaginationModule,
            ]}
            pagination={enablePagination}
            paginationPageSize={
              enablePagination ? paginationPageSize : undefined
            }
            domLayout="normal"
            rowHeight={rowHeight}
            onRowClicked={onRowClicked}
            suppressPaginationPanel={true}
            //  suppressHorizontalScroll={true}
            // rowSelection={rowSelection ? rowSelectionMemo : undefined}
            rowSelection={"multiple"}
            onRowSelected={handleRowSelection}
            onGridReady={onGridReady}
            onColumnMoved={onColumnMoved}
            // clipbord={true}
            // onCellClicked={onCellClicked}
            {...gridProps}
          />
        </div>

        {enablePagination && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={paginationPageSize}
          />
        )}
      </Box>
    </>
  );
};

export default AgGridTable;
