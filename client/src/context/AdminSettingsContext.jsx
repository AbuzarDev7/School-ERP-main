import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { sessionsClient } from "@/services/authService";
import { adminUsersClient } from "@/services/adminUsersService";
import { rolesClient } from "@/services/rolesService";
import { activityClient } from "@/services/activityService";
import { useAuth } from "@/context/AuthContext";

const AdminSettingsContext = createContext();

// Mounted at the Settings screen (admin-only) — keeps the four admin data
// slices (sessions, users, roles+permissions, activity) cached across tab
// switches so flipping between them is instant after the first parallel
// load. App-level mount would be wasteful for non-admin users.
export function AdminSettingsProvider({ children }) {
  const { isAdmin } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const [activityLimit, setActivityLimit] = useState(100);

  // Tracks whether the eager-fetch has run so a remount of the provider
  // (e.g. after revoking the current session) doesn't double-fire.
  const didInitialFetch = useRef(false);

  const refreshSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      setSessions(await sessionsClient.list());
    } catch (e) {
      console.error("[AdminSettingsContext] sessions fetch failed", e?.message);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      setUsers(await adminUsersClient.list());
    } catch (e) {
      console.error("[AdminSettingsContext] users fetch failed", e?.message);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const refreshRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const [rs, ps] = await Promise.all([rolesClient.list(), rolesClient.listPermissions()]);
      setRoles(rs);
      setPermissions(ps);
    } catch (e) {
      console.error("[AdminSettingsContext] roles fetch failed", e?.message);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  const refreshActivity = useCallback(async (nextLimit) => {
    const limit = nextLimit ?? activityLimit;
    setLoadingActivity(true);
    try {
      setActivityLogs(await activityClient.list({ limit }));
      if (nextLimit !== undefined) setActivityLimit(nextLimit);
    } catch (e) {
      console.error("[AdminSettingsContext] activity fetch failed", e?.message);
    } finally {
      setLoadingActivity(false);
    }
  }, [activityLimit]);

  useEffect(() => {
    if (didInitialFetch.current) return;
    didInitialFetch.current = true;
    // Sessions is per-user and always available to authenticated users.
    refreshSessions();
    // Admin-only slices — Users/Roles/Activity endpoints all require ADMIN
    // and would 401/403 for non-admin viewers. Skip the fetch entirely so
    // non-admins on the Sessions tab don't see toast errors.
    if (isAdmin) {
      refreshUsers();
      refreshRoles();
      refreshActivity();
    }
  }, [isAdmin, refreshSessions, refreshUsers, refreshRoles, refreshActivity]);

  const value = useMemo(
    () => ({
      sessions,
      users,
      roles,
      permissions,
      activityLogs,
      activityLimit,

      loadingSessions,
      loadingUsers,
      loadingRoles,
      loadingActivity,

      refreshSessions,
      refreshUsers,
      refreshRoles,
      refreshActivity,

      // Direct setters let the tabs apply optimistic CRUD updates without
      // re-fetching the whole list — same pattern as the other contexts in
      // this app.
      setSessions,
      setUsers,
      setRoles,
      setPermissions,
      setActivityLogs,
    }),
    [
      sessions, users, roles, permissions, activityLogs, activityLimit,
      loadingSessions, loadingUsers, loadingRoles, loadingActivity,
      refreshSessions, refreshUsers, refreshRoles, refreshActivity,
    ]
  );

  return <AdminSettingsContext.Provider value={value}>{children}</AdminSettingsContext.Provider>;
}

export const useAdminSettings = () => {
  const ctx = useContext(AdminSettingsContext);
  if (!ctx) throw new Error("useAdminSettings must be used within an AdminSettingsProvider");
  return ctx;
};
