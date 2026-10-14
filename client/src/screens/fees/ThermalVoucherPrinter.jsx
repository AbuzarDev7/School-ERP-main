import jsPDF from "jspdf";

// Thermal-printer slip for fee vouchers (pre-payment). 80mm receipt roll.
// Mirrors FeeReceiptPrinter.jsx — same width/format, same auto-print flow —
// but prints the voucher itself (amount due, fee breakdown, due date) rather
// than a post-payment receipt. Cashier can hand this slip to a parent so
// they know what to pay before they come to the counter.
//
//   printThermalVoucher({ voucher, student, brand });
export function printThermalVoucher({ voucher, student, brand = {} }) {
  const schoolName = brand.schoolName || "School Name Here";
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
  const formatDate = (raw) => {
    const d = raw ? new Date(raw) : new Date();
    return d.toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  let y = MARGIN + 2;

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
  doc.text("Fee Voucher", PAGE_W / 2, y, { align: "center" });
  y += 3;

  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 4;

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

  // ---------- Voucher meta ----------
  row("Voucher #:", voucher.voucherNumber || "—");
  row("Issued:", formatDate(voucher.createdAt));
  row("Due Date:", formatDate(voucher.dueDate));
  dashedLine();

  // ---------- Student ----------
  sectionLabel("STUDENT");
  const studentName = student
    ? `${student.firstName || ""} ${student.lastName || ""}`.trim()
    : "Unknown";
  row("Name:", studentName);
  if (student?.class) row("Class:", student.class);
  if (student?.rollNumber) row("Roll:", String(student.rollNumber));
  if (student?.fatherName) row("Father:", student.fatherName);
  dashedLine();

  // ---------- Fee details ----------
  sectionLabel("FEE DETAILS");
  row("Month:", voucher.month || "—");
  row("Amount:", formatPKR(voucher.amount));
  if ((voucher.arrears || 0) > 0) row("Arrears:", formatPKR(voucher.arrears));
  const fineToShow = voucher.calculatedFine ?? voucher.fine ?? 0;
  if (fineToShow > 0) row("Late Fee Fine:", formatPKR(fineToShow));
  if ((voucher.discount || 0) > 0) row("Discount:", `- ${formatPKR(voucher.discount)}`);
  dashedLine();

  // ---------- Total ----------
  const totalDue = Number(voucher.calculatedTotal ?? voucher.totalPayable ?? 0);
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL PAYABLE:", MARGIN, y + 2);
  doc.text(formatPKR(totalDue), PAGE_W - MARGIN, y + 2, { align: "right" });
  y += 8;

  const priorPaid = Number(voucher.paidAmount || 0);
  if (priorPaid > 0) {
    const remaining = Math.max(0, totalDue - priorPaid);
    row("Previously Paid:", formatPKR(priorPaid));
    row("Remaining:", formatPKR(remaining), { bold: remaining > 0 });
    const status = priorPaid >= totalDue ? "PAID" : "PARTIAL";
    row("Status:", status, { bold: true });
  }
  dashedLine();

  // ---------- Footer ----------
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("Please pay before the due date", PAGE_W / 2, y, { align: "center" });
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Bring this slip when paying at the counter.", PAGE_W / 2, y, {
    align: "center",
  });
  y += 4;

  doc.setFontSize(6);
  const contactLines = [brand.schoolPhone, brand.schoolEmail, brand.schoolAddress].filter(Boolean);
  contactLines.forEach((line) => {
    doc.text(String(line), PAGE_W / 2, y, { align: "center", maxWidth: INNER });
    y += 2.6;
  });

  if (contactLines.length > 0) y += 1;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("THIS IS A SYSTEM GENERATED VOUCHER", PAGE_W / 2, y, { align: "center" });
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.text("Powered by AddsMint", PAGE_W / 2, y, { align: "center" });

  doc.autoPrint();
  const url = doc.output("bloburl");
  const win = window.open(url, "_blank");
  if (!win) {
    doc.save(`Voucher_${voucher.voucherNumber || Date.now()}.pdf`);
  }
}
