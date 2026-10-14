import api from "./api";

export const rolesClient = {
  listPermissions: async () => (await api.get("/roles/permissions")).data.permissions,
  list: async () => (await api.get("/roles")).data.roles,
  create: async (payload) => (await api.post("/roles", payload)).data.role,
  update: async (id, payload) => (await api.patch(`/roles/${id}`, payload)).data.role,
  remove: async (id) => (await api.delete(`/roles/${id}`)).data,
};
