import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import XLSX from "xlsx-js-style";
import { toast } from "sonner";
import { drawHeader, applyFooterToAllPages } from "@/lib/pdfBranding";

// Helper function to extract text content from columns, adapted from StudentExport.js
const getRenderedText = (column, row) => {
  if (column.header === "Class") {
    return row.className || "";
  }

  // Explicitly handle Total Amount calculation for reports since render returns JSX
  if (column.header === "Total Amount") {
    const tuition = row.tuition || 0;
    const exam = row.exam || 0;
    const transport = row.transport || 0;
    const otherFees = row.fees?.reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0;
    return `Rs. ${(tuition + exam + transport + otherFees).toLocaleString()}`;
  }
  
  if (column.render) {
    const val = column.render(row);
    // Fee columns usually return strings like "Rs. 1,000"
    if (typeof val === 'string') return val;
    // Fallback if render returned a React element
    if (column.accessor) return row[column.accessor]?.toString() || "";
  }
  
  return row[column.accessor]?.toString() || "";
};

export const exportFeesToPDF = (data, columns, brand = {}) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  drawHeader(doc, brand, { subtitle: "Class-wise Fee Structure Report" });

  let currentY = 55;
  doc.setFontSize(14);
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.text("Fee Structures List", margin, currentY);

  currentY += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, currentY);

  const tableColumns = columns
    .filter(col => col.header !== "Actions" && col.header !== "Late Fee Fine")
    .map(col => col.header);

  const tableRows = data.map(row => 
    columns
      .filter(col => col.header !== "Actions" && col.header !== "Late Fee Fine")
      .map(col => getRenderedText(col, row))
  );

  autoTable(doc, {
    startY: currentY + 10,
    head: [tableColumns],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [0, 122, 85],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    margin: { left: margin, right: margin, bottom: 22 },
  });

  applyFooterToAllPages(doc, brand, { withPageNumbers: true });

  doc.save(`Fee_Structure_Report_${new Date().getTime()}.pdf`);
  toast.success("Fee structures exported to PDF.");
};

export const exportFeesToExcel = (data, columns) => {
  const visibleCols = columns.filter(col => col.header !== "Actions" && col.header !== "Late Fee Fine");
  const headers = visibleCols.map(col => col.header);
  
  const dataRows = data.map(row => 
    visibleCols.map(col => getRenderedText(col, row))
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Fee Structures");

  // Apply professional styling (Borders and Bold Headers)
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const borderStyle = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } }
  };

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[address]) continue;

      worksheet[address].s = {
        border: borderStyle,
        alignment: { vertical: "center", horizontal: "left" }
      };

      // Header specific styles
      if (R === 0) {
        worksheet[address].s = {
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
          fill: { fgColor: { rgb: "007A55" } }, // Theme Green
          alignment: { horizontal: "center", vertical: "center" },
          border: borderStyle
        };
      }

      // Add slight zebra striping for rows
      if (R > 0 && R % 2 === 0) {
        worksheet[address].s.fill = { fgColor: { rgb: "F8FAFC" } };
      }
    }
  }

  // Auto-fit Column Widths
  worksheet['!cols'] = headers.map((h, i) => ({
    wch: Math.max(h.length, ...dataRows.map(row => row[i] ? String(row[i]).length : 0)) + 5
  }));

  XLSX.writeFile(workbook, `Fee_Structure_Report_${new Date().getTime()}.xlsx`);
  toast.success("Fee structures exported to Excel.");
};