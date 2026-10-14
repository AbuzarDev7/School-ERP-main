import api from "./api";

// Triggers a browser download from the export endpoint. axios.responseType
// 'blob' lets us hand the body straight to URL.createObjectURL — no need to
// shuttle the payload through React state, which would be wasteful for a
// CSV that could be tens of MB.
const downloadFile = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const filenameFromResponse = (res, fallback) => {
  const cd = res.headers?.["content-disposition"];
  if (!cd) return fallback;
  const match = /filename="?([^"]+)"?/i.exec(cd);
  return match?.[1] || fallback;
};

export const dataClient = {
  exportData: async ({ type, format }) => {
    const res = await api.get("/data/export", {
      params: { type, format },
      responseType: "blob",
    });
    const fallback = `${type}-${new Date().toISOString().slice(0, 10)}.${format}`;
    downloadFile(res.data, filenameFromResponse(res, fallback));
  },

  resetAcademicYear: async (confirmation) =>
    (await api.post("/data/reset-academic-year", { confirmation })).data,

  wipeAllData: async (confirmation) =>
    (await api.post("/data/wipe", { confirmation })).data,

  // POSTs the parsed JSON array under `rows`. The server's controller also
  // accepts a bare array, but the wrapper is friendlier for future schema
  // bumps (e.g. an optional `meta` sibling).
  importStudents: async (rows) =>
    (await api.post("/data/import/students", { rows })).data,
  importVouchers: async (rows) =>
    (await api.post("/data/import/vouchers", { rows })).data,
  importPayments: async (rows) =>
    (await api.post("/data/import/payments", { rows })).data,
};
