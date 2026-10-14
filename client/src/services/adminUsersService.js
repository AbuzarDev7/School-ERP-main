import api from "./api";

export const adminUsersClient = {
  list: async () => (await api.get("/admin/users")).data.users,
  invite: async (payload) => (await api.post("/admin/users", payload)).data, // { user, tempPassword }
  update: async (id, payload) => (await api.patch(`/admin/users/${id}`, payload)).data.user,
  resetPassword: async (id) => (await api.post(`/admin/users/${id}/reset-password`)).data, // { user, tempPassword }
  remove: async (id) => (await api.delete(`/admin/users/${id}`)).data,
};
