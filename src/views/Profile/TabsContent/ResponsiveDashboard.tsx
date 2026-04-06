"use client";

import { useState, useEffect, useMemo } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import { Box, Paper } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";

import AgGridTable from "@/components/ag-grid";
import { exportToExcel } from "@/utils/exportToExcel";
import CustomerSegmentCard from "../CustomerSegmentCard";
import OrderItems from "../OrderItems";
import SupportTicketComments from "../SupportTicketComments";
import Touchups from "../Touchups";
import TouchupsPens from "../TouchupsPens";

import {
  setActiveTab,
  setOrderItemsOpen,
  setTouchupsOpen,
  setTouchupPensOpen,
  setCustomerSegmentsOpen,
  setLocationItemLotOpen,
  resetAllTabs,
} from "@/redux/slices/tabSlice";

import { RootState } from "../../../redux/store";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import LocationItemLot from "../LocationItemLot";
import NavETA from "../NavETA";
import ItemTrackingComments from "../ItemTrackingComments";

const ResponsiveGridLayout = WidthProvider(Responsive);

const ResponsiveDashboard = ({
  rowData,
  userCol,
  onRowClicked,
  selectedCustId,
  selectedOrderId,
  selectedTicket,
  currentPage,
  totalPages,
  onPageChange,
  currentMenu,
  paginationPageSize,
  getRowStyle,
  filters,
  onColumnMoved,
  onResetColumns,
  // Column visibility props
  allColumnsWithVisibility,
  onToggleColumnVisibility,
  onUpdateColumnsVisibility,
  isVisibilityLoading,
}: any) => {
  const dispatch = useDispatch();

  const {
    isOrderItemsOpen,
    isTouchupsOpen,
    isTouchupPensOpen,
    isCustomerSegmentsOpen,
    isLocationItemLotOpen,
  } = useSelector((state: RootState) => state.tab);

  const [selectedOrderItem, setSelectedOrderItem] = useState<any | null>(null);
  const [selectedTouchup, setSelectedTouchup] = useState<any | null>(null);
  const [selectedTouchupColorSlug, setSelectedTouchupColorSlug] = useState<
    any | null
  >(null);
  const [selectedOrderItemLotNo, setSelectedOrderItemLotNo] = useState<
    any | null
  >(null);

  const hasId = selectedCustId || selectedOrderId || selectedTicket;

  const handleExport = () => {
    const fileName = currentMenu ? `${currentMenu}.xlsx` : "Export.xlsx";
    exportToExcel({ data: rowData, columns: userCol, fileName });
  };

  // 🔹 Set active tab when selection changes
  useEffect(() => {
    if (hasId) {
      dispatch(setActiveTab({ isActive: true, name: currentMenu }));
    } else {
      dispatch(setActiveTab({ isActive: false }));
      dispatch(resetAllTabs());
    }
  }, [hasId, currentMenu, dispatch]);

  // 🔹 Auto-open relevant sections
  useEffect(() => {
    if (selectedOrderId && currentMenu === "orders") {
      dispatch(setOrderItemsOpen(true));
    } else if (selectedCustId && currentMenu === "profiles") {
      dispatch(setCustomerSegmentsOpen(true));
    } else if (selectedTicket && currentMenu === "support_tickets") {
      dispatch(setCustomerSegmentsOpen(true));
    }
  }, [selectedCustId, selectedOrderId, selectedTicket, currentMenu, dispatch]);

  // 🔹 Handlers
  const handleSelectOrderItem = (item: any) => {
    setSelectedOrderItem(item);
    setSelectedOrderItemLotNo(item?.lot_no);
    dispatch(setTouchupsOpen(true));
  };

  const handleSelectTouchup = (item: any) => {
    setSelectedTouchup(item);
    setSelectedTouchupColorSlug(item?.color_slug);
    dispatch(setTouchupPensOpen(true));
  };

  const handleCellClick = (type: "sku" | "lot_no", data: any) => {
    if (type === "sku") {
      // Toggle: if same SKU clicked again, close the table
      if (isLocationItemLotOpen && selectedOrderItem === data) {
        dispatch(setLocationItemLotOpen(false));
        setSelectedOrderItem(null);
      } else {
        // Close touchups table and open location item lot
        dispatch(setTouchupsOpen(false));
        setSelectedOrderItem(data);
        dispatch(setLocationItemLotOpen(true));
      }
    } else if (type === "lot_no") {
      // Toggle: if same lot_no clicked again, close the table
      if (isTouchupsOpen && selectedOrderItem === data) {
        dispatch(setTouchupsOpen(false));
        setSelectedOrderItem(null);
        setSelectedOrderItemLotNo(null);
      } else {
        // Close location item lot table and open touchups
        dispatch(setLocationItemLotOpen(false));
        setSelectedOrderItem(data);
        setSelectedOrderItemLotNo(data.lot_no);
        dispatch(setTouchupsOpen(true));
      }
    }
  };

  // 🔹 Layout setup
  // const baseLayout = useMemo(() => {
  //   const layout: any[] = [
  //     {
  //       i: "profiles",
  //       x: 0,
  //       y: 0,
  //       w: hasId ? 7 : 12,
  //       h: hasId ? 17 : 20,
  //       minW: 4,
  //       minH: 10,
  //     },
  //   ];

  //   if (hasId) {
  //     layout.push({
  //       i: "customer_segments",
  //       x: 7,
  //       y: 0,
  //       w: 5,
  //       h: 17,
  //       minW: 3,
  //       minH: 4,
  //     });
  //   }

  //   if (isTouchupsOpen) {
  //     layout.push({
  //       i: "order_items",
  //       x: 0,
  //       y: 18,
  //       w: 12,
  //       h: 20,
  //       minW: 3,
  //       minH: 8,
  //     });
  //   }
  //   if (selectedOrderId) {
  //     layout.push({
  //       i: "zpart_eta",
  //       x: 0,
  //       y: isTouchupsOpen ? 38 : 18, // place below order_items if open
  //       w: 12,
  //       h: 20,
  //       minW: 3,
  //       minH: 8,
  //     });
  //   }

  //   return layout;
  // }, [hasId, isTouchupsOpen]);
  const baseLayout = useMemo(() => {
    const layout: any[] = [
      {
        i: "profiles",
        x: 0,
        y: 0,
        w: hasId ? 7 : 12,
        h: hasId ? 17 : 20,
        minW: 4,
        minH: 10,
      },
    ];

    if (hasId) {
      layout.push({
        i: "customer_segments",
        x: 7,
        y: 0,
        w: 5,
        h: 17,
        minW: 3,
        minH: 4,
      });
    }

    let yPosition = 18;

    // 🔹 LocationItemLot table (appears when SKU is clicked)
    if (isLocationItemLotOpen && selectedOrderId) {
      layout.push({
        i: "location_item_lot",
        x: 0,
        y: yPosition,
        w: 12,
        h: 30,
        minW: 3,
        minH: 8,
      });
      yPosition += 20;
    }

    // 🔹 Touchups/Replacement table (appears when Lot No is clicked)
    if (isTouchupsOpen) {
      layout.push({
        i: "order_items",
        x: 0,
        y: yPosition,
        w: 12,
        h: 36,
        minW: 3,
        minH: 8,
      });
      yPosition += 20;
    }

    return layout;
  }, [hasId, isTouchupsOpen, isLocationItemLotOpen, selectedOrderId]);

  const layouts = { lg: baseLayout, md: baseLayout, sm: baseLayout };

  return (
    <Box sx={{ width: "100%", minHeight: "auto" }}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 4, xxs: 2 }}
        rowHeight={30}
        draggableHandle=".drag-handle"
        isDraggable
        isResizable
        draggableCancel=".no-drag"
        resizeHandles={["se", "e", "s"]}
      >
        {/* ========== MAIN GRID (PROFILES / ORDERS / TICKETS) ========== */}
        <Paper
          key="profiles"
          elevation={3}
          sx={{
            p: 2,
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ flex: 1, minHeight: "100vh", overflow: "auto" }}>
            <AgGridTable
              rowData={rowData}
              columnDefs={userCol}
              onRowClicked={onRowClicked}
              getRowStyle={getRowStyle}
              enablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              pagination
              paginationPageSize={paginationPageSize}
              cancel=".no-drag .MuiIconButton-root"
              onColumnMoved={onColumnMoved}
              onResetColumns={onResetColumns}
              storageKey={
                currentMenu ? `${currentMenu}-columnOrder` : undefined
              }
              allColumnsWithVisibility={allColumnsWithVisibility}
              onToggleColumnVisibility={onToggleColumnVisibility}
              onUpdateColumnsVisibility={onUpdateColumnsVisibility}
              isVisibilityLoading={isVisibilityLoading}
              onExport={handleExport}
            />
          </Box>
        </Paper>

        {/* ========== SECOND PANEL (Segments / Items / Tickets) ========== */}
        <Paper
          key="customer_segments"
          elevation={3}
          sx={{
            p: 2,
            borderRadius: 3,
            height: "100%",
            display: hasId ? "flex" : "none",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            {selectedCustId && currentMenu === "profiles" && (
              <CustomerSegmentCard custId={selectedCustId} filters={filters} />
            )}
            {selectedOrderId && currentMenu === "orders" && (
              <OrderItems
                orderId={selectedOrderId}
                setSelectedOrderItem={handleSelectOrderItem}
                orderItemSec={isOrderItemsOpen}
                filters={filters}
                onCellClick={handleCellClick}
              />
            )}
            {selectedTicket && currentMenu === "support_tickets" && (
              <SupportTicketComments
                ticketId={selectedTicket}
                filters={filters}
              />
            )}
          </Box>
        </Paper>
        {/* ========== LOCATION ITEM LOT TABLE (shown on SKU click) ========== */}
        <Paper
          key="location_item_lot"
          elevation={3}
          sx={{
            p: 2,
            borderRadius: 3,
            height: "100%",
            display:
              isLocationItemLotOpen && selectedOrderId ? "block" : "none",
          }}
        >
          {selectedOrderItem && (
            <>
              <LocationItemLot
                sku={selectedOrderItem?.sku}
                filters={filters}
                source="Orders"
              />
              <Box sx={{ p: 2, borderRadius: 3, height: "100%" }}>
                <NavETA
                  sku={selectedOrderItem?.sku}
                  filters={filters}
                  source="Orders"
                />
              </Box>
            </>
          )}
        </Paper>
        {/* ========== TOUCHUPS & TOUCHUP PENS ========== */}
        <Paper
          key="order_items"
          elevation={3}
          sx={{
            p: 2,
            borderRadius: 3,
            height: "100%",
            display: isTouchupsOpen && hasId ? "block" : "none",
          }}
        >
          {selectedOrderItem && (
            <>
              <Touchups
                lotNo={selectedOrderItem.lot_no}
                sku={selectedOrderItem.sku}
                setSelectedTouchup={handleSelectTouchup}
                shouldFilterNull
                source="Orders"
              />
              <ItemTrackingComments
                sku={selectedOrderItem.sku}
                lotNo={selectedOrderItem.lot_no}
                shouldFilterNull
                source="Orders"
              />
              {isTouchupPensOpen && selectedTouchup && (
                <Box sx={{ p: 2, borderRadius: 3, height: "100%" }}>
                  <TouchupsPens
                    orderId={selectedOrderItem.order_id}
                    Colorslug={selectedTouchup?.color_slug}
                    shouldFilterNull
                    source="Orders"
                  />
                </Box>
              )}
            </>
          )}
        </Paper>
      </ResponsiveGridLayout>
    </Box>
  );
};

export default ResponsiveDashboard;
