"use client";
import { useState, useMemo, useEffect } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import AgGridTable from "@/components/ag-grid";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  Box,
  Paper,
  Drawer,
  Tooltip,
  IconButton,
  Typography,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

import Touchups from "../../Touchups";
import TouchupsPens from "../../TouchupsPens";
import { inventory_columns } from "@/constants/Grid-Table/ColDefs";
import useInventoryColumn from "@/hooks/Ag-Grid/useInventoryColumn";
import { useColumnPreferences } from "@/hooks/useColumnPreferences";
import { exportToExcel } from "@/utils/exportToExcel";
import Loader from "@/components/Common/Loader";
import { useGetInventoryQuery } from "@/redux/services/profileApi";
import { getRowStyle } from "@/utils/gridStyles";
import SearchInput from "@/components/Common/CustomSearch/SearchInput";
import DropdownSearchInput from "@/components/Common/CustomSearch/DropdownSearchInput";
import CustomSelect from "@/components/Common/CustomTabs/CustomSelect";
import { useGetLocationCodesQuery } from "@/redux/services/InventoryApi";
import debounce from "lodash.debounce";
import InventorySOTable from "./InventorySOTable";
import InventoryPOTable from "./InventoryPOTable";
import InventoryQTYone from "./InventoryQTYone";
import InventoryQTYtwo from "./InventoryQTYtwo";
import MultiLocationInput from "./MultiLocationInput";
import MultiLocationInputWithSuggestions from "./MultiLocationInput";
import { useGetLifeCycleStatusQuery } from "@/redux/services/profileApi";
import ItemTrackingComments from "../../ItemTrackingComments";
import NavETA from "../../NavETA";
const ResponsiveGridLayout = WidthProvider(Responsive);

