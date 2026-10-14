import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import XLSX from "xlsx-js-style";
import { toast } from "sonner";
import { drawHeader, applyFooterToAllPages } from "@/lib/pdfBranding";

const BASE_URL = import.meta.env.VITE_API_URL || "";
const getFileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}/${path.replace(/\\/g, '/')}`;
};

// Helper function to get text content from a column's render function or accessor
const getRenderedText = (column, row) => {
  if (column.render) {
    // Special handling for common render patterns
    if (column.header === "Name") {
      return `${row.firstName} ${row.lastName || ""}`;
    }
    if (column.header === "DOB" && row.dob) {
      return new Date(row.dob).toLocaleDateString();
    }
    if (column.header === "Admission Date" && row.admissionDate) {
      return new Date(row.admissionDate).toLocaleDateString();
    }
    if (column.header === "Picture") {
      return row.photo ? "Yes" : "No"; // Indicate presence of photo
    }
    if (column.header === "Status") {
      const val = row.status || "ACTIVE";
      return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
    }
    // Fallback for other render functions: try to get accessor value if available
    if (column.accessor) {
      return row[column.accessor]?.toString() || "";
    }
    return ""; // Cannot extract text from complex render
  }
  return row[column.accessor]?.toString() || "";
};

export const exportStudentsToPDF = (students, columns, selectedClassFilter, statusFilter = "all", brand = {}) => {
  const doc = new jsPDF();
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawHeader(doc, brand, { subtitle: "AddsMint ERP — Student List Report" });

  let currentY = 55;
  doc.setFontSize(14);
  doc.setTextColor(51, 65, 85); // Slate-700
  doc.setFont("helvetica", "bold");
  doc.text("Students List", margin, currentY);

  currentY += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, currentY);

  currentY += 6;
  doc.setTextColor(51, 65, 85); // Slate-700 for better contrast
  doc.setFont("helvetica", "bold");
  doc.text("Class: ", margin, currentY);
  const classKeyWidth = doc.getTextWidth("Class: ");
  doc.setFont("helvetica", "normal");
  const classVal = selectedClassFilter === 'all' ? "All Classes" : selectedClassFilter;
  doc.text(classVal, margin + classKeyWidth, currentY);
  const classValWidth = doc.getTextWidth(classVal);

  const statusLabelX = margin + classKeyWidth + classValWidth + 15;
  doc.setFont("helvetica", "bold");
  doc.text("Status: ", statusLabelX, currentY);
  const statusKeyWidth = doc.getTextWidth("Status: ");
  doc.setFont("helvetica", "normal");
  doc.text(statusFilter === 'all' ? "All Statuses" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).toLowerCase(), statusLabelX + statusKeyWidth, currentY);

  const countStr = String(students.length);
  doc.text(countStr, pageWidth - margin, currentY, { align: "right" });
  const countWidth = doc.getTextWidth(countStr);
  doc.setFont("helvetica", "bold");
  doc.text("Total Students: ", pageWidth - margin - countWidth, currentY, { align: "right" });
  doc.setFont("helvetica", "normal"); // Reset to normal for table content

  const tableColumns = columns
    .filter(col => col.header !== "Picture" && col.header !== "Actions") // Exclude complex/action columns
    .map(col => col.header);

  const tableRows = students.map(student => 
    columns
      .filter(col => col.header !== "Picture" && col.header !== "Actions")
      .map(col => getRenderedText(col, student))
  );

  autoTable(doc, {
    startY: currentY + 10,
    head: [tableColumns],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [0, 122, 85], // Theme color
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    margin: { left: margin, right: margin, bottom: 22 },
  });

  applyFooterToAllPages(doc, brand, { withPageNumbers: true });

  const classPart = selectedClassFilter !== 'all' ? `_Class-${selectedClassFilter}` : '';
  const statusPart = statusFilter !== 'all' ? `_Status-${statusFilter}` : '';
  const totalStudentsPart = `_Total-${students.length}`;
  doc.save(`Student_List${classPart}${statusPart}${totalStudentsPart}_${new Date().getTime()}.pdf`);
  toast.success("Student list exported to PDF.");
};

export const exportStudentsToExcel = (students, columns, selectedClassFilter, statusFilter = "all") => {
  const visibleCols = columns.filter(col => col.header !== "Picture" && col.header !== "Actions");
  const headers = visibleCols.map(col => col.header);
  
  // Convert data into a 2D array (Array of Arrays)
  const dataRows = students.map(student => 
    visibleCols.map(col => getRenderedText(col, student))
  );

  // Add Summary Row
  const summaryRow = new Array(headers.length).fill("");
  summaryRow[0] = "Total Students:";
  summaryRow[1] = students.length;

  // Create worksheet with headers and data
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows, summaryRow]);

  // Get the range of cells in the worksheet
  const range = XLSX.utils.decode_range(worksheet['!ref']);

  // Define a common border style
  const borderStyle = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } }
  };

  // Apply styles to all cells
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[address]) continue;
      
      worksheet[address].s = {
        border: borderStyle,
        alignment: { vertical: "center", horizontal: "left" }
      };

      // Apply header-specific styles for the first row
      if (R === 0) {
        worksheet[address].s = {
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
          fill: { fgColor: { rgb: "007A55" } }, // Professional Green theme matching PDF
          alignment: { horizontal: "center", vertical: "center" },
          border: borderStyle
        };
      }

      // Apply summary row styles for the last row
      if (R === range.e.r && R > 0) {
        worksheet[address].s = {
          ...worksheet[address].s,
          font: { bold: true },
          fill: { fgColor: { rgb: "F1F5F9" } }, // Light slate-100 background
        };
      }
    }
  }
  // Auto-fit Column Widths based on longest content
  worksheet['!cols'] = headers.map((h, i) => ({
    wch: Math.max(h.length, ...dataRows.map(row => row[i] ? String(row[i]).length : 0)) + 3
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
  const fileName = `Student_List_${selectedClassFilter !== 'all' ? selectedClassFilter + '_' : ''}${statusFilter !== 'all' ? statusFilter + '_' : ''}${new Date().getTime()}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  toast.success("Student list exported to Excel.");
};