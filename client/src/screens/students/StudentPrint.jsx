import jsPDF from "jspdf";

const toBase64 = (url) =>
  new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      resolve(c.toDataURL("image/jpeg"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

export const generateStudentPDF = async (student, docInstance = null) => {
  const doc = docInstance || new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297;

  const templateUrl = `${window.location.origin}/admission-template.jpeg`;
  const [templateB64, photoB64] = await Promise.all([
    toBase64(templateUrl),
    toBase64(student.photo || null),
  ]);

  // ── full-page template background ─────────────────────────────────
  if (templateB64) doc.addImage(templateB64, "JPEG", 0, 0, W, H);

  // ── photo: fits exactly inside dashed passport box ──────────────────
  if (photoB64) doc.addImage(photoB64, "JPEG", 163, 37, 37, 44);

  // ── typed ink ────────────────────────────────────────────────────────
  const put = (text, x, y, size = 9.5, style = "normal") => {
    if (!text) return;
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(15, 30, 80);
    doc.text(String(text), x, y);
  };

  // ── Admission Seeking in Class ────────────────────────────────────
  put(student.class || "",                          68,  54, 10, "bold");

  // ── Student's Name ────────────────────────────────────────────────
  const fullName = `${student.firstName || ""} ${student.lastName || ""}`.trim();
  put(fullName,                                     42, 103, 11, "bold");

  // ── Date of Birth ─────────────────────────────────────────────────
  const dob = student.dob
    ? new Date(student.dob).toLocaleDateString("en-PK", {
        day: "2-digit", month: "2-digit", year: "numeric",
      })
    : "";
  put(dob,                                          35, 128, 9.5, "normal");

  // ── Nationality (right of "Nationality:" label) ───────────────────
  put("Pakistani",                                 134, 140, 9.5, "normal");

  // ── Residential Address ───────────────────────────────────────────
  const addrLines = doc.splitTextToSize(student.address || "", 90);
  put(addrLines[0] || "",                           56, 152,   9, "normal");
  if (addrLines[1]) put(addrLines[1],               12, 161,   9, "normal");

  // ── Father Name ───────────────────────────────────────────────────
  put(student.fathersName || "",                    37, 176,  10, "bold");

  // ── CNIC | Profession ─────────────────────────────────────────────
  put(student.fathersCnic || "",                    23, 187,   9, "normal");
  put(student.guardianOccupation || "",            121, 187,   9, "normal");

  // ── Phone | WhatsAPP ──────────────────────────────────────────────
  put(student.phone || "",                          24, 197,   9, "normal");
  put(student.emergencyNumber || "",               121, 197,   9, "normal");

  // ── save ──────────────────────────────────────────────────────────
  if (!docInstance)
    doc.save(`Admission_Form_${student.regNumber || student.firstName || "Student"}.pdf`);

  return doc;
};
