import { useEffect, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSettings } from "@/context/SettingsContext";
import { drawHeader, drawFooter } from "@/lib/pdfBranding";

export default function VoucherPrinter({ vouchersToPrint, students }) {
  const { brand } = useSettings();
  const printedForRef = useRef(null);

  const handlePrint = () => {
    const doc = new jsPDF();
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Theme tokens shared across vouchers
    const THEME = [0, 122, 85];
    const SLATE_900 = [15, 23, 42];
    const SLATE_700 = [51, 65, 85];
    const SLATE_500 = [100, 116, 139];
    const SLATE_400 = [148, 163, 184];
    const SLATE_50 = [248, 250, 252];
    const BORDER = [226, 232, 240];
    const RED_600 = [220, 38, 38];

    const formatPKR = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;
    const formatDate = (raw) => raw
      ? new Date(raw).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })
      : "—";

    vouchersToPrint.forEach((voucher, index) => {
      if (index > 0) {
        doc.addPage();
      }

      drawHeader(doc, brand, { subtitle: "AddsMint ERP — Financial Management System" });

      // Lookup student
      const student = students.find(s => s.id === voucher.studentId);
      const studentName = student ? `${student.firstName} ${student.lastName || ''}`.trim() : "Unknown Student";
      const studentClass = student?.class || "—";
      const studentRoll = student?.rollNumber || "—";
      const studentReg = student?.regNumber || "—";
      const studentFather = student?.fathersName || "—";

      // ---------- Title block with accent bar + voucher # on the right ----------
      let currentY = 55;
      doc.setFontSize(22);
      doc.setTextColor(...SLATE_900);
      doc.setFont("helvetica", "bold");
      doc.text("FEE VOUCHER", margin, currentY);

      doc.setFillColor(...THEME);
      doc.rect(margin, currentY + 2, 32, 1.4, 'F');

      // Right-aligned voucher metadata
      doc.setFontSize(8.5);
      doc.setTextColor(...SLATE_400);
      doc.setFont("helvetica", "bold");
      doc.text("VOUCHER NUMBER", pageWidth - margin, currentY - 5, { align: "right" });
      doc.setFontSize(13);
      doc.setTextColor(...THEME);
      doc.text(voucher.voucherNumber || "DRAFT", pageWidth - margin, currentY + 1, { align: "right" });
      doc.setFontSize(8);
      doc.setTextColor(...SLATE_500);
      doc.setFont("helvetica", "normal");
      doc.text(`For ${voucher.month || "—"}`, pageWidth - margin, currentY + 7, { align: "right" });

      currentY += 16;

      // ---------- Two info cards: Billed To + Voucher Details ----------
      const cardGap = 6;
      const cardW = (pageWidth - margin * 2 - cardGap) / 2;
      const cardH = 38;

      const drawCard = (x, label, lines) => {
        doc.setFillColor(...SLATE_50);
        doc.setDrawColor(...BORDER);
        doc.roundedRect(x, currentY, cardW, cardH, 2, 2, 'FD');
        doc.setFontSize(7);
        doc.setTextColor(...SLATE_400);
        doc.setFont("helvetica", "bold");
        doc.text(label.toUpperCase(), x + 5, currentY + 6.5);
        let ly = currentY + 13;
        lines.forEach(([text, opts = {}]) => {
          doc.setFontSize(opts.size || 9);
          doc.setFont("helvetica", opts.bold ? "bold" : "normal");
          doc.setTextColor(...(opts.color || SLATE_700));
          doc.text(String(text), x + 5, ly);
          ly += opts.gap || 5;
        });
      };

      drawCard(margin, "Billed To", [
        [studentName, { size: 12, bold: true, color: SLATE_900, gap: 6 }],
        [`Class ${studentClass}  ·  Roll ${studentRoll}  ·  Reg ${studentReg}`, { size: 8.5, color: SLATE_500, gap: 5 }],
        [`Father: ${studentFather}`, { size: 8.5, color: SLATE_500 }],
      ]);

      drawCard(margin + cardW + cardGap, "Voucher Details", [
        ["Issued", { size: 7, bold: true, color: SLATE_400, gap: 4 }],
        [formatDate(voucher.createdAt || new Date()), { size: 10, bold: true, color: SLATE_900, gap: 6 }],
        ["Due Date", { size: 7, bold: true, color: SLATE_400, gap: 4 }],
        [formatDate(voucher.dueDate), { size: 10, bold: true, color: RED_600 }],
      ]);

      currentY += cardH + 8;

      // ---------- Fee breakdown table ----------
      const feeRows = [
        ["Monthly Fee", "Tuition + Exam + Transport + others", formatPKR(voucher.amount)],
      ];
      if (voucher.arrears > 0) feeRows.push(["Arrears", "Carried forward unpaid balance", `+ ${formatPKR(voucher.arrears)}`]);
      if (voucher.fine > 0) {
        feeRows.push(["Late Fee Fine", "Applied after due date", `+ ${formatPKR(voucher.fine)}`]);
      }
      if (voucher.tuitionDiscount > 0) feeRows.push(["Tuition Discount", "Per-head waiver", `- ${formatPKR(voucher.tuitionDiscount)}`]);
      if (voucher.examDiscount > 0) feeRows.push(["Exam Discount", "Per-head waiver", `- ${formatPKR(voucher.examDiscount)}`]);
      if (voucher.transportDiscount > 0) feeRows.push(["Transport Discount", "Per-head waiver", `- ${formatPKR(voucher.transportDiscount)}`]);

      const categoricalTotal = (voucher.tuitionDiscount || 0) + (voucher.examDiscount || 0) + (voucher.transportDiscount || 0);
      const otherDiscount = (voucher.discount || 0) - categoricalTotal;
      if (otherDiscount > 0) {
        feeRows.push(["Other Discounts", "Sibling / scholarship / merit", `- ${formatPKR(otherDiscount)}`]);
      } else if (feeRows.filter(r => r[0].includes("Discount")).length === 0 && voucher.discount > 0) {
        feeRows.push(["Total Discount", "Combined waivers", `- ${formatPKR(voucher.discount)}`]);
      }

      autoTable(doc, {
        startY: currentY,
        head: [['Component', 'Description', 'Amount']],
        body: feeRows,
        theme: 'grid',
        headStyles: {
          fillColor: THEME,
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8.5,
          cellPadding: 3.2,
          halign: 'left',
        },
        alternateRowStyles: { fillColor: SLATE_50 },
        styles: {
          fontSize: 9,
          cellPadding: 3.2,
          textColor: SLATE_700,
          lineColor: BORDER,
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: SLATE_900 },
          1: { textColor: SLATE_500, fontSize: 8.5 },
          2: { halign: 'right', fontStyle: 'bold', textColor: SLATE_900 },
        },
        margin: { left: margin, right: margin, bottom: 18 },
      });

      currentY = doc.lastAutoTable.finalY + 8;

      // ---------- Notes (left) + Total Payable highlight (right) ----------
      const summaryW = 78;
      const summaryX = pageWidth - margin - summaryW;
      const notesW = summaryX - margin - cardGap;
      const blockH = 38;

      // Notes card
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(margin, currentY, notesW, blockH, 2, 2, 'FD');
      doc.setFontSize(7);
      doc.setTextColor(...SLATE_400);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT INSTRUCTIONS", margin + 5, currentY + 7);
      doc.setFontSize(8.5);
      doc.setTextColor(...SLATE_500);
      doc.setFont("helvetica", "normal");
      doc.text(
        "Please pay before the due date to avoid late charges.\nLate fine of Rs. 100 base applies after the due date and may\nincrease daily per school policy.",
        margin + 5,
        currentY + 13,
        { maxWidth: notesW - 10, lineHeightFactor: 1.4 }
      );

      // Summary highlight
      doc.setFillColor(...SLATE_50);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(summaryX, currentY, summaryW, blockH, 2, 2, 'FD');

      let sY = currentY + 8;
      doc.setFontSize(7);
      doc.setTextColor(...SLATE_400);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT STATUS", summaryX + 5, sY);
      sY += 5;
      doc.setFontSize(10);
      const statusColor = voucher.status === "PAID" ? THEME : RED_600;
      doc.setTextColor(...statusColor);
      doc.setFont("helvetica", "bold");
      doc.text(voucher.status || "UNPAID", summaryX + 5, sY);

      // Grand total band inside summary card
      sY += 6;
      doc.setFillColor(...THEME);
      doc.roundedRect(summaryX + 3, sY, summaryW - 6, 14, 1.5, 1.5, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL PAYABLE", summaryX + 7, sY + 5.5);
      doc.setFontSize(13);
      doc.text(formatPKR(voucher.totalPayable), summaryX + summaryW - 7, sY + 9, { align: "right" });

      currentY += blockH + 8;

      // ---------- Tear-off signature line ----------
      // Sits above the new 18px branded footer with breathing room.
      if (currentY < pageHeight - 35) {
        const sigY = pageHeight - 26;
        const sigW = 60;
        doc.setDrawColor(...SLATE_400);
        doc.setLineWidth(0.3);
        doc.line(pageWidth - margin - sigW, sigY, pageWidth - margin, sigY);
        doc.setFontSize(7.5);
        doc.setTextColor(...SLATE_500);
        doc.setFont("helvetica", "bold");
        doc.text("AUTHORIZED SIGNATURE", pageWidth - margin - sigW / 2, sigY + 4, { align: "center" });
      }

      drawFooter(doc, brand, { rightLabel: "Official Fee Voucher" });
    });

    doc.save(`Fee_Vouchers_${new Date().getTime()}.pdf`);
  };

  // Automatically trigger print whenever a new batch of vouchers is provided.
  // The ref guards against React 19 Strict Mode firing the effect twice on
  // mount and against parents that rebuild the same array on every render.
  // Keying on the sorted set of voucher ids means we only re-fire when the
  // *content* changes, not when a new array reference points at the same data.
  useEffect(() => {
    if (!vouchersToPrint || vouchersToPrint.length === 0) return;
    const key = vouchersToPrint
      .map((v) => v.id || v.voucherNumber)
      .sort()
      .join(",");
    if (printedForRef.current === key) return;
    printedForRef.current = key;
    handlePrint();
  }, [vouchersToPrint]);

  return null;
}