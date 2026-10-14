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
 * Generate a class-detail PDF: stat cards + every student in the class
 * with their status, registration info, and outstanding dues.
 */
export const generateClassReportPDF = ({ className, students, defaulters, brand = {} }) => {
  if (!className) return;

  const doc = new jsPDF();
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawHeader(doc, brand, { subtitle: "AddsMint ERP — Class Report" });

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
  doc.text("CLASS REPORT", margin, currentY);
  doc.setFillColor(...THEME);
  doc.rect(margin, currentY + 2, 36, 1.4, 'F');

  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_500);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on ${new Date().toLocaleString("en-PK")}`, margin, currentY + 9);

  currentY += 14;

  // ---------- Class identity card ----------
  const cardW = pageWidth - margin * 2;
  const cardH = 30;
  doc.setFillColor(...SLATE_50);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, currentY, cardW, cardH, 2.5, 2.5, 'FD');
  doc.setFillColor(...THEME);
  doc.rect(margin, currentY, 2, cardH, 'F');

  doc.setFontSize(15);
  doc.setTextColor(...SLATE_900);
  doc.setFont("helvetica", "bold");
  doc.text(className, margin + 6, currentY + 11);

  doc.setFontSize(8);
  doc.setTextColor(...THEME);
  doc.setFont("helvetica", "bold");
  doc.text("CLASS WISE STUDENT REGISTER", margin + 6, currentY + 18);

  doc.setFontSize(8);
  doc.setTextColor(...SLATE_500);
  doc.setFont("helvetica", "normal");
  doc.text(`Total roll: ${students.length} students  ·  Active: ${students.filter(s => s.status === 'ACTIVE').length}  ·  Inactive: ${students.filter(s => s.status !== 'ACTIVE').length}`, margin + 6, currentY + 24);

  currentY += cardH + 8;

  // ---------- KPI strip ----------
  const active = students.filter((s) => s.status === "ACTIVE").length;
  const inactive = students.length - active;
  const defaulterCount = defaulters.length;
  const outstanding = defaulters.reduce((sum, d) => sum + Number(d.balance || 0), 0);

  const kpis = [
    { label: "Total Students", value: String(students.length), accent: SLATE_700 },
    { label: "Active", value: String(active), accent: THEME },
    { label: "Defaulters", value: String(defaulterCount), accent: RED_600 },
    { label: "Outstanding", value: formatPKR(outstanding), accent: AMBER_600 },
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

  // ---------- Student roster table ----------
  const defaulterMap = new Map(defaulters.map((d) => [d.id, Number(d.balance || 0)]));

  const sorted = [...students].sort((a, b) => {
    // Active first, then by roll number
    if (a.status !== b.status) return a.status === "ACTIVE" ? -1 : 1;
    return Number(a.rollNumber || 0) - Number(b.rollNumber || 0);
  });

  const rows = sorted.map((s, i) => {
    const balance = defaulterMap.get(s.id) || 0;
    const fullName = `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Unknown";
    return [
      i + 1,
      s.rollNumber || "—",
      s.regNumber || "—",
      fullName,
      s.fathersName || "—",
      formatDate(s.admissionDate || s.createdAt),
      s.status === "ACTIVE" ? "Active" : "Inactive",
      balance > 0 ? formatPKR(balance) : "—",
    ];
  });

  if (rows.length === 0) {
    doc.setFillColor(...SLATE_50);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(margin, currentY, cardW, 22, 2, 2, 'FD');
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_500);
    doc.setFont("helvetica", "italic");
    doc.text(`No students enrolled in ${className}.`, margin + cardW / 2, currentY + 13, { align: "center" });
    currentY += 30;
  } else {
    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Roll', 'Reg #', 'Student Name', "Father's Name", 'Admission', 'Status', 'Outstanding']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: THEME,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8.5,
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: SLATE_50 },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.8,
        textColor: SLATE_700,
        lineColor: BORDER,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { halign: 'center' },
        2: { halign: 'center', textColor: SLATE_500, fontSize: 8 },
        3: { fontStyle: 'bold', textColor: SLATE_900 },
        6: { halign: 'center' },
        7: { halign: 'right', fontStyle: 'bold', textColor: RED_600 },
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
    doc.text(`OUTSTANDING DUES — ${className}`, margin + 8, currentY + 9);
    doc.setFontSize(7.5);
    doc.text(`${defaulterCount} defaulter${defaulterCount === 1 ? "" : "s"}`, margin + 8, currentY + 16);

    doc.setFontSize(20);
    doc.text(formatPKR(outstanding), pageWidth - margin - 8, currentY + 14, { align: "right" });
  }

  applyFooterToAllPages(doc, brand, { withPageNumbers: true });

  doc.save(`ClassReport_${className.replace(/\s+/g, "_")}.pdf`);
};

export default function ClassReportPrinter({ className, students, defaulters }) {
  const { brand } = useSettings();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
      onClick={() => generateClassReportPDF({ className, students, defaulters, brand })}
      title={`Download ${className} class report`}
    >
      <FileText className="h-4 w-4" />
    </Button>
  );
}
