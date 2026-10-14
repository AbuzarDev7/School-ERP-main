// Shared PDF header/footer renderer so every printout in the app pulls
// branding from one place. Callers pass the `brand` object from
// useSettings() — { schoolName, schoolPhone, schoolEmail, schoolAddress,
// logoDataUrl } — plus optional per-document tweaks (theme, height,
// page-number text, right-aligned label).
//
// Both functions return the `y` coordinate where content can safely
// start / end so caller layouts don't have to hardcode header/footer
// dimensions.

const DEFAULT_THEME = [0, 122, 85]; // emerald-700 — matches the in-app brand
const WHITE = [255, 255, 255];

const detectFormat = (dataUrl) => {
  if (typeof dataUrl !== "string") return "PNG";
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
};

// HEADER: solid band with logo + school name on the left, optional subtitle
// underneath. Returns the y just below the band so the next block can stack.
export function drawHeader(doc, brand = {}, opts = {}) {
  const themeColor = opts.themeColor || DEFAULT_THEME;
  const margin = opts.margin ?? 14;
  const height = opts.height ?? 40;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...themeColor);
  doc.rect(0, 0, pageWidth, height, "F");

  // Logo (left) — degrades gracefully to a placeholder block when none set
  const logoSize = opts.logoSize ?? 24;
  const logoX = margin;
  const logoY = (height - logoSize) / 2;

  if (brand.logoDataUrl) {
    try {
      doc.addImage(brand.logoDataUrl, detectFormat(brand.logoDataUrl), logoX, logoY, logoSize, logoSize, undefined, "FAST");
    } catch {
      // bad image data — fall through to placeholder
    }
  }

  // School name + optional subtitle to the right of the logo
  const textX = logoX + logoSize + 6;
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(opts.titleSize ?? 20);
  doc.text(String(brand.schoolName || "School"), textX, logoY + 9);

  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(opts.subtitleSize ?? 9);
    doc.text(String(opts.subtitle), textX, logoY + 16);
  }

  // Optional right-aligned label (document type, date stamp, etc.)
  if (opts.rightLabel) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(opts.rightLabelSize ?? 11);
    doc.text(String(opts.rightLabel), pageWidth - margin, logoY + 9, { align: "right" });
    if (opts.rightSubLabel) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(String(opts.rightSubLabel), pageWidth - margin, logoY + 15, { align: "right" });
    }
  }

  return height;
}

// FOOTER: solid band, two stacked rows. Top row is contact info from
// brand. Bottom row is "Powered by AddsMint" (left, locked) +
// "THIS IS A SYSTEM GENERATED RECORD" (centre) + optional right label /
// page number (right).
//
// Pass `opts.pageNumber` as a pre-formatted string (e.g. "Page 1 of 3")
// or omit and pass `opts.rightLabel` instead — they share the slot.
export function drawFooter(doc, brand = {}, opts = {}) {
  const themeColor = opts.themeColor || DEFAULT_THEME;
  const margin = opts.margin ?? 14;
  const height = opts.height ?? 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const top = pageHeight - height;

  doc.setFillColor(...themeColor);
  doc.rect(0, top, pageWidth, height, "F");

  // Contact line (top row)
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  const parts = [brand.schoolPhone, brand.schoolEmail, brand.schoolAddress]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);
  if (parts.length > 0) {
    doc.text(parts.join("  ·  "), pageWidth / 2, top + 6, { align: "center" });
  }

  // Bottom row — three slots
  const bottomY = top + height - 4;
  doc.setFontSize(7);

  doc.setFont("helvetica", "normal");
  doc.text("Powered by AddsMint", margin, bottomY);

  doc.setFont("helvetica", "bold");
  doc.text("THIS IS A SYSTEM GENERATED RECORD", pageWidth / 2, bottomY, { align: "center" });

  const right = opts.rightLabel || opts.pageNumber;
  if (right) {
    doc.setFont("helvetica", "normal");
    doc.text(String(right), pageWidth - margin, bottomY, { align: "right" });
  }

  return top;
}

// Iterates every page on the supplied `doc` and stamps the footer. Call
// after all content is laid out so we know the final page count. Pass
// `withPageNumbers: true` to inject "Page X of Y" into the right slot.
export function applyFooterToAllPages(doc, brand, opts = {}) {
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const footerOpts = { ...opts };
    if (opts.withPageNumbers) {
      footerOpts.pageNumber = `Page ${i} of ${total}`;
    }
    drawFooter(doc, brand, footerOpts);
  }
}
