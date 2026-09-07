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

const useSalesOrders = (columns: Column[]) => {
  return useMemo(() => {
    return columns.map((col: any) => {
      switch (col.field) {
        case "location_code":
          return {
            ...col,
            headerName: "Location Code",
            flex: 1,
            minWidth: 180,
          };
        case "item_no":
          return {
            ...col,
            headerName: "Item No",
            flex: 1,
            minWidth: 160,
          };
        case "customer_name":
          return {
            ...col,
            headerName: "Customer Name",
            flex: 1,
            minWidth: 260,
            // autoHeight: true,
          };
        case "qty":
          return {
            ...col,
            headerName: "Quantity",
            flex: 1,
            minWidth: 140,
          };
        case "qty_commited":
          return {
            ...col,
            headerName: "Quantity Committed",
            flex: 1,
            minWidth: 180,
          };
        case "external_document_no":
          return {
            ...col,
            headerName: "External Document No",
            flex: 1,
            minWidth: 200,
          };
        default:
          return col;
      }
    });
  }, [columns]);
};

export default useSalesOrders;
