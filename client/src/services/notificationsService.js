import api from "./api";

export const notificationsClient = {
  listTemplates: async () => (await api.get("/notifications/templates")).data.templates,

  updateTemplate: async (id, payload) =>
    (await api.patch(`/notifications/templates/${id}`, payload)).data.template,

  listLogs: async (limit = 50) =>
    (await api.get("/notifications/logs", { params: { limit } })).data.logs,

  sendTest: async ({ event, channel, recipient }) =>
    (await api.post("/notifications/test", { event, channel, recipient })).data.log,
};
