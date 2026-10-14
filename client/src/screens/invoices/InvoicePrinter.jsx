import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSettings } from "@/context/SettingsContext";
import { drawHeader, drawFooter } from "@/lib/pdfBranding";

/**
 * Core logic to generate the PDF
 */
export const generateInvoicePDF = ({ invoice, student, products, brand = {} }) => {
    if (!invoice) return;

    const doc = new jsPDF();
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    drawHeader(doc, brand, { subtitle: "AddsMint ERP — Official Sales Invoice" });

    // ---------- Theme tokens ----------
    const THEME = [0, 122, 85];
    const SLATE_900 = [15, 23, 42];
    const SLATE_700 = [51, 65, 85];
    const SLATE_500 = [100, 116, 139];
    const SLATE_400 = [148, 163, 184];
    const SLATE_100 = [241, 245, 249];
    const SLATE_50 = [248, 250, 252];
    const BORDER = [226, 232, 240];
    const RED_600 = [220, 38, 38];

    const formatPKR = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;

    // ---------- Title + accent bar ----------
    let currentY = 55;
    doc.setFontSize(22);
    doc.setTextColor(...SLATE_900);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", margin, currentY);

    doc.setFillColor(...THEME);
    doc.rect(margin, currentY + 2, 32, 1.4, 'F');

    // Right-aligned invoice number + date
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE_400);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE NUMBER", pageWidth - margin, currentY - 5, { align: "right" });
    doc.setFontSize(13);
    doc.setTextColor(...THEME);
    doc.text(`#${invoice.invoiceNumber || 'DRAFT'}`, pageWidth - margin, currentY + 1, { align: "right" });
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_500);
    doc.setFont("helvetica", "normal");
    doc.text(`Issued: ${new Date(invoice.invoiceDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}`,
      pageWidth - margin, currentY + 7, { align: "right" });

    currentY += 16;

    // ---------- Two-column info cards: Billed To + Sale Info ----------
    const cardGap = 6;
    const cardW = (pageWidth - margin * 2 - cardGap) / 2;
    const cardH = 32;

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

    const studentName = student ? `${student.firstName} ${student.lastName}` : "Unknown Student";
    drawCard(margin, "Billed To", [
      [studentName, { size: 11, bold: true, color: SLATE_900, gap: 6 }],
      [`Class: ${student?.class || "N/A"}  ·  Roll: ${student?.rollNumber || "N/A"}`, { size: 8.5, color: SLATE_500, gap: 4.5 }],
      [`Reg #: ${student?.regNumber || "N/A"}`, { size: 8.5, color: SLATE_500 }],
    ]);

    const methodLabel = invoice.paymentMethod
      ? `Received via ${invoice.paymentMethod}`
      : "Pending Receipt";
    drawCard(margin + cardW + cardGap, "Sale Information", [
      ["Payment Method", { size: 7, bold: true, color: SLATE_400, gap: 4 }],
      [methodLabel, { size: 11, bold: true, color: invoice.paymentMethod ? THEME : RED_600, gap: 6 }],
      [`Items: ${(invoice.items || []).length}  ·  Discount: ${invoice.discount || 0}%`, { size: 8.5, color: SLATE_500 }],
    ]);

    currentY += cardH + 8;

    // ---------- Items Table ----------
    const tableData = (invoice.items || []).map((item, index) => {
      const product = products?.find(p => p.id === item.productId);
      return [
        index + 1,
        product ? product.productName : "Unknown Item",
        product?.category || "—",
        item.quantity,
        formatPKR(item.unitPrice),
        formatPKR(item.total),
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Item', 'Category', 'Qty', 'Unit Price', 'Line Total']],
      body: tableData,
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
        0: { cellWidth: 9, halign: 'center' },
        2: { textColor: SLATE_500, fontSize: 8.5 },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold', textColor: SLATE_900 },
      },
      margin: { left: margin, right: margin, bottom: 18 },
    });

    currentY = doc.lastAutoTable.finalY + 8;

    // ---------- Totals: Notes (left) + Summary box (right) ----------
    const subtotal = (invoice.items || []).reduce((sum, it) => sum + Number(it.total || 0), 0);
    const grand = Number(invoice.grandTotal || subtotal);
    const discountAmt = Math.max(0, subtotal - grand);

    const summaryW = 78;
    const summaryX = pageWidth - margin - summaryW;
    const notesW = summaryX - margin - cardGap;

    // Notes card on the left
    const notesH = 42;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(margin, currentY, notesW, notesH, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(...SLATE_400);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT NOTES", margin + 5, currentY + 7);
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE_500);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Please retain this receipt for your records.\nItems are non-refundable after 7 days.\nFor any queries contact the school office.",
      margin + 5,
      currentY + 14,
      { maxWidth: notesW - 10, lineHeightFactor: 1.4 }
    );

    // Summary card on the right
    const summaryH = notesH;
    doc.setFillColor(...SLATE_50);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(summaryX, currentY, summaryW, summaryH, 2, 2, 'FD');

    let sY = currentY + 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_500);
    doc.text("Sub-total", summaryX + 5, sY);
    doc.setTextColor(...SLATE_900);
    doc.setFont("helvetica", "bold");
    doc.text(formatPKR(subtotal), summaryX + summaryW - 5, sY, { align: "right" });

    sY += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_500);
    doc.text(`Discount (${invoice.discount || 0}%)`, summaryX + 5, sY);
    doc.setTextColor(...RED_600);
    doc.setFont("helvetica", "bold");
    doc.text(`- ${formatPKR(discountAmt)}`, summaryX + summaryW - 5, sY, { align: "right" });

    // Divider
    sY += 4;
    doc.setDrawColor(...BORDER);
    doc.line(summaryX + 4, sY, summaryX + summaryW - 4, sY);

    // Grand total highlight
    sY += 3;
    doc.setFillColor(...THEME);
    doc.roundedRect(summaryX + 3, sY, summaryW - 6, 14, 1.5, 1.5, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("GRAND TOTAL", summaryX + 7, sY + 5.5);
    doc.setFontSize(13);
    doc.text(formatPKR(grand), summaryX + summaryW - 7, sY + 9, { align: "right" });

    currentY += summaryH + 8;

    // ---------- Signature line ----------
    // Sits above the 18px branded footer with breathing room.
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

    drawFooter(doc, brand, { rightLabel: "Official Sales Invoice" });

    doc.save(`Invoice_${invoice.invoiceNumber || 'Draft'}.pdf`);
};

export default function InvoicePrinter(props) {
  const { brand } = useSettings();
  return (
    <Button
        variant="outline"
        size="sm"
        onClick={() => generateInvoicePDF({ ...props, brand })}
        className="flex items-center gap-2 border-slate-200 text-slate-600 hover:text-green-600"
    >
      <Printer className="h-4 w-4" />
      <span>Print Invoice</span>
    </Button>
  );
}