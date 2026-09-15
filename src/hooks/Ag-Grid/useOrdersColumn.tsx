import CustomButton from "@/components/Common/CustomButton";
import { ICellRendererParams } from "ag-grid-community";
import { useMemo } from "react";
import { Avatar, Box, Typography } from "@mui/material";

export interface Column {
  field: string;
  headerName?: string;
  cellRenderer?: React.ComponentType<ICellRendererParams>;
  width?: number;
  flex?: number;
}

const StatusCell = ({ value }: { value: string }) => {
  const status = value?.toLowerCase();

  const styles = {
    subscribed: {
      bgcolor: "#E0F8E9",
      color: "#299438",
    },
    unsubscribed: {
      bgcolor: "#FFF4E5",
      color: "#B26A00",
    },
    never_subscribed: {
      bgcolor: "#FDECEA",
      color: "#D32F2F",
    },
    default: {
      bgcolor: "#E3E8EB",
      color: "#68717D",
    },
  };

  const style = styles[status as keyof typeof styles] || styles.default;

  return (
    <Box
      sx={{
        ...style,
        fontWeight: 600,
        borderRadius: "12px",
        padding: "4px 12px",
        textTransform: "uppercase",
        fontSize: 13,
        display: "inline-block",
        textAlign: "center",
      }}
    >
      {value}
    </Box>
  );
};

const useOrdersColumn = (columns: Column[]) => {
  return useMemo(() => {
    return columns.map((col: any) => {
      switch (col.field) {
        case "order_id":
          return { ...col, headerName: "Order ID", flex: 1, minWidth: 150 };
        case "customer_id":
          return {
            ...col,
            headerName: "Customer ID",
            flex: 1,
            minWidth: 180,
            cellStyle: { whiteSpace: "normal" },
            // autoHeight: true,
          };
        case "profit_name":
          return { ...col, headerName: "Profit Name", flex: 1, minWidth: 140 };
        case "customer_name":
          return {
            ...col,
            headerName: "Customer Name",
            flex: 1,
            minWidth: 160,
          };
        // customer_reference_no
        // tracking
        case "tracking":
          return { ...col, headerName: "Tracking", flex: 1, minWidth: 140 };
        case "order_status":
          return { ...col, headerName: "Order Status", flex: 1, minWidth: 140 };
        case "rma_status":
          return { ...col, headerName: "RMA Status", flex: 1, minWidth: 140 };

        case "receive":
          return { ...col, headerName: "Receive", flex: 1, minWidth: 140 };

        case "extend":
          return { ...col, headerName: "Extend", flex: 1, minWidth: 140 };
        case "redo":
          return { ...col, headerName: "Redo", flex: 1, minWidth: 140 };
        case "extend_flag":
          return { ...col, headerName: "Extend", flex: 1, minWidth: 140 };
        case "redo_flag":
          return { ...col, headerName: "Redo", flex: 1, minWidth: 140 };
        case "order_url":
          return { ...col, headerName: "Order URL", flex: 1, minWidth: 140 };
        case "location_code":
          return {
            ...col,
            headerName: "Location Code",
            flex: 1,
            minWidth: 170,
          };

        case "shipping_zip_code":
          return {
            ...col,
            headerName: "Shipping Zip Code",
            flex: 1,
            minWidth: 180,
          };
        case "psi_number":
          return { ...col, headerName: "PSI Number", flex: 1, minWidth: 140 };
        case "customer_reference_no":
          return {
            ...col,
            headerName: "Customer Reference No",
            flex: 1,
            minWidth: 220,
          };
        case "customer_no":
          return { ...col, headerName: "Customer No", flex: 1, minWidth: 150 };
        case "total_value":
          return {
            ...col,
            headerName: "Total Order Value",
            flex: 1,
            minWidth: 180,
            align: "center",
            headerAlign: "center",
          };

        case "release_error":
          return {
            ...col,
            headerName: "Release Error",
            flex: 1,
            minWidth: 180,
            cellStyle: { whiteSpace: "normal" },
          };
        case "fulfillment_status":
          return {
            ...col,
            headerName: "Fulfillment Status",
            flex: 1,
            minWidth: 180,
            cellStyle: { whiteSpace: "normal" },
          };
        case "shipping_address":
          return {
            ...col,
            headerName: "Shipping Address",
            flex: 1,
            minWidth: 180,
            // cellStyle: { whiteSpace: "normal" },
          };
        case "channel":
          return { ...col, headerName: "Channel", minWidth: 140 };

        case "your_reference":
          return { ...col, headerName: "Your Reference", minWidth: 140 };
        case "ship_to_address_2":
          return { ...col, headerName: "Ship To Address 2", minWidth: 180 };
        case "ship_to_address":
          return { ...col, headerName: "Ship To Address", minWidth: 180 };

        case "ship_to_city":
          return { ...col, headerName: "Ship To City", minWidth: 140 };
        
        case "entered_by":
          return { ...col, headerName: "Entered By", minWidth: 140 };
        default:
          return col;
      }
    });
  }, [columns]);
};

export default useOrdersColumn;
