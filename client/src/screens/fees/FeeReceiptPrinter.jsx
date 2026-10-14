import jsPDF from "jspdf";

// Thermal-printer slip for fee collection. Sized for an 80mm receipt roll —
// the page width is fixed at 80mm and the height is generous enough to fit
// the content; thermal printers auto-cut at the end of the printed region,
// so any unused tail is not wasted paper.
//
// Call imperatively from a click handler:
//   printFeeReceipt({ voucher, student, paidNow, paymentMethod, transactionId, brand });
//
// Auto-opens the PDF in a new tab with the print dialog already open so the
// cashier can hit Enter and walk away. Falling back to download if the
// browser's pop-up blocker rejects the new tab.
export function printFeeReceipt({
  voucher,
  student,
  paidNow,
  paymentMethod,
  transactionId,
  brand = {},
}) {
  const schoolName = brand.schoolName || "School Name Here";
  // 80mm wide, tall enough for a typical voucher (will be cut by the printer)
  const PAGE_W = 80;
  const PAGE_H = 200;
  const MARGIN = 4;
  const INNER = PAGE_W - MARGIN * 2;

  const doc = new jsPDF({
    unit: "mm",
    format: [PAGE_W, PAGE_H],
    orientation: "portrait",
  });

  const formatPKR = (n) =>
    `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;
  const formatDateTime = (raw) => {
    const d = raw ? new Date(raw) : new Date();
    return d.toLocaleString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  let y = MARGIN + 2;

  // ---------- Header ----------
  // Centered logo on the slip — falls back gracefully if no logo is set
  // or the data URL is corrupt. jsPDF infers PNG/JPEG/WEBP from the URI.
  if (brand.logoDataUrl) {
    const logoSize = 14;
    const logoX = (PAGE_W - logoSize) / 2;
    const fmt = brand.logoDataUrl.startsWith("data:image/jpeg") || brand.logoDataUrl.startsWith("data:image/jpg")
      ? "JPEG"
      : brand.logoDataUrl.startsWith("data:image/webp")
        ? "WEBP"
        : "PNG";
    try {
      doc.addImage(brand.logoDataUrl, fmt, logoX, y, logoSize, logoSize, undefined, "FAST");
      y += logoSize + 2;
    } catch {
      // ignore — keeps the rest of the slip intact when image data is bad
    }
  }

  // School name at a smaller size with auto-wrap, so long school names
  // don't overflow the 80mm slip width.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const nameLines = doc.splitTextToSize(schoolName.toUpperCase(), INNER);
  nameLines.forEach((line) => {
    doc.text(line, PAGE_W / 2, y, { align: "center" });
    y += 3.5;
  });
  y += 0.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Fee Collection Receipt", PAGE_W / 2, y, { align: "center" });
  y += 3;

  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 4;

  // Helper for two-column rows. Label left, value right, fixed cell.
  const row = (label, value, opts = {}) => {
    const { bold = false, size = 9 } = opts;
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(String(label), MARGIN, y);
    doc.text(String(value), PAGE_W - MARGIN, y, { align: "right" });
    y += size * 0.45 + 1;
  };

  const dashedLine = () => {
    doc.setLineDashPattern([0.6, 0.6], 0);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    doc.setLineDashPattern([], 0);
    y += 3;
  };

  const sectionLabel = (text) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(text, MARGIN, y);
    y += 3;
  };

  // ---------- Receipt meta ----------
  row("Receipt #:", voucher.voucherNumber || "—");
  row("Date:", formatDateTime(new Date()));
  dashedLine();

  // ---------- Student ----------
  sectionLabel("STUDENT");
  const studentName = student
    ? `${student.firstName || ""} ${student.lastName || ""}`.trim()
    : "Unknown";
  row("Name:", studentName);
  if (student?.class) row("Class:", student.class);
  if (student?.rollNumber) row("Roll:", String(student.rollNumber));
  dashedLine();

  // ---------- Charges ----------
  sectionLabel("CHARGES");
  row("Month:", voucher.month || "—");
  row("Total Payable:", formatPKR(voucher.calculatedTotal ?? voucher.totalPayable));
  if ((voucher.fine || 0) > 0) row("Late Fee Fine:", formatPKR(voucher.fine));
  if ((voucher.discount || 0) > 0) row("Discount:", `- ${formatPKR(voucher.discount)}`);
  const priorPaid = Number(voucher.paidAmount || 0);
  if (priorPaid > 0) row("Previously Paid:", formatPKR(priorPaid));
  dashedLine();

  // ---------- Payment ----------
  sectionLabel("PAYMENT");
  row("Method:", (paymentMethod || "—").toUpperCase());
  if (transactionId) row("Ref:", transactionId);

  // Highlighted "paid now" line — slightly larger, bold
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.text("PAID NOW:", MARGIN, y + 2);
  doc.text(formatPKR(paidNow), PAGE_W - MARGIN, y + 2, { align: "right" });
  y += 8;

  const totalDue = Number(voucher.calculatedTotal ?? voucher.totalPayable ?? 0);
  const newPaidTotal = priorPaid + Number(paidNow || 0);
  const remaining = Math.max(0, totalDue - newPaidTotal);
  const status = newPaidTotal >= totalDue ? "PAID" : "PARTIAL";

  row("Remaining:", formatPKR(remaining), { bold: remaining > 0 });
  row("Status:", status, { bold: true });
  dashedLine();

  // ---------- Footer ----------
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("Thank you for your payment", PAGE_W / 2, y, { align: "center" });
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Please retain this receipt for your records.", PAGE_W / 2, y, {
    align: "center",
  });
  y += 4;

  // Contact info, one piece per line so 80mm width can hold each cleanly.
  doc.setFontSize(6);
  const contactLines = [brand.schoolPhone, brand.schoolEmail, brand.schoolAddress].filter(Boolean);
  contactLines.forEach((line) => {
    doc.text(String(line), PAGE_W / 2, y, { align: "center", maxWidth: INNER });
    y += 2.6;
  });

  if (contactLines.length > 0) y += 1;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("THIS IS A SYSTEM GENERATED RECORD", PAGE_W / 2, y, { align: "center" });
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.text("Powered by AddsMint", PAGE_W / 2, y, { align: "center" });

  // Open in a new tab with the print dialog ready. Fall back to a save if the
  // popup is blocked so the cashier still gets the receipt.
  doc.autoPrint();
  const url = doc.output("bloburl");
  const win = window.open(url, "_blank");
  if (!win) {
    doc.save(`Receipt_${voucher.voucherNumber || Date.now()}.pdf`);
  }
}
