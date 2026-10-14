import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSettings } from "@/context/SettingsContext";
import { drawHeader, drawFooter } from "@/lib/pdfBranding";

/**
 * Generate a single-staff salary slip PDF.
 * Reuses the same header/footer treatment as InvoicePrinter for visual consistency.
 */
export const generateSalarySlipPDF = ({ staff, period, brand = {} }) => {
  if (!staff) return;

  const doc = new jsPDF();
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawHeader(doc, brand, { subtitle: "AddsMint ERP — Official Salary Slip" });

  // ---------- Theme tokens ----------
  const THEME = [0, 122, 85];
  const SLATE_900 = [15, 23, 42];
  const SLATE_700 = [51, 65, 85];
  const SLATE_500 = [100, 116, 139];
  const SLATE_400 = [148, 163, 184];
  const SLATE_50 = [248, 250, 252];
  const BORDER = [226, 232, 240];

  const formatPKR = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;

  // ---------- Title + accent bar ----------
  let currentY = 55;
  doc.setFontSize(22);
  doc.setTextColor(...SLATE_900);
  doc.setFont("helvetica", "bold");
  doc.text("SALARY SLIP", margin, currentY);

  doc.setFillColor(...THEME);
  doc.rect(margin, currentY + 2, 36, 1.4, 'F');

  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_400);
  doc.setFont("helvetica", "bold");
  doc.text("PAY PERIOD", pageWidth - margin, currentY - 5, { align: "right" });
  doc.setFontSize(13);
  doc.setTextColor(...THEME);
  doc.text(period || "—", pageWidth - margin, currentY + 1, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_500);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Issued ${new Date().toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}`,
    pageWidth - margin,
    currentY + 7,
    { align: "right" }
  );

  currentY += 16;

  // ---------- Identity card ----------
  const cardW = pageWidth - margin * 2;
  const cardH = 32;
  doc.setFillColor(...SLATE_50);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, currentY, cardW, cardH, 2.5, 2.5, 'FD');
  doc.setFillColor(...THEME);
  doc.rect(margin, currentY, 2, cardH, 'F');

  doc.setFontSize(14);
  doc.setTextColor(...SLATE_900);
  doc.setFont("helvetica", "bold");
  doc.text(staff.name || "Unnamed Staff", margin + 6, currentY + 9);

  doc.setFontSize(8);
  doc.setTextColor(...THEME);
  doc.setFont("helvetica", "bold");
  doc.text(`${staff.role || "STAFF"}`.toUpperCase(), margin + 6, currentY + 14);

  // 3-column id grid
  const idGridY = currentY + 21;
  const colW = (cardW - 12) / 3;
  const drawIdField = (label, value, x, y) => {
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE_400);
    doc.setFont("helvetica", "bold");
    doc.text(label.toUpperCase(), x, y);
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_900);
    doc.text(String(value || "—"), x, y + 4.5);
  };
  drawIdField("Phone", staff.phone, margin + 6, idGridY);
  drawIdField("Status", staff.statusLabel || (staff.isPaid ? "Paid" : "Pending"), margin + 6 + colW, idGridY);
  drawIdField("Paid Via", staff.method && staff.method !== "—" ? staff.method : "—", margin + 6 + colW * 2, idGridY);

  currentY += cardH + 8;

  // ---------- Earnings & Deductions table ----------
  autoTable(doc, {
    startY: currentY,
    head: [['Component', 'Type', 'Amount']],
    body: [
      ['Base Salary', 'Earning', formatPKR(staff.salary)],
      [`Overtime${staff.overtimeHours > 0 ? ` (${staff.overtimeHours} hrs)` : ''}`, 'Earning', formatPKR(staff.overtimeAmount)],
      ['Absence Deduction', 'Deduction', `- ${formatPKR(staff.absenceDeduction)}`],
      ['Advances', 'Deduction', `- ${formatPKR(staff.advanceTotal)}`],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: THEME,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 3.2,
    },
    alternateRowStyles: { fillColor: SLATE_50 },
    styles: {
      fontSize: 9.5,
      cellPadding: 3.2,
      textColor: SLATE_700,
      lineColor: BORDER,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: SLATE_900 },
      1: { halign: 'center', textColor: SLATE_500, fontSize: 8.5 },
      2: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin, bottom: 18 },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // ---------- Net Pay highlight ----------
  const netH = 22;
  doc.setFillColor(...THEME);
  doc.roundedRect(margin, currentY, cardW, netH, 2.5, 2.5, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("NET PAYABLE", margin + 8, currentY + 9);
  doc.setFontSize(7.5);
  doc.text(`Pay period: ${period || "—"}`, margin + 8, currentY + 15);
  doc.setFontSize(20);
  doc.text(formatPKR(staff.netPaid), pageWidth - margin - 8, currentY + 14, { align: "right" });

  currentY += netH + 8;

  // ---------- Notes ----------
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_500);
  doc.setFont("helvetica", "italic");
  const notes = staff.isPaid
    ? `This payment was processed via ${staff.method && staff.method !== "—" ? staff.method : "the recorded method"}.`
    : "This salary slip reflects the pay period above. Payment is currently pending.";
  doc.text(notes, margin, currentY, { maxWidth: cardW });

  // ---------- Signatures ----------
  // Lifted clear of the 18px branded footer.
  const sigY = pageHeight - 32;
  doc.setDrawColor(...SLATE_400);
  doc.setLineWidth(0.3);
  doc.line(margin, sigY, margin + 60, sigY);
  doc.line(pageWidth - margin - 60, sigY, pageWidth - margin, sigY);
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_500);
  doc.setFont("helvetica", "bold");
  doc.text("EMPLOYEE SIGNATURE", margin + 30, sigY + 4, { align: "center" });
  doc.text("AUTHORIZED SIGNATURE", pageWidth - margin - 30, sigY + 4, { align: "center" });

  drawFooter(doc, brand, { rightLabel: "Official Salary Slip" });

  const safeName = (staff.name || "staff").replace(/\s+/g, "_");
  const safePeriod = (period || "period").replace(/\s+/g, "_");
  doc.save(`SalarySlip_${safeName}_${safePeriod}.pdf`);
};

export default function SalarySlipPrinter({ staff, period }) {
  const { brand } = useSettings();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
      onClick={() => generateSalarySlipPDF({ staff, period, brand })}
      title="Download salary slip"
    >
      <Printer className="h-4 w-4" />
    </Button>
  );
}
