import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSettings } from "@/context/SettingsContext";
import { drawHeader, applyFooterToAllPages } from "@/lib/pdfBranding";

const formatPKR = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;

/**
 * Generate the executive Summary PDF — headline KPIs and one-line highlights
 * pulled from each report, no row-by-row repetition.
 */
export const generateSummaryPDF = ({ period, financial, people, highlights, brand = {} }) => {
  const doc = new jsPDF();
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawHeader(doc, brand, { subtitle: "AddsMint ERP — Executive Summary" });

  // ---------- Theme ----------
  const THEME = [0, 122, 85];
  const SLATE_900 = [15, 23, 42];
  const SLATE_700 = [51, 65, 85];
  const SLATE_500 = [100, 116, 139];
  const SLATE_400 = [148, 163, 184];
  const SLATE_50 = [248, 250, 252];
  const SLATE_100 = [241, 245, 249];
  const BORDER = [226, 232, 240];
  const RED_600 = [220, 38, 38];
  const AMBER_600 = [217, 119, 6];

  // ---------- Title ----------
  let currentY = 55;
  doc.setFontSize(20);
  doc.setTextColor(...SLATE_900);
  doc.setFont("helvetica", "bold");
  doc.text("EXECUTIVE SUMMARY", margin, currentY);
  doc.setFillColor(...THEME);
  doc.rect(margin, currentY + 2, 36, 1.4, 'F');

  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_500);
  doc.setFont("helvetica", "normal");
  doc.text(`Period: ${period}  ·  Generated ${new Date().toLocaleString("en-PK")}`, margin, currentY + 9);

  currentY += 14;

  // ---------- KPI grid renderer (2 rows × 4 cards) ----------
  const cardW = pageWidth - margin * 2;
  const drawKpiRow = (kpis, label) => {
    // Row label
    doc.setFontSize(7);
    doc.setTextColor(...SLATE_400);
    doc.setFont("helvetica", "bold");
    doc.text(label.toUpperCase(), margin, currentY);
    currentY += 4;

    const gap = 4;
    const kpiW = (cardW - gap * (kpis.length - 1)) / kpis.length;
    const kpiH = 22;

    kpis.forEach((k, i) => {
      const x = margin + i * (kpiW + gap);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(x, currentY, kpiW, kpiH, 1.5, 1.5, 'FD');
      doc.setFillColor(...k.accent);
      doc.rect(x, currentY, kpiW, 1.4, 'F');

      doc.setFontSize(6.5);
      doc.setTextColor(...SLATE_400);
      doc.setFont("helvetica", "bold");
      doc.text(k.label.toUpperCase(), x + 4, currentY + 8);

      doc.setFontSize(13);
      doc.setTextColor(...SLATE_900);
      doc.setFont("helvetica", "bold");
      doc.text(k.value, x + 4, currentY + 15);

      if (k.subtitle) {
        doc.setFontSize(6.5);
        doc.setTextColor(...SLATE_500);
        doc.setFont("helvetica", "normal");
        doc.text(k.subtitle, x + 4, currentY + 19);
      }
    });
    currentY += kpiH + 8;
  };

  drawKpiRow(financial, "Financial Snapshot");
  drawKpiRow(people, "Operations Snapshot");

  // ---------- Highlights table ----------
  doc.setFontSize(7);
  doc.setTextColor(...SLATE_400);
  doc.setFont("helvetica", "bold");
  doc.text("REPORT HIGHLIGHTS", margin, currentY);
  currentY += 3;

  autoTable(doc, {
    startY: currentY,
    head: [['Report', 'Headline Metric', 'Value']],
    body: highlights.map((h) => [h.report, h.metric, h.value]),
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
      fontSize: 9,
      cellPadding: 3,
      textColor: SLATE_700,
      lineColor: BORDER,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: SLATE_900, cellWidth: 50 },
      1: { textColor: SLATE_500 },
      2: { halign: 'right', fontStyle: 'bold', textColor: THEME },
    },
    margin: { left: margin, right: margin, bottom: 22 },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // ---------- Net position band ----------
  const netCard = financial.find((k) => k.label === "Net Position");
  if (netCard) {
    const boxH = 26;
    if (currentY + boxH > pageHeight - 22) {
      doc.addPage();
      currentY = 50;
    }
    doc.setFillColor(...THEME);
    doc.roundedRect(margin, currentY, cardW, boxH, 2.5, 2.5, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`NET POSITION — ${period}`, margin + 8, currentY + 9);
    if (netCard.subtitle) {
      doc.setFontSize(7.5);
      doc.text(netCard.subtitle, margin + 8, currentY + 16);
    }
    doc.setFontSize(20);
    doc.text(netCard.value, pageWidth - margin - 8, currentY + 16, { align: "right" });
  }

  applyFooterToAllPages(doc, brand, { withPageNumbers: true });

  doc.save(`ExecutiveSummary_${period.replace(/\s+/g, "_")}.pdf`);
};

export default function SummaryPrinter({ period, financial, people, highlights }) {
  const { brand } = useSettings();
  return (
    <Button
      onClick={() => generateSummaryPDF({ period, financial, people, highlights, brand })}
      variant="outline"
      className="h-10 px-4 rounded-xl font-bold gap-2 border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
    >
      <Printer className="w-4 h-4" />
      <span className="hidden sm:inline">Print Summary</span>
    </Button>
  );
}
