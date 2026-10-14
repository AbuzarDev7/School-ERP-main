import api from "./api";

export const settingsClient = {
  get: async () => (await api.get("/settings")).data.settings,
  update: async (payload) => (await api.patch("/settings", payload)).data.settings,
  uploadLogo: async (file) => {
    const fd = new FormData();
    fd.append("image", file);
    const { data } = await api.post("/settings/logo", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.settings;
  },
  removeLogo: async () => (await api.delete("/settings/logo")).data.settings,
  getStudentSequences: async () => (await api.get("/settings/student-sequences")).data,
  restartRegSequence: async (startFrom) =>
    (await api.post("/settings/student-sequences/reg", { startFrom })).data,
  restartRollSequence: async (startFrom) =>
    (await api.post("/settings/student-sequences/roll", { startFrom })).data,
};

export const profileClient = {
  get: async () => (await api.get("/auth/profile")).data.user,
  uploadAvatar: async (file) => {
    const fd = new FormData();
    fd.append("image", file);
    const { data } = await api.post("/auth/avatar", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.user;
  },
  removeAvatar: async () => (await api.delete("/auth/avatar")).data.user,
};
