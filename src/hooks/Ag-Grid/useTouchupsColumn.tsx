import { ICellRendererParams } from "ag-grid-community";
import { useMemo } from "react";

export interface Column {
  field: string;
  headerName?: string;
  cellRenderer?: React.ComponentType<ICellRendererParams>;
  width?: number;
  flex?: number;
}

const useTouchupsColumn = (columns: Column[]) => {
  return useMemo(() => {
    return columns.map((col: any) => {
      switch (col.field) {
        // case "order_id":
        //   return { ...col, headerName: "Order ID", flex: 1, minWidth: 150 };
        case "lot_no":
          return { ...col, headerName: "Lot No", flex: 1, minWidth: 140 };
        case "sku":
          return {
            ...col,
            headerName: "SKU",
            flex: 1,
            minWidth: 140,
          };
        // case "customer_id":
        //   return {
        //     ...col,
        //     headerName: "Customer ID",
        //     flex: 1,
        //     minWidth: 180,
        //     cellStyle: { whiteSpace: "normal" },
        //     autoHeight: true,
        //   };
        case "parts_item_no":
          return {
            ...col,
            headerName: "Parts Item No",
            flex: 1,
            minWidth: 160,
          };
        case "parts_item_name":
          return {
            ...col,
            headerName: "Parts Item Name",
            flex: 2,
            minWidth: 200,
          };
        case "parts_item_name_2":
          return {
            ...col,
            headerName: "Parts Item Name 2",
            flex: 2,
            minWidth: 200,
          };
        case "touchup_pen_item_no":
          return {
            ...col,
            headerName: "Touchup Pen Item No",
            flex: 1,
            minWidth: 180,
          };
        case "touchup_pen_item_name":
          return {
            ...col,
            headerName: "Touchup Pen Item Name",
            flex: 2,
            minWidth: 200,
          };
        case "brand":
          return { ...col, headerName: "Brand", flex: 1, minWidth: 140 };
        case "color_slug":
          return { ...col, headerName: "Color Slug", flex: 1, minWidth: 150 };
        case "color_name":
          return { ...col, headerName: "Color Name", flex: 1, minWidth: 150 };
        case "parts_version":
          return {
            ...col,
            headerName: "Parts Version",
            flex: 1,
            minWidth: 150,
          };
        case "potential_qty_available":
          return {
            ...col,
            headerName: "Potential Qty Available",
            flex: 1,
            minWidth: 220,
          };
        case "unit_price":
          return {
            ...col,
            headerName: "Unit Price",
            flex: 1,
            minWidth: 140,
          };
        default:
          return col;
      }
    });
  }, [columns]);
};

export default useTouchupsColumn;
