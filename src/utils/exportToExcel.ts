import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportToExcel = ({
  data,
  columns,
  fileName = "Export.xlsx",
}: {
  data: any[];
  columns?: any[];
  fileName?: string;
}) => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  let formattedData = data;

  // If columns provided → map dynamically
  if (columns && columns.length > 0) {
    formattedData = data.map((row) => {
      const newRow: any = {};

      columns.forEach((col) => {
        // Skip columns without field (like action buttons)
        if (!col.field) return;

        const header = col.headerName || col.field;
        newRow[header] = row[col.field];
      });

      return newRow;
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, fileName);
};
