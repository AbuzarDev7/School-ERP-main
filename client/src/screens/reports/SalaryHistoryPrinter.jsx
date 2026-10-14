import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getWorkerById } from "@/services/workerService";
import { useSettings } from "@/context/SettingsContext";
import { drawHeader, applyFooterToAllPages } from "@/lib/pdfBranding";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const formatPKR = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;
const formatDate = (raw) => raw ? new Date(raw).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—";

/**
 * Generate a salary history report for a single staff member, scoped to a session.
 * `session` should be a 4-digit calendar year (e.g. 2026); when provided, the report
 * only includes payments whose `month` falls within that year.
 */
export const generateSalaryHistoryPDF = ({ worker, session, brand = {} }) => {
  if (!worker) return;

  const sessionYear = session ? Number(session) : new Date().getFullYear();
  const sessionLabel = `${sessionYear}-${String(sessionYear + 1).slice(-2)}`;

  const doc = new jsPDF();
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawHeader(doc, brand, { subtitle: "AddsMint ERP — Staff Salary History" });

  // ---------- Theme tokens ----------
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

  // ---------- Title + accent bar ----------
  let currentY = 55;
  doc.setFontSize(20);
  doc.setTextColor(...SLATE_900);
  doc.setFont("helvetica", "bold");
  doc.text("STAFF SALARY HISTORY", margin, currentY);

  doc.setFillColor(...THEME);
  doc.rect(margin, currentY + 2, 36, 1.4, 'F');

  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_500);
  doc.setFont("helvetica", "normal");
  doc.text(`Session ${sessionLabel}  ·  Generated ${new Date().toLocaleString("en-PK")}`, margin, currentY + 9);

  currentY += 14;

  // ---------- Identity card ----------
  const cardW = pageWidth - margin * 2;
  const cardH = 38;
  doc.setFillColor(...SLATE_50);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, currentY, cardW, cardH, 2.5, 2.5, 'FD');
  doc.setFillColor(...THEME);
  doc.rect(margin, currentY, 2, cardH, 'F');

  doc.setFontSize(15);
  doc.setTextColor(...SLATE_900);
  doc.setFont("helvetica", "bold");
  doc.text(worker.name || "Unnamed Staff", margin + 6, currentY + 9);

  doc.setFontSize(8);
  doc.setTextColor(...THEME);
  doc.setFont("helvetica", "bold");
  doc.text(`${worker.role || "STAFF"}`.toUpperCase(), margin + 6, currentY + 14);

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
  drawIdField("Phone", worker.phone, margin + 6, idGridY);
  drawIdField("Status", worker.status, margin + 6 + colW, idGridY);
  drawIdField("Monthly Salary", formatPKR(worker.monthlySalary), margin + 6 + colW * 2, idGridY);
  drawIdField("Joined", formatDate(worker.createdAt), margin + 6 + colW * 3, idGridY);

  currentY += cardH + 8;

  // ---------- Build per-month payment rows (sorted ascending by month string) ----------
  // Filter to only the payments within the active session year (e.g. months "2026-01" through "2026-12").
  const yearPrefix = String(sessionYear);
  const payments = [...(worker.payments || [])]
    .filter((p) => String(p.month || "").startsWith(yearPrefix))
    .sort((a, b) => String(a.month).localeCompare(String(b.month)));
  const advancesByMonth = (worker.advances || [])
    .filter((a) => String(a.month || "").startsWith(yearPrefix))
    .reduce((acc, a) => {
      acc[a.month] = (acc[a.month] || 0) + Number(a.amount || 0);
      return acc;
    }, {});

  const formatMonth = (raw) => {
    if (!raw) return "—";
    const [yy, mm] = String(raw).split("-");
    if (!yy || !mm) return raw;
    return `${MONTHS[Math.max(0, Number(mm) - 1)]} ${yy}`;
  };

  const rows = payments.map((p, i) => {
    const baseSalary = Number(p.totalSalary || 0);
    const overtime = Number(p.overtimeAmount || 0);
    const advances = Number(p.advanceTotal || advancesByMonth[p.month] || 0);
    const absence = Number(p.absenceDeduction || 0);
    const net = Number(p.netPaid || 0);
    return [
      i + 1,
      formatMonth(p.month),
      formatPKR(baseSalary),
      formatPKR(overtime),
      formatPKR(advances),
      formatPKR(absence),
      formatPKR(net),
      p.method || "—",
      formatDate(p.paidDate),
    ];
  });

  // ---------- KPI strip ----------
  const totalEarned = payments.reduce((s, p) => s + Number(p.netPaid || 0), 0);
  const monthsPaid = payments.length;
  const avgMonthly = monthsPaid > 0 ? totalEarned / monthsPaid : 0;
  const totalAdvances = (worker.advances || [])
    .filter((a) => String(a.month || "").startsWith(yearPrefix))
    .reduce((s, a) => s + Number(a.amount || 0), 0);

  const kpis = [
    { label: "Months Paid", value: String(monthsPaid), accent: SLATE_700 },
    { label: "Total Net Earned", value: formatPKR(totalEarned), accent: THEME },
    { label: "Avg / Month", value: formatPKR(avgMonthly), accent: AMBER_600 },
    { label: "Total Advances", value: formatPKR(totalAdvances), accent: RED_600 },
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

  // ---------- History table ----------
  if (rows.length === 0) {
    doc.setFillColor(...SLATE_50);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(margin, currentY, cardW, 22, 2, 2, 'FD');
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_500);
    doc.setFont("helvetica", "italic");
    doc.text(`No salary payments recorded in the ${sessionLabel} session.`, margin + cardW / 2, currentY + 13, { align: "center" });
    currentY += 30;
  } else {
    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Month', 'Base Salary', 'Overtime', 'Advances', 'Absence', 'Net Paid', 'Method', 'Paid On']],
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
        1: { fontStyle: 'bold', textColor: SLATE_900 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold', textColor: THEME },
        7: { halign: 'center', fontSize: 8 },
        8: { halign: 'center', textColor: SLATE_500 },
      },
      margin: { left: margin, right: margin, bottom: 22 },
    });

    currentY = doc.lastAutoTable.finalY + 8;
  }

  // ---------- Summary box (only if payments exist) ----------
  if (rows.length > 0) {
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
    doc.text(`SESSION ${sessionLabel} EARNINGS`, margin + 8, currentY + 9);
    doc.setFontSize(7.5);
    doc.text(`${monthsPaid} months paid  ·  Avg ${formatPKR(avgMonthly)} / month`, margin + 8, currentY + 16);

    doc.setFontSize(20);
    doc.text(formatPKR(totalEarned), pageWidth - margin - 8, currentY + 16, { align: "right" });

    currentY += boxH + 6;
  }

  // Stamp the branded footer on every page now that we know the total count.
  applyFooterToAllPages(doc, brand, { withPageNumbers: true });

  const safeName = (worker.name || "staff").replace(/\s+/g, "_");
  doc.save(`SalaryHistory_${safeName}_${sessionLabel}.pdf`);
};

export default function SalaryHistoryPrinter({ workerId, workerName, session }) {
  const { brand } = useSettings();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!workerId || loading) return;
    setLoading(true);
    try {
      const fullWorker = await getWorkerById(workerId);
      if (!fullWorker) {
        toast.error(`Could not find ${workerName || "this staff member"}`);
        return;
      }
      generateSalaryHistoryPDF({ worker: fullWorker, session, brand });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to generate salary history");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
      onClick={handleClick}
      disabled={loading}
      title="Download full salary history"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
    </Button>
  );
}