const Inventory = () => {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  // const [locationCodeInput, setLocationCodeInput] = useState("");
  // const [locationCodeFilter, setLocationCodeFilter] = useState<
  //   string | undefined
  // >(undefined);

  const [locationCodeInput, setLocationCodeInput] = useState<string[]>([]);
  const [locationCodeFilter, setLocationCodeFilter] = useState<string[]>([]);
  const [locationCodeSearch, setLocationCodeSearch] = useState<string>("");
  const [itemNoInput, setItemNoInput] = useState("");
  const [ItemNoFilter, setItemNoFilter] = useState<string | undefined>(
    undefined,
  );
  const [descriptionInput, setDescriptionInput] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState<
    string | undefined
  >(undefined);
  const [descriptionTyping, setDescriptionTyping] = useState(false);

  const [selectedInventoryItem, setSelectedInventoryItem] = useState<
    any | null
  >(null);
  const [lifeCycleInput, setLifeCycleInput] = useState("");
  const [lifeCycleInputTyping, setIsLifeCycleInputTyping] = useState(false);
  const [lifeCycleFilter, setLifeCycleFilter] = useState<string | undefined>(
    undefined,
  );
  const [islifeCycleTyping, setisLifeCycleTyping] = useState(false);

  const [isItemNoInputTyping, setItemNoInputTyping] = useState(false);
  const [islocationCodeInputTyping, setLocationCodeInputTyping] =
    useState(false);
  const [selectedQtyoneItem, setSelectedQtyoneItem] = useState<any | null>(
    null,
  );

  const [openDrawer, setOpenDrawer] = useState<null | "qty" | "so" | "po">(
    null,
  );
  const [loadingCellType, setLoadingCellType] = useState<
    "qty" | "so" | "po" | null
  >(null);
  const [selectedTouchupItemNo, setSelectedTouchupItemNo] = useState<
    any | null
  >(null);
  const { data, isLoading, isFetching } = useGetInventoryQuery({
    page,
    page_size: pageSize,
    source: "Inventory",
    // location_code: locationCodeFilter || undefined,
    location_code: locationCodeFilter?.length ? locationCodeFilter : undefined,
    item_no: ItemNoFilter || undefined,
    description: descriptionFilter,
    life_cycle_status_code: lifeCycleFilter || undefined,
  });
  console.log("selectedQtyoneItem", selectedQtyoneItem);

  const rowData = useMemo(() => {
    const items = data?.data || data || [];
    return Array.isArray(items)
      ? items.map((item: any) => ({
          location_code: item.location_code,
          item_no: item.item_no,
          description: item.description,
          qty: item.qty,
          eta: item.eta,
          qty_available: item.qty_available,
          avail_qty_on_hand: item.avail_qty_on_hand,
          avail_qty_to_commit: item.avail_qty_to_commit,
          qty_on_blocked_lot_bin: item.qty_on_blocked_lot_bin,
          qty_on_so: item.qty_on_so,
          life_cycle_status_code: item.life_cycle_status_code,
          qty_on_po: item.qty_on_po,
          property_code: item.property_code,
          map_price: item.map_price,
          qty_on_inspecting_lot: item.qty_on_inspecting_lot,
          expected_receipt_qty: item.expected_receipt_qty,
          current_vendor: item.current_vendor,
        }))
      : [];
  }, [data]);
  console.log("rowData from inventory 09", rowData);

  const {
    data: locationCodeSuggestions = [],
    isFetching: isLocationCodeLoading,
  } = useGetLocationCodesQuery(locationCodeSearch, {
    skip: !locationCodeSearch.trim(), // only call API if input is not empty
  });
  const { data: lifeCycleSuggestions = [], isFetching: isLifeCycleLoading } =
    useGetLifeCycleStatusQuery(lifeCycleInput, {
      skip: lifeCycleInput.trim().length < 1,
    });

  const onRowClicked = (params: any) => {
    const clickedId = params.data.item_no;

    // if same row clicked again → unselect
    // if (highlightedId === clickedId) {
    //   setHighlightedId(null);
    //   setSelectedInventoryItem(null);
    // } else {
    // select new row
    setHighlightedId(clickedId);
    setSelectedInventoryItem(params.data);
    // }
  };

  const debouncedItemNo = useMemo(
    () =>
      debounce((value: string) => {
        setItemNoFilter(value);
        setPage(1);
        setItemNoInputTyping(false);
      }, 500),
    [],
  );

  const debouncedDescription = useMemo(
    () =>
      debounce((value: string) => {
        setDescriptionFilter(value);
        setPage(1);
        setDescriptionTyping(false);
      }, 500),
    [],
  );
  const debouncedLifeCycleStatus = useMemo(
    () =>
      debounce((value: string) => {
        setLifeCycleFilter(value || undefined);
        setPage(1);
        setIsLifeCycleInputTyping(false);
      }, 5000),
    [],
  );
  const baseLayout = useMemo(() => {
    const layout = [
      { i: "inventory", x: 0, y: 0, w: 12, h: 15, minW: 6, minH: 10 },
      { i: "touchups", x: 0, y: 20, w: 12, h: 14, minH: 8 },
      {
        i: "item_tracking_comments",
        x: 0,
        y: 30,
        w: 12,
        h: 15,
        minH: 8,
      },
      { i: "touchups_pens", x: 0, y: 35, w: 12, h: 14, minH: 8 },
    ];

    // if (selectedTouchupItemNo) {
    //   layout.push({
    //     i: "item_tracking_comments",
    //     x: 0,
    //     y: 30,
    //     w: 12,
    //     h: 16,
    //     minH: 8,
    //   });
    //   layout.push({ i: "touchups_pens", x: 0, y: 55, w: 12, h: 14, minH: 8 });
    // } else {
    //   layout.push({ i: "touchups_pens", x: 0, y: 35, w: 12, h: 14, minH: 8 });
    // }

    return layout;
  }, [selectedTouchupItemNo]);

  // const handleCloseDrawer = () => setOpenDrawer(null);

  const handleCloseDrawer = () => {
    setOpenDrawer(null);
    // setSelectedInventoryItem(null);
    setSelectedQtyoneItem(null);
    setPendingDrawer(null);
    setHighlightedId(null);
  };

  // ✅ Unified drawer click handler for QTY, SO, and PO
  // const handleCellClick = (type: "qty" | "so" | "po", data: any) => {
  //   // if same row + same drawer clicked → close it
  //   if (
  //     selectedInventoryItem?.item_no === data.item_no &&
  //     openDrawer === type
  //   ) {
  //     setOpenDrawer(null);
  //     setSelectedInventoryItem(null);
  //     return;
  //   }

  //   // otherwise open the corresponding drawer
  //   setSelectedInventoryItem(data);
  //   setOpenDrawer(type);
  // };
  // const handleCellClick = (type: "qty" | "so" | "po", data: any) => {
  //   //  If same row + same drawer clicked again → close it
  //   if (
  //     selectedInventoryItem?.item_no === data.item_no &&
  //     openDrawer === type
  //   ) {
  //     setOpenDrawer(null);
  //     setSelectedInventoryItem(null);
  //     return;
  //   }

  //   //  First update item, then open drawer on next render tick
  //   setSelectedInventoryItem(data);
  //   setTimeout(() => setOpenDrawer(type), 0);
  // };

  const [pendingDrawer, setPendingDrawer] = useState<
    "qty" | "so" | "po" | null
  >(null);

  // const handleCellClick = (type: "qty" | "so" | "po", data: any) => {
  //   // 👇 If same item and same drawer clicked again → close it
  //   if (
  //     selectedInventoryItem?.item_no === data.item_no &&
  //     selectedInventoryItem?.location_code === data.location_code &&
  //     openDrawer === type
  //   ) {
  //     setOpenDrawer(null);
  //     setSelectedInventoryItem(null);
  //     return;
  //   }

  //   //  First update item, then open drawer after state updates
  //   setSelectedInventoryItem(data);
  //   setPendingDrawer(type);
  // };

  const handleCellClick = (
    type: "qty" | "sku" | "lot_no" | "so" | "po",
    data: any,
  ) => {
    // Only handle qty, so, and po clicks in inventory
    if (type !== "qty" && type !== "so" && type !== "po") {
      return;
    }

    //  If same item + same drawer clicked again → close it
    if (
      selectedInventoryItem?.item_no === data.item_no &&
      selectedInventoryItem?.location_code === data.location_code &&
      openDrawer === type
    ) {
      setOpenDrawer(null);
      // setSelectedInventoryItem(null);
      setLoadingCellType(null);
      return;
    }

    //  Show loader on clicked cell
    setLoadingCellType(type);
    setSelectedInventoryItem(data);
    setPendingDrawer(type);
  };
  useEffect(() => {
    if (selectedInventoryItem && pendingDrawer) {
      // open drawer
      setOpenDrawer(pendingDrawer);

      // stop loader after short delay (drawer animation)
      setTimeout(() => {
        setLoadingCellType(null);
      }, 400); // adjust for your drawer animation speed

      setPendingDrawer(null);
    }
  }, [selectedInventoryItem, pendingDrawer]);

  //  Effect to open drawer only after selected item is set
  useEffect(() => {
    if (selectedInventoryItem && pendingDrawer) {
      setOpenDrawer(pendingDrawer);
      setPendingDrawer(null);
    }
  }, [selectedInventoryItem, pendingDrawer]);

  // Generate base columns with handleCellClick
  const baseColumns = useMemo(
    () => inventory_columns(handleCellClick),
    [handleCellClick],
  );

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
    endpoint: "inventory_Availability",
    tabName: "Inventory",
    defaultColumns: baseColumns,
  });

  // Apply column customization
  const tiCol = useInventoryColumn(filteredColumns);
  const handleExport = () => {
    exportToExcel({ data: rowData, columns: tiCol, fileName: "Inventory.xlsx" });
  };

  const handleSelectOrderItem = (item: any) => {
    setSelectedTouchupItemNo(item);
    console.log("Selected Touchup Item No:", item);
  };
  return (
    <Box sx={{ width: "100%", minHeight: "100vh", overflow: "hidden" }}>
      {/* ================= Filters ================= */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" gap={2} mb={2} mt={2} ml={10}>
          {/* <MultiLocationInputWithSuggestions
            label="Location Code"
            value={locationCodeInput}
            setValue={setLocationCodeInput}
            setFilter={setLocationCodeFilter}
            suggestions={locationCodeSuggestions?.results || []}
            loading={isLocationCodeLoading}
            fetchSuggestions={(input) => fetchLocationCodes(input)}
            // onSearch={setLocationCodeSearch}
            width={200}
          /> */}

          <MultiLocationInputWithSuggestions
            label="Location Code"
            value={locationCodeInput}
            setValue={setLocationCodeInput}
            setFilter={setLocationCodeFilter}
            suggestions={locationCodeSuggestions?.results || []}
            loading={isLocationCodeLoading}
            fetchSuggestions={async (input: string) => {
              setLocationCodeSearch(input); // update the query for RTK
              return []; // return empty for now, suggestions come via `suggestions` prop
            }}
            width={200}
          />

          <SearchInput
            label="Item No"
            value={itemNoInput}
            setValue={(val) => {
              setItemNoInput(val);
              setItemNoInputTyping(true);
            }}
            setFilter={setItemNoFilter}
            debouncedFunction={debouncedItemNo}
            loading={isItemNoInputTyping}
            width={150}
          />
          <DropdownSearchInput
            label="Life Cycle Status"
            value={lifeCycleInput}
            setValue={setLifeCycleInput}
            setFilter={setLifeCycleFilter}
            debouncedFunction={debouncedLifeCycleStatus}
            loading={isLifeCycleLoading}
            suggestions={lifeCycleSuggestions?.results || []}
            width={170}
          />
          <SearchInput
            label="Description"
            value={descriptionInput}
            setValue={(val) => {
              setDescriptionInput(val);
              setDescriptionTyping(true);
            }}
            setFilter={setDescriptionFilter}
            debouncedFunction={debouncedDescription}
            loading={descriptionTyping}
            width={150}
          />
        </Box>
        <Box>
          <CustomSelect
            label="Page Size"
            value={pageSize}
            options={[10, 50, 100]}
            onChange={(val) => setPageSize(val)}
          />
        </Box>
      </Box>

      {/* ================= Grid Layout ================= */}
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: baseLayout, md: baseLayout, sm: baseLayout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 4 }}
        rowHeight={30}
        isDraggable
        isResizable
        draggableHandle=".drag-handle"
        draggableCancel=".no-drag"
        resizeHandles={["se", "e", "s"]}
      >
        {/* Inventory Table */}
        <Paper
          key="inventory"
          sx={{
            p: 2,
            borderRadius: 3,
            height: "100%",
            overflowX: "hidden",
            overflowY: "auto",
            ml: 5,
          }}
        >
          {isLoading || isFetching ? (
            <Loader />
          ) : (
            <AgGridTable
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

        {/* Touchups */}
        <Paper
          key="touchups"
          sx={{
            p: 2,
            borderRadius: 3,
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",

            ml: 5,
          }}
        >
          <Touchups
            shouldFilterNull={false}
            setSelectedTouchupItemNo={handleSelectOrderItem}
            source="Inventory"
          />
        </Paper>

        <Paper
          key="item_tracking_comments"
          sx={{
            p: 2,
            borderRadius: 3,
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            ml: 5,
          }}
        >
          <ItemTrackingComments source="Inventory" />
        </Paper>

        {/* Touchups Pens */}
        <Paper
          key="touchups_pens"
          sx={{
            p: 2,
            borderRadius: 3,
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            ml: 5,
          }}
        >
          <TouchupsPens shouldFilterNull={false} source="Inventory" />
        </Paper>
      </ResponsiveGridLayout>

      {/* ================= Floating Action Bar ================= */}
      {/* <AnimatePresence>
        {selectedInventoryItem && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed",
              bottom: 30,
              right: 50,
              background: "white",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              borderRadius: 50,
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              zIndex: 9999,
            }}
          >
            <Tooltip title="View QTY Details" arrow>
              <IconButton color="primary" onClick={() => setOpenDrawer("qty")}>
                <Inventory2Icon />
              </IconButton>
            </Tooltip>
            <Tooltip title="View Sales Orders (SO)" arrow>
              <IconButton color="secondary" onClick={() => setOpenDrawer("so")}>
                <ShoppingCartIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="View Purchase Orders (PO)" arrow>
              <IconButton color="success" onClick={() => setOpenDrawer("po")}>
                <LocalShippingIcon />
              </IconButton>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence> */}

      {/* ================= Drawers ================= */}
      <AnimatePresence>
        {openDrawer && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.4)",
                zIndex: 1200,
              }}
              onClick={handleCloseDrawer}
            />

            {/* Main Drawer Panel */}
            <motion.div
              key={openDrawer}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                type: "tween",
                duration: 0.35,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                height: "100vh",
                width:
                  openDrawer === "qty"
                    ? "80vw"
                    : openDrawer === "so" || openDrawer === "po"
                      ? "55vw"
                      : "50vw",
                backgroundColor: "#f9fafb", // soft neutral tone
                borderLeft: "1px solid #e0e0e0",
                boxShadow: "-6px 0 18px rgba(0,0,0,0.1)",
                zIndex: 1300,
                display: "flex",
                flexDirection: "column",
                borderTopLeftRadius: "20px",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  px: 3,
                  py: 2,
                  backgroundColor: "#ffffff",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <Typography variant="h6" fontWeight={700}>
                  {openDrawer === "qty"
                    ? "Quantity Available Details"
                    : openDrawer === "so"
                      ? "Sales Orders"
                      : "Purchase Orders"}
                </Typography>

                <IconButton
                  onClick={handleCloseDrawer}
                  sx={{
                    border: "1px solid #e0e0e0",
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "&:hover": {
                      backgroundColor: "#f3f4f6",
                    },
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </IconButton>
              </Box>

              {/* Content */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflowY: "auto",
                  // p: 3,
                }}
              >
                {/* {openDrawer === "qty" && (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      height: "100%",
                    }}
                  >
                    <InventoryQTYone
                      location_code={selectedInventoryItem?.location_code}
                      item_no={selectedInventoryItem?.item_no}
                      setSelectedQtyoneItem={setSelectedQtyoneItem}
                    />
                    <InventoryQTYtwo
                      selectedQtyoneItem={selectedQtyoneItem?.item_no}
                    />
                  </Box>
                )} */}
                {openDrawer === "qty" && (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      height: "100%",
                    }}
                  >
                    <InventoryQTYone
                      location_code={selectedInventoryItem?.location_code}
                      item_no={selectedInventoryItem?.item_no}
                      setSelectedQtyoneItem={setSelectedQtyoneItem}
                    />
                    {selectedQtyoneItem && (
                      <InventoryQTYtwo
                        selectedQtyoneItem={selectedQtyoneItem?.item_no}
                        selectedQtyoneLocationCode={
                          selectedQtyoneItem?.location_code
                        }
                      />
                    )}
                  </Box>
                )}

                {openDrawer === "so" && (
                  <InventorySOTable
                    location_code={selectedInventoryItem?.location_code}
                    item_no={selectedInventoryItem?.item_no}
                  />
                )}

                {openDrawer === "po" && (
                  <InventoryPOTable
                    location_code={selectedInventoryItem?.location_code}
                    item_no={selectedInventoryItem?.item_no}
                  />
                )}
              </Box>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* <Drawer
        anchor="right"
        open={openDrawer === "qty"}
        onClose={handleCloseDrawer}
      >
        <Box sx={{ width: "80vw", display: "flex" }}>
          <InventoryQTYone
            location_code={selectedInventoryItem?.location_code}
            item_no={selectedInventoryItem?.item_no}
            setSelectedQtyoneItem={setSelectedQtyoneItem}
          />
          <InventoryQTYtwo selectedQtyoneItem={selectedQtyoneItem?.item_no} />
        </Box>
      </Drawer>

      <Drawer
        anchor="right"
        open={openDrawer === "so"}
        onClose={handleCloseDrawer}
      >
        <Box sx={{ width: "50vw" }}>
          <InventorySOTable
            location_code={selectedInventoryItem?.location_code}
            item_no={selectedInventoryItem?.item_no}
          />
        </Box>
      </Drawer>

      <Drawer
        anchor="right"
        open={openDrawer === "po"}
        onClose={handleCloseDrawer}
      >
        <Box sx={{ width: "50vw" }}>
          <InventoryPOTable
            location_code={selectedInventoryItem?.location_code}
            item_no={selectedInventoryItem?.item_no}
          />
        </Box>
      </Drawer> */}
    </Box>
  );
};

export default Inventory;
