import { fontSize, margin } from "@mui/system";
import { ICellRendererParams } from "ag-grid-community";
import { useMemo } from "react";

export interface Column {
  field: string;
  headerName?: string;
  cellRenderer?: React.ComponentType<ICellRendererParams>;
  width?: number;
  flex?: number;
  minWidth?: number;
  cellStyle?: any;
  autoHeight?: boolean;
}

const useInventory = (columns: Column[]) => {
  return useMemo(() => {
    return columns.map((col: any) => {
      switch (col.field) {
        case "location_code":
          return {
            ...col,
            headerName: "Location Code",
            flex: 1,
            minWidth: 150,
          };
        case "item_no":
          return { ...col, headerName: "Item No", flex: 1, minWidth: 150 };
        case "description":
          return {
            ...col,
            headerName: "Description",
            flex: 1,
            minWidth: 250,
            // autoHeight: true,
          };
        case "qty":
          return { ...col, headerName: "Quantity", flex: 1, minWidth: 120 };
        case "eta":
          return { ...col, headerName: "ETA", flex: 1, minWidth: 140 };
        case "qty_available":
          return {
            ...col,
            headerName: "Qty Available",
            flex: 1,
            minWidth: 160,
            cellStyle: { fontSize: "16px", fontWeight: "bold" },
          };
        case "avail_qty_on_hand":
          return {
            ...col,
            headerName: "Avail Qty on Hand",
            flex: 1,
            minWidth: 180,
          };
        case "avail_qty_to_commit":
          return {
            ...col,
            headerName: "Avail Qty to Commit",
            flex: 1,
            minWidth: 200,
          };
        case "qty_on_blocked_lot_bin":
          return {
            ...col,
            headerName: "Qty on Blocked Lot/Bin",
            flex: 1,
            minWidth: 220,
          };
        case "qty_on_so":
          return {
            ...col,
            headerName: "Qty on SO",
            flex: 1,
            minWidth: 160,

            cellStyle: { fontSize: "16px", fontWeight: "bold" },
          };
        case "life_cycle_status_code":
          return {
            ...col,
            headerName: "Life Cycle Status",
            flex: 1,
            minWidth: 180,
          };
        case "qty_on_po":
          return {
            ...col,
            headerName: "Qty on PO",
            flex: 1,
            minWidth: 160,
            cellStyle: { fontSize: "16px", fontWeight: "bold" },
          };

        case "property_code":
          return {
            ...col,
            headerName: "Property Code",
            flex: 1,
            minWidth: 160,
            cellStyle: { fontSize: "16px" },
          };
        case "map_price":
          return {
            ...col,
            headerName: "Map Price",
            flex: 1,
            minWidth: 160,
            cellStyle: { fontSize: "16px" },
          };
        case "qty_on_inspecting_lot":
          return {
            ...col,
            headerName: "Qty on Inspecting Lot",
            flex: 1,
            minWidth: 210,
            cellStyle: { fontSize: "16px" },
          };
        case "expected_receipt_qty":
          return {
            ...col,
            headerName: "Expected Receipt Qty",
            flex: 1,
            minWidth: 210,
            cellStyle: { fontSize: "16px" },
          };
        case "current_vendor":
          return {
            ...col,
            headerName: "Current Vendor",
            flex: 1,
            minWidth: 160,
            cellStyle: { fontSize: "16px" },
          };
        case "description_2":
          return {
            ...col,
            headerName: "Description 2",
            flex: 1,
            minWidth: 250,
            cellStyle: { fontSize: "16px" },
          };
        case "brand":
          return {
            ...col,
            headerName: "Brand",
            flex: 1,
            minWidth: 150,
            cellStyle: { fontSize: "16px" },
          };
        default:
          return col;
      }
    });
  }, [columns]);
};

export default useInventory;
