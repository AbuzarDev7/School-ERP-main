import React from "react"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useSettings } from "@/context/SettingsContext"
import { drawHeader, applyFooterToAllPages } from "@/lib/pdfBranding"

export default function ReportPrinter({ tab, data, dateFrom, dateTo, selectedClassFilter, selectedMethodFilter, selectedHeadFilter, selectedHeadName, selectedInvoiceMethodFilter, selectedIncomePeriod, selectedSalaryStatus, selectedSalaryMonth, selectedSalarySession, selectedStudentId, selectedSession }) {
  const { brand } = useSettings();
  const handlePrint = () => {
    const doc = new jsPDF()
    const margin = 14
    const pageWidth = doc.internal.pageSize.getWidth()

    const title = tab.charAt(0).toUpperCase() + tab.slice(1) + " Report"

    drawHeader(doc, brand, { subtitle: "AddsMint ERP — Financial Management System" });

    // ---------- Theme tokens ----------
    const THEME = [0, 122, 85];
    const SLATE_900 = [15, 23, 42];
    const SLATE_700 = [51, 65, 85];
    const SLATE_500 = [100, 116, 139];
    const SLATE_400 = [148, 163, 184];
    const SLATE_100 = [241, 245, 249];
    const SLATE_50 = [248, 250, 252];
    const BORDER = [226, 232, 240];
    const EMERALD_50 = [236, 253, 245];
    const AMBER_600 = [217, 119, 6];
    const RED_600 = [220, 38, 38];

    const formatPKR = (n) => Math.round(n).toLocaleString('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });

    // Robust currency parser. The earlier implementation stripped letters
    // before noticing the sign, so "-Rs 500" became positive 500. It also
    // returned 0 for em-dash and "N/A", indistinguishable from a real zero
    // in summary rows. Detect the sign first, then strip everything that
    // isn't a digit or decimal point.
    const parseAmt = (s) => {
      if (s === null || s === undefined) return 0;
      const str = String(s).trim();
      if (!str || str === "—" || str === "-" || /^n\/a$/i.test(str)) return 0;
      const negative = /-/.test(str);
      const cleaned = str.replace(/[^0-9.]/g, "");
      const v = parseFloat(cleaned);
      if (!Number.isFinite(v)) return 0;
      return negative ? -v : v;
    };

    // ---------- Title + accent bar ----------
    let currentY = 55;
    doc.setFontSize(20);
    doc.setTextColor(...SLATE_900);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, currentY);

    doc.setFillColor(...THEME);
    doc.rect(margin, currentY + 2, 36, 1.4, 'F');

    currentY += 10;
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_500);
    doc.setFont("helvetica", "normal");
    // Pin to en-PK so the timestamp on every printed report is consistent
    // regardless of the operator's browser locale (the other printers in
    // this folder already use this format).
    doc.text(`A consolidated overview generated on ${new Date().toLocaleString("en-PK")}.`, margin, currentY);

    // ---------- Metadata card ----------
    currentY += 6;
    const metadata = [];
    // Render the date filter as a range. Three cases: both empty → All Time;
    // both set → "from → to"; one set → "from onwards" / "until to".
    let dateLabel;
    if (dateFrom && dateTo) dateLabel = `${dateFrom} → ${dateTo}`;
    else if (dateFrom) dateLabel = `${dateFrom} onwards`;
    else if (dateTo) dateLabel = `until ${dateTo}`;
    else dateLabel = 'All Time';
    metadata.push(['Date Range', dateLabel]);
    metadata.push(['Total Records', String(data.length)]);
    if (tab === "defaulters" && selectedClassFilter && selectedClassFilter !== "all") metadata.push(['Class', selectedClassFilter]);
    if (tab === "classes" && selectedClassFilter && selectedClassFilter !== "all") metadata.push(['Class', selectedClassFilter]);
    if (tab === "students" && selectedClassFilter && selectedClassFilter !== "all") metadata.push(['Class', selectedClassFilter]);
    if (tab === "collection" && selectedMethodFilter && selectedMethodFilter !== "all") metadata.push(['Payment Method', selectedMethodFilter.toUpperCase()]);
    if (tab === "expenses" && selectedHeadFilter && selectedHeadFilter !== "all") metadata.push(['Expense Head', selectedHeadName || selectedHeadFilter]);
    if (tab === "invoices" && selectedInvoiceMethodFilter && selectedInvoiceMethodFilter !== "all") metadata.push(['Payment Method', selectedInvoiceMethodFilter.toUpperCase()]);
    if (tab === "income" && selectedIncomePeriod) metadata.push(['Period', selectedIncomePeriod]);
    if (tab === "salary" && selectedSalaryMonth) {
      const [yy, mm] = selectedSalaryMonth.split("-");
      const monthName = new Date(Number(yy), Number(mm) - 1, 1).toLocaleString("en-US", { month: "long" });
      metadata.push(['Pay Period', `${monthName} ${yy}`]);
    }
    if (tab === "salary" && selectedSalarySession) metadata.push(['Session', selectedSalarySession]);
    if (tab === "salary" && selectedSalaryStatus && selectedSalaryStatus !== "all") metadata.push(['Status', selectedSalaryStatus.toUpperCase()]);
    if (tab === "ledger" && selectedStudentId) metadata.push(['Student', data[0]?.student || 'N/A']);
    if (tab === "ledger" && selectedSession && selectedSession !== "all") metadata.push(['Session', selectedSession]);

    const metaCols = Math.min(3, Math.max(2, metadata.length));
    const metaRows = Math.ceil(metadata.length / metaCols);
    const metaH = metaRows * 11 + 8;
    const metaW = pageWidth - margin * 2;
    doc.setFillColor(...SLATE_50);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(margin, currentY, metaW, metaH, 2, 2, 'FD');
    const colW = metaW / metaCols;
    metadata.forEach((entry, i) => {
      const r = Math.floor(i / metaCols);
      const c = i % metaCols;
      const x = margin + c * colW + 5;
      const y = currentY + 7 + r * 11;
      doc.setFontSize(6.5);
      doc.setTextColor(...SLATE_400);
      doc.setFont("helvetica", "bold");
      doc.text(entry[0].toUpperCase(), x, y);
      doc.setFontSize(9);
      doc.setTextColor(...SLATE_900);
      doc.setFont("helvetica", "bold");
      doc.text(String(entry[1]), x, y + 5);
    });
    currentY += metaH + 8;

    // ---------- KPI strip (per tab) ----------
    const kpis = [];
    if (tab === "defaulters") {
      const totalDue = data.reduce((s, r) => s + parseAmt(r.due), 0);
      const totalMonths = data.reduce((s, r) => s + (Number(r.unpaidMonths) || 0), 0);
      kpis.push({ label: "Defaulters", value: String(data.length), accent: THEME });
      kpis.push({ label: "Total Outstanding", value: formatPKR(totalDue), accent: RED_600 });
      kpis.push({ label: "Months Due (sum)", value: String(totalMonths), accent: AMBER_600 });
    } else if (tab === "classes") {
      const totalStudents = data.reduce((s, r) => s + (Number(r.total) || 0), 0);
      const totalDefaulters = data.reduce((s, r) => s + (Number(r.defaulters) || 0), 0);
      const totalNew = data.reduce((s, r) => s + (Number(r.newAdmissions) || 0), 0);
      kpis.push({ label: "Classes", value: String(data.length), accent: SLATE_700 });
      kpis.push({ label: "Active Students", value: String(totalStudents), accent: THEME });
      kpis.push({ label: "Defaulters / New", value: `${totalDefaulters} / ${totalNew}`, accent: AMBER_600 });
    } else if (tab === "students") {
      const totalPaid = data.reduce((s, r) => s + parseAmt(r.paid), 0);
      const totalOutstanding = data.reduce((s, r) => s + parseAmt(r.outstanding), 0);
      const defaulters = data.filter((r) => parseAmt(r.outstanding) > 0).length;
      kpis.push({ label: "Students", value: String(data.length), accent: SLATE_700 });
      kpis.push({ label: "Total Collected", value: formatPKR(totalPaid), accent: THEME });
      kpis.push({ label: "Outstanding", value: `${formatPKR(totalOutstanding)}  (${defaulters})`, accent: RED_600 });
    } else if (tab === "collection") {
      const generated = data.reduce((s, r) => s + (Number(r.generated) || 0), 0);
      const paid = data.reduce((s, r) => s + (Number(r.paid) || 0), 0);
      const collected = data.reduce((s, r) => s + parseAmt(r.amount), 0);
      kpis.push({ label: "Days in Range", value: String(data.length), accent: SLATE_700 });
      kpis.push({ label: "Vouchers Generated / Paid", value: `${generated} / ${paid}`, accent: THEME });
      kpis.push({ label: "Net Collection", value: formatPKR(collected), accent: THEME });
    } else if (tab === "income") {
      const total = data.reduce((s, r) => s + parseAmt(r.amount), 0);
      const months = data.length;
      const avg = months > 0 ? total / months : 0;
      kpis.push({ label: "Fee Categories", value: String(months), accent: SLATE_700 });
      kpis.push({ label: "Total Collection", value: formatPKR(total), accent: THEME });
      kpis.push({ label: "Average / Category", value: formatPKR(avg), accent: AMBER_600 });
    } else if (tab === "invoices") {
      const total = data.reduce((s, r) => s + parseAmt(r.grandTotal), 0);
      const count = data.length;
      const avg = count > 0 ? total / count : 0;
      kpis.push({ label: "Invoices", value: String(count), accent: SLATE_700 });
      kpis.push({ label: "Total Sales", value: formatPKR(total), accent: THEME });
      kpis.push({ label: "Average / Invoice", value: formatPKR(avg), accent: AMBER_600 });
    } else if (tab === "ledger") {
      const generated = data.reduce((s, r) => s + parseAmt(r.paidAmount), 0);
      const targeted = data.reduce((s, r) => s + parseAmt(r.totalPayable), 0);
      const rate = targeted > 0 ? ((generated / targeted) * 100).toFixed(1) : "0.0";
      kpis.push({ label: "Generated Revenue", value: formatPKR(generated), accent: THEME });
      kpis.push({ label: "Targeted Revenue", value: formatPKR(targeted), accent: SLATE_700 });
      kpis.push({ label: "Collection Rate", value: `${rate}%`, accent: AMBER_600 });
    } else if (tab === "expenses") {
      const total = data.reduce((s, r) => s + parseAmt(r.amount), 0);
      const avg = data.length > 0 ? total / data.length : 0;
      kpis.push({ label: "Entries", value: String(data.length), accent: SLATE_700 });
      kpis.push({ label: "Total Spent", value: formatPKR(total), accent: RED_600 });
      kpis.push({ label: "Average / Entry", value: formatPKR(avg), accent: AMBER_600 });
    } else if (tab === "salary") {
      const totalSalary = data.reduce((s, r) => s + parseAmt(r.salary), 0);
      const totalPaid = data.reduce((s, r) => s + parseAmt(r.netPaid), 0);
      const paid = data.filter((r) => r.status === "Paid").length;
      const pending = data.filter((r) => r.status === "Unpaid").length;
      kpis.push({ label: "Salary Bill", value: formatPKR(totalSalary), accent: SLATE_700 });
      kpis.push({ label: "Net Paid", value: formatPKR(totalPaid), accent: THEME });
      kpis.push({ label: "Paid / Pending", value: `${paid} / ${pending}`, accent: AMBER_600 });
    }

    if (kpis.length > 0) {
      const gap = 4;
      const cardW = (metaW - gap * (kpis.length - 1)) / kpis.length;
      const cardH = 18;
      kpis.forEach((k, i) => {
        const x = margin + i * (cardW + gap);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...BORDER);
        doc.roundedRect(x, currentY, cardW, cardH, 1.5, 1.5, 'FD');
        doc.setFillColor(...k.accent);
        doc.rect(x, currentY, cardW, 1.2, 'F');
        doc.setFontSize(6.5);
        doc.setTextColor(...SLATE_400);
        doc.setFont("helvetica", "bold");
        doc.text(k.label.toUpperCase(), x + 4, currentY + 7);
        doc.setFontSize(11);
        doc.setTextColor(...SLATE_900);
        doc.setFont("helvetica", "bold");
        doc.text(k.value, x + 4, currentY + 14);
      });
      currentY += cardH + 8;
    }

    // ---------- Table columns ----------
    let columns = [];
    let rows = [];
    let columnStyles = { 0: { cellWidth: 9, halign: 'center' } };

    switch (tab) {
      case "defaulters":
        columns = ["#", "Student Name", "Class", "Due Amount", "Months Due"];
        rows = data.map((item, index) => [index + 1, item.name, item.class, item.due, item.unpaidMonths ? `${item.unpaidMonths} Month${item.unpaidMonths !== 1 ? 's' : ''}` : 'N/A']);
        columnStyles = { ...columnStyles, 3: { halign: 'right', fontStyle: 'bold' }, 4: { halign: 'center' } };
        break;
      case "classes":
        columns = ["#", "Class", "Active Students", "New Admissions", "Defaulters", "Outstanding", "Inactive", "Status"];
        rows = data.map((item, index) => [index + 1, item.className, item.total, item.newAdmissions, item.defaulters, item.outstanding, item.inactive, item.status]);
        columnStyles = {
          ...columnStyles,
          1: { fontStyle: 'bold' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'right', fontStyle: 'bold' },
          6: { halign: 'center' },
          7: { halign: 'center' },
        };
        break;
      case "students":
        columns = ["#", "Student", "Class", "Roll", "Reg #", "Vouchers", "Total Paid", "Fines", "Outstanding", "Status"];
        rows = data.map((item, index) => [index + 1, item.name, item.class, item.roll, item.reg, item.vouchers, item.paid, item.fines, item.outstanding, item.status]);
        columnStyles = {
          ...columnStyles,
          1: { fontStyle: 'bold' },
          3: { halign: 'center' },
          4: { halign: 'center', fontSize: 8 },
          5: { halign: 'center' },
          6: { halign: 'right', fontStyle: 'bold', textColor: THEME },
          7: { halign: 'right' },
          8: { halign: 'right', fontStyle: 'bold', textColor: RED_600 },
          9: { halign: 'center' },
        };
        break;
      case "collection":
        columns = ["#", "Date", "Generated", "Paid", "Unpaid", "Total Collected"];
        rows = data.map((item, index) => [index + 1, item.date, item.generated, item.paid, item.unpaid, item.amount]);
        columnStyles = { ...columnStyles, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'right', fontStyle: 'bold' } };
        break;
      case "income":
        columns = ["#", "Fee Category", "Total Collection"];
        rows = data.map((item, index) => [index + 1, item.head, item.amount]);
        columnStyles = { ...columnStyles, 2: { halign: 'right', fontStyle: 'bold' } };
        break;
      case "invoices":
        columns = ["#", "Date", "Invoice #", "Student", "Items", "Discount", "Method", "Grand Total"];
        rows = data.map((item, index) => [index + 1, item.date, item.invoiceNumber, item.student, item.items, item.discount, item.method, item.grandTotal]);
        columnStyles = {
          ...columnStyles,
          4: { halign: 'center' },
          5: { halign: 'center' },
          6: { halign: 'center' },
          7: { halign: 'right', fontStyle: 'bold' },
        };
        break;
      case "expenses":
        columns = ["#", "Date", "Head", "Description", "Method", "Amount"];
        rows = data.map((item, index) => [index + 1, item.date, item.head, item.note, item.method, item.amount]);
        columnStyles = { ...columnStyles, 5: { halign: 'right', fontStyle: 'bold' } };
        break;
      case "salary":
        columns = ["#", "Staff", "Role", "Salary", "Overtime", "Advances", "Absence Ded.", "Net Paid", "Method", "Status"];
        rows = data.map((item, index) => [index + 1, item.name, item.role, item.salary, item.overtime, item.advances, item.absence, item.netPaid, item.method, item.status]);
        columnStyles = {
          ...columnStyles,
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right', fontStyle: 'bold' },
          9: { halign: 'center' },
        };
        break;
      case "ledger":
        columns = ["#", "Voucher #", "Date", "Student", "Type", "Total Payable", "Paid Amount", "Payment Date", "Payment Status", "Status"];
        rows = data.map((item, index) => [index + 1, item.voucherNumber, item.date, item.student, item.type, item.totalPayable, item.paidAmount, item.paymentDate, item.paymentStatus, item.status]);
        columnStyles = { ...columnStyles, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' }, 8: { halign: 'center' }, 9: { halign: 'center' } };
        break;
      default:
        break;
    }

    autoTable(doc, {
      startY: currentY,
      head: [columns],
      body: rows,
      theme: "grid",
      headStyles: {
        fillColor: THEME,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        cellPadding: 3.2,
        halign: 'left',
      },
      alternateRowStyles: { fillColor: SLATE_50 },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: SLATE_700,
        lineColor: BORDER,
        lineWidth: 0.1,
      },
      columnStyles,
      margin: { left: margin, right: margin, bottom: 22 },
    });

    // ---------- Summary box helper ----------
    const drawSummaryBox = (heading, lines, highlight) => {
      const lineH = 6;
      const padding = 6;
      const headingH = 10;
      const highlightH = highlight ? 14 : 0;
      const boxH = headingH + lines.length * lineH + highlightH + padding;
      const boxW = pageWidth - margin * 2;

      // Page-break if too close to footer
      if (currentY + boxH > doc.internal.pageSize.getHeight() - 22) {
        doc.addPage();
        currentY = 50;
      }

      // Outer box
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(margin, currentY, boxW, boxH, 2, 2, 'FD');

      // Heading bar
      doc.setFillColor(...SLATE_100);
      doc.roundedRect(margin, currentY, boxW, headingH, 2, 2, 'F');
      doc.rect(margin, currentY + headingH - 2, boxW, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...SLATE_500);
      doc.setFont("helvetica", "bold");
      doc.text(heading.toUpperCase(), margin + 5, currentY + 6.5);

      // Body lines
      let lineY = currentY + headingH + 5;
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      lines.forEach(([label, value, color]) => {
        doc.setTextColor(...SLATE_500);
        doc.text(label, margin + 5, lineY);
        doc.setTextColor(...(color || SLATE_900));
        doc.setFont("helvetica", "bold");
        doc.text(String(value), pageWidth - margin - 5, lineY, { align: "right" });
        doc.setFont("helvetica", "normal");
        lineY += lineH;
      });

      // Highlight row
      if (highlight) {
        const hY = lineY + 1;
        doc.setFillColor(...EMERALD_50);
        doc.roundedRect(margin + 4, hY, boxW - 8, highlightH - 2, 1.5, 1.5, 'F');
        doc.setFontSize(8);
        doc.setTextColor(...SLATE_500);
        doc.setFont("helvetica", "bold");
        doc.text(highlight[0].toUpperCase(), margin + 8, hY + 5.5);
        doc.setFontSize(13);
        doc.setTextColor(...THEME);
        doc.text(String(highlight[1]), pageWidth - margin - 8, hY + 8.5, { align: "right" });
      }

      currentY += boxH + 6;
    };

    // ---------- Classes summary ----------
    if (tab === "classes" && data.length > 0) {
      const totalStudents = data.reduce((s, r) => s + (Number(r.total) || 0), 0);
      const totalNew = data.reduce((s, r) => s + (Number(r.newAdmissions) || 0), 0);
      const totalInactive = data.reduce((s, r) => s + (Number(r.inactive) || 0), 0);
      const totalDefaulters = data.reduce((s, r) => s + (Number(r.defaulters) || 0), 0);
      const totalOutstanding = data.reduce((s, r) => s + parseAmt(r.outstanding), 0);

      currentY = doc.lastAutoTable.finalY + 8;
      drawSummaryBox(
        "Class-wise Summary",
        [
          ["Classes", String(data.length), SLATE_900],
          ["New Admissions", String(totalNew), THEME],
          ["Inactive / Discharged", String(totalInactive), SLATE_500],
          ["Defaulters", String(totalDefaulters), AMBER_600],
        ],
        ["Total Active Students", String(totalStudents)]
      );

      if (totalOutstanding > 0) {
        currentY += 2;
        drawSummaryBox(
          "Outstanding Recovery",
          [["Outstanding Across All Selected Classes", formatPKR(totalOutstanding), RED_600]],
          null
        );
      }
    }

    // ---------- Students summary ----------
    if (tab === "students" && data.length > 0) {
      const totalPaid = data.reduce((s, r) => s + parseAmt(r.paid), 0);
      const totalOutstanding = data.reduce((s, r) => s + parseAmt(r.outstanding), 0);
      const totalFines = data.reduce((s, r) => s + parseAmt(r.fines), 0);
      const defaulters = data.filter((r) => parseAmt(r.outstanding) > 0).length;
      const inactive = data.filter((r) => r.status === "Inactive").length;

      currentY = doc.lastAutoTable.finalY + 8;
      drawSummaryBox(
        "Students Summary",
        [
          ["Students Listed", String(data.length), SLATE_900],
          ["Defaulters", String(defaulters), AMBER_600],
          ["Inactive", String(inactive), SLATE_500],
          ["Total Collected", formatPKR(totalPaid), THEME],
          ["Fines Charged", formatPKR(totalFines), AMBER_600],
        ],
        ["Total Outstanding", formatPKR(totalOutstanding)]
      );
    }

    // ---------- Income summary ----------
    if (tab === "income" && data.length > 0) {
      const total = data.reduce((s, r) => s + parseAmt(r.amount), 0);
      const months = data.length;
      const avg = months > 0 ? total / months : 0;
      const top = [...data].sort((a, b) => parseAmt(b.amount) - parseAmt(a.amount))[0];

      currentY = doc.lastAutoTable.finalY + 8;
      drawSummaryBox(
        "Fee Collection Summary",
        [
          ["Fee Categories", String(months), SLATE_900],
          ["Average / Category", formatPKR(avg), AMBER_600],
          top ? [`Top Category (${top.head})`, top.amount, THEME] : ["Top Category", "—", SLATE_500],
        ],
        ["Total Fee Collection", formatPKR(total)]
      );
    }

    // ---------- Invoices (sales) summary ----------
    if (tab === "invoices" && data.length > 0) {
      const total = data.reduce((s, r) => s + parseAmt(r.grandTotal), 0);
      const count = data.length;
      const avg = count > 0 ? total / count : 0;

      const byMethod = {};
      data.forEach((r) => {
        if (r.method && r.method !== "—") byMethod[r.method] = (byMethod[r.method] || 0) + parseAmt(r.grandTotal);
      });
      const top = Object.entries(byMethod).sort((a, b) => b[1] - a[1])[0];

      currentY = doc.lastAutoTable.finalY + 8;
      drawSummaryBox(
        "Sales Summary",
        [
          ["Invoices", String(count), SLATE_900],
          ["Average / Invoice", formatPKR(avg), AMBER_600],
          top ? [`Top Method (${top[0]})`, formatPKR(top[1]), THEME] : ["Top Method", "—", SLATE_500],
        ],
        ["Total Sales", formatPKR(total)]
      );
    }

    // ---------- Expenses summary ----------
    if (tab === "expenses" && data.length > 0) {
      const total = data.reduce((s, r) => s + parseAmt(r.amount), 0);
      const avg = data.length > 0 ? total / data.length : 0;

      // Largest head by spend
      const byHead = {};
      data.forEach((r) => {
        byHead[r.head] = (byHead[r.head] || 0) + parseAmt(r.amount);
      });
      const top = Object.entries(byHead).sort((a, b) => b[1] - a[1])[0];

      currentY = doc.lastAutoTable.finalY + 8;
      drawSummaryBox(
        "Expenses Summary",
        [
          ["Total Entries", String(data.length), SLATE_900],
          ["Average / Entry", formatPKR(avg), AMBER_600],
          top ? [`Top Head (${top[0]})`, formatPKR(top[1]), THEME] : ["Top Head", "—", SLATE_500],
        ],
        ["Total Spent", formatPKR(total)]
      );
    }

    // ---------- Salary summary ----------
    if (tab === "salary" && data.length > 0) {
      const totalSalary = data.reduce((s, r) => s + parseAmt(r.salary), 0);
      const totalOvertime = data.reduce((s, r) => s + parseAmt(r.overtime), 0);
      const totalAdvances = data.reduce((s, r) => s + parseAmt(r.advances), 0);
      const totalAbsence = data.reduce((s, r) => s + parseAmt(r.absence), 0);
      const totalPaid = data.reduce((s, r) => s + parseAmt(r.netPaid), 0);
      const paidCount = data.filter((r) => r.status === "Paid").length;
      const pendingCount = data.filter((r) => r.status === "Unpaid").length;

      currentY = doc.lastAutoTable.finalY + 8;
      drawSummaryBox(
        "Payroll Summary",
        [
          ["Staff (Paid / Pending)", `${paidCount} / ${pendingCount}`, SLATE_900],
          ["Gross Salary Bill", formatPKR(totalSalary), SLATE_900],
          ["Overtime Pay", formatPKR(totalOvertime), THEME],
          ["Advances Outstanding", formatPKR(totalAdvances), AMBER_600],
          ["Absence Deductions", formatPKR(totalAbsence), RED_600],
        ],
        ["Total Net Paid", formatPKR(totalPaid)]
      );
    }

    // ---------- Ledger summary ----------
    if (tab === "ledger" && data.length > 0) {
      const generatedRevenue = data.reduce((s, r) => s + parseAmt(r.paidAmount), 0);
      const targetedRevenue = data.reduce((s, r) => s + parseAmt(r.totalPayable), 0);
      const collectionRate = targetedRevenue > 0 ? (generatedRevenue / targetedRevenue * 100).toFixed(2) : "0.00";

      const lines = [
        ["Generated Revenue", formatPKR(generatedRevenue), THEME],
        ["Targeted Revenue", formatPKR(targetedRevenue), SLATE_900],
        ["Collection Rate", `${collectionRate}%`, AMBER_600],
      ];
      if (selectedClassFilter && selectedClassFilter !== "all") {
        lines.push(["Class Filter", selectedClassFilter, SLATE_500]);
      }

      currentY = doc.lastAutoTable.finalY + 8;
      drawSummaryBox("Session Summary", lines);
    }

    applyFooterToAllPages(doc, brand, { withPageNumbers: true });

    doc.save(`${tab}_report_${new Date().getTime()}.pdf`);
  }

  return (
    <Button onClick={handlePrint} variant="outline" className="h-10 px-4 rounded-xl font-bold gap-2 border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all">
      <Printer className="w-4 h-4" />
      <span className="hidden sm:inline">Print PDF</span>
    </Button>
  )
}