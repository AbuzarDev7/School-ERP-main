// client/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { authClient } from "@/services/authService";
import { profileClient } from "@/services/settingsService";
import { clearAllTempPasswords } from "@/lib/tempPasswordStore";
import { toast } from "sonner";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on initial render
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    try {
      const { user: userData, token: userToken } = await authClient.login(credentials);
      setUser(userData);
      setToken(userToken);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", userToken);
      toast.success("Logged in successfully!");
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      toast.error(error.message || "Login failed. Please check your credentials.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    setLoading(true);
    try {
      await authClient.register(userData);
      toast.success("Account created successfully! Please log in.");
      return true;
    } catch (error) {
      console.error("Registration failed:", error);
      toast.error(error.message || "Registration failed.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const persistUser = useCallback((u) => {
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const { user: updated } = await authClient.updateProfile(payload);
    persistUser(updated);
    return updated;
  }, [persistUser]);

  const changePassword = useCallback(async (payload) => {
    return await authClient.changePassword(payload);
  }, []);

  // Re-fetch the latest profile from the server. Used by the Settings screen
  // on mount so lastLoginAt / avatarUrl reflect the live row instead of the
  // (possibly stale) snapshot the JWT was minted with.
  const refreshProfile = useCallback(async () => {
    try {
      const fresh = await profileClient.get();
      persistUser(fresh);
      return fresh;
    } catch (e) {
      console.error("[AuthContext.refreshProfile]", e);
      return null;
    }
  }, [persistUser]);

  const uploadAvatar = useCallback(async (file) => {
    const updated = await profileClient.uploadAvatar(file);
    persistUser(updated);
    return updated;
  }, [persistUser]);

  const removeAvatar = useCallback(async () => {
    const updated = await profileClient.removeAvatar();
    persistUser(updated);
    return updated;
  }, [persistUser]);

  const logout = useCallback(async () => {
    // Tell the server to revoke the current session before we drop the token
    // locally — fire-and-forget so a network blip can't trap the user.
    await authClient.logout();
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    // Clear any legacy data caches from previous builds so they can't leak
    // into the next session on a shared machine.
    localStorage.removeItem("addsmint_vouchers_cache");
    // Wipe the temp-password cache for any users this admin invited. Stops
    // the next account that signs in on this browser from seeing the
    // previous admin's generated passwords.
    clearAllTempPasswords();
    toast.info("Logged out successfully.");
  }, []);

  const isAuthenticated = useMemo(() => !!user && !!token, [user, token]);
  const isAdmin = useMemo(() => user?.role === "ADMIN", [user]);
  const isTeacher = useMemo(() => user?.role === "TEACHER", [user]);
  const isStudent = useMemo(() => user?.role === "STUDENT", [user]);

  const authContextValue = useMemo(() => ({
    user,
    token,
    isAuthenticated,
    isAdmin,
    isTeacher,
    isStudent,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshProfile,
    uploadAvatar,
    removeAvatar,
  }), [user, token, isAuthenticated, isAdmin, isTeacher, isStudent, loading, login, register, logout, updateProfile, changePassword, refreshProfile, uploadAvatar, removeAvatar]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};