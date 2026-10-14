import api from "./api";

export const activityClient = {
  list: async (params = {}) => (await api.get("/activity", { params })).data.logs,
};
