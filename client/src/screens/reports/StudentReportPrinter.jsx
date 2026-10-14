import React from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSettings } from "@/context/SettingsContext";
import { drawHeader, applyFooterToAllPages } from "@/lib/pdfBranding";

const formatPKR = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;
const formatDate = (raw) => raw ? new Date(raw).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—";

/**
 * Generate a per-student fee report: identity card, KPIs, and the full
 * voucher history with paid/unpaid status and outstanding dues.
 */
export const generateStudentReportPDF = ({ student, vouchers, brand = {} }) => {
  if (!student) return;

  const doc = new jsPDF();
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawHeader(doc, brand, { subtitle: "AddsMint ERP — Student Fee Report" });

  // ---------- Theme ----------
  const THEME = [0, 122, 85];
  const SLATE_900 = [15, 23, 42];
  const SLATE_700 = [51, 65, 85];
  const SLATE_500 = [100, 116, 139];
  const SLATE_400 = [148, 163, 184];
  const SLATE_50 = [248, 250, 252];
  const BORDER = [226, 232, 240];
  const RED_600 = [220, 38, 38];
  const AMBER_600 = [217, 119, 6];

  // ---------- Title ----------
  let currentY = 55;
  doc.setFontSize(20);
  doc.setTextColor(...SLATE_900);
  doc.setFont("helvetica", "bold");
  doc.text("STUDENT FEE REPORT", margin, currentY);
  doc.setFillColor(...THEME);
  doc.rect(margin, currentY + 2, 36, 1.4, 'F');

  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_500);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on ${new Date().toLocaleString("en-PK")}`, margin, currentY + 9);

  currentY += 14;

  // ---------- Student identity card ----------
  const cardW = pageWidth - margin * 2;
  const cardH = 38;
  doc.setFillColor(...SLATE_50);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, currentY, cardW, cardH, 2.5, 2.5, 'FD');
  doc.setFillColor(...THEME);
  doc.rect(margin, currentY, 2, cardH, 'F');

  const fullName = `${student.firstName || ""} ${student.lastName || ""}`.trim() || "Unknown Student";
  doc.setFontSize(15);
  doc.setTextColor(...SLATE_900);
  doc.setFont("helvetica", "bold");
  doc.text(fullName, margin + 6, currentY + 9);

  doc.setFontSize(8);
  doc.setTextColor(...THEME);
  doc.setFont("helvetica", "bold");
  doc.text(`CLASS ${student.class || "—"}  ·  ${student.status || "ACTIVE"}`, margin + 6, currentY + 14);

  // 4-column id grid
  const idGridY = currentY + 22;
  const colW = (cardW - 12) / 4;
  const drawIdField = (label, value, x, y) => {
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE_400);
    doc.setFont("helvetica", "bold");
    doc.text(label.toUpperCase(), x, y);
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_900);
    doc.text(String(value || "—"), x, y + 4.5);
  };
  drawIdField("Roll #", student.rollNumber, margin + 6, idGridY);
  drawIdField("Reg #", student.regNumber, margin + 6 + colW, idGridY);
  drawIdField("Father", student.fathersName, margin + 6 + colW * 2, idGridY);
  drawIdField("Phone", student.phone, margin + 6 + colW * 3, idGridY);

  currentY += cardH + 8;

  // ---------- Aggregate KPIs ----------
  const sortedVouchers = [...vouchers].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const totalGenerated = sortedVouchers.length;
  const totalPaid = sortedVouchers.reduce((s, v) => s + Number(v.paidAmount || 0), 0);
  const totalPayable = sortedVouchers.reduce((s, v) => s + Number(v.totalPayable || 0), 0);
  const totalFine = sortedVouchers.reduce((s, v) => s + Number(v.fine || 0), 0);
  const outstanding = sortedVouchers.reduce((s, v) => {
    if (v.status === "PAID") return s;
    return s + Math.max(0, Number(v.totalPayable || 0) - Number(v.paidAmount || 0));
  }, 0);
  const paidCount = sortedVouchers.filter((v) => v.status === "PAID").length;
  const partialCount = sortedVouchers.filter((v) => v.status === "PARTIAL").length;
  const unpaidCount = sortedVouchers.filter((v) => v.status === "UNPAID").length;

  // ---------- KPI strip ----------
  const kpis = [
    { label: "Vouchers", value: `${totalGenerated}  ·  ${paidCount}P / ${unpaidCount}U`, accent: SLATE_700 },
    { label: "Total Paid", value: formatPKR(totalPaid), accent: THEME },
    { label: "Outstanding", value: formatPKR(outstanding), accent: RED_600 },
    { label: "Fines Charged", value: formatPKR(totalFine), accent: AMBER_600 },
  ];

  const gap = 4;
  const kpiW = (cardW - gap * (kpis.length - 1)) / kpis.length;
  const kpiH = 18;
  kpis.forEach((k, i) => {
    const x = margin + i * (kpiW + gap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(x, currentY, kpiW, kpiH, 1.5, 1.5, 'FD');
    doc.setFillColor(...k.accent);
    doc.rect(x, currentY, kpiW, 1.2, 'F');
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE_400);
    doc.setFont("helvetica", "bold");
    doc.text(k.label.toUpperCase(), x + 4, currentY + 7);
    doc.setFontSize(11);
    doc.setTextColor(...SLATE_900);
    doc.setFont("helvetica", "bold");
    doc.text(k.value, x + 4, currentY + 14);
  });
  currentY += kpiH + 8;

  // ---------- Voucher history ----------
  const rows = sortedVouchers.map((v, i) => {
    const remaining = Math.max(0, Number(v.totalPayable || 0) - Number(v.paidAmount || 0));
    return [
      i + 1,
      v.voucherNumber || "—",
      v.month || "—",
      formatDate(v.dueDate),
      formatPKR(v.totalPayable),
      formatPKR(v.paidAmount),
      v.fine > 0 ? formatPKR(v.fine) : "—",
      v.status === "PAID" ? "—" : formatPKR(remaining),
      v.paymentMethod || "—",
      v.status || "UNPAID",
    ];
  });

  if (rows.length === 0) {
    doc.setFillColor(...SLATE_50);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(margin, currentY, cardW, 22, 2, 2, 'FD');
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_500);
    doc.setFont("helvetica", "italic");
    doc.text(`No fee vouchers have been generated for ${fullName}.`, margin + cardW / 2, currentY + 13, { align: "center" });
    currentY += 30;
  } else {
    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Voucher #', 'Month', 'Due Date', 'Total Payable', 'Paid', 'Fine', 'Outstanding', 'Method', 'Status']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: THEME,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 2.8,
      },
      alternateRowStyles: { fillColor: SLATE_50 },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: SLATE_700,
        lineColor: BORDER,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { fontStyle: 'bold', textColor: SLATE_900, fontSize: 7.5 },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold', textColor: THEME },
        6: { halign: 'right', textColor: AMBER_600 },
        7: { halign: 'right', fontStyle: 'bold', textColor: RED_600 },
        8: { halign: 'center', fontSize: 7.5 },
        9: { halign: 'center', fontStyle: 'bold', fontSize: 7.5 },
      },
      margin: { left: margin, right: margin, bottom: 22 },
    });

    currentY = doc.lastAutoTable.finalY + 8;
  }

  // ---------- Outstanding band ----------
  if (outstanding > 0) {
    const boxH = 22;
    if (currentY + boxH > pageHeight - 22) {
      doc.addPage();
      currentY = 50;
    }

    doc.setFillColor(...RED_600);
    doc.roundedRect(margin, currentY, cardW, boxH, 2.5, 2.5, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("OUTSTANDING DUES", margin + 8, currentY + 9);
    doc.setFontSize(7.5);
    doc.text(`${unpaidCount + partialCount} unpaid voucher${(unpaidCount + partialCount) === 1 ? "" : "s"}`, margin + 8, currentY + 16);

    doc.setFontSize(20);
    doc.text(formatPKR(outstanding), pageWidth - margin - 8, currentY + 14, { align: "right" });
  }

  applyFooterToAllPages(doc, brand, { withPageNumbers: true });

  const safeName = (fullName || "student").replace(/\s+/g, "_");
  doc.save(`StudentFeeReport_${safeName}.pdf`);
};

export default function StudentReportPrinter({ student, vouchers }) {
  const { brand } = useSettings();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
      onClick={() => generateStudentReportPDF({ student, vouchers, brand })}
      title="Download student fee report"
    >
      <FileText className="h-4 w-4" />
    </Button>
  );
}
