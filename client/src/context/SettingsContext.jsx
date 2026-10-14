import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { settingsClient } from "@/services/settingsService";
import { useAuth } from "@/context/AuthContext";
import { formatDate as formatDateRaw } from "@/lib/formatDate";

const SettingsContext = createContext();

// Defaults must mirror the schema — used as a synchronous fallback before the
// first GET resolves so screens that render at boot (DashboardLayout etc.)
// don't flicker on missing values.
const DEFAULT_SETTINGS = {
  schoolName: "My School",
  schoolPhone: null,
  schoolEmail: null,
  schoolAddress: null,
  schoolLogoUrl: null,
  voucherHeader: null,
  voucherFooter: null,
  voucherPrefix: "V",
  voucherPadding: 4,
  voucherResetCadence: "YEARLY",
  graceDays: 0,
  defaultLateFinePerDay: 0,
  absenceWorkingDaysDivisor: 30,
  dateFormat: "DD/MM/YYYY",
};

export function SettingsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsClient.get();
      setSettings(data);
    } catch (e) {
      console.error("[SettingsContext] fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (payload) => {
    const updated = await settingsClient.update(payload);
    setSettings(updated);
    return updated;
  }, []);

  const uploadLogo = useCallback(async (file) => {
    const updated = await settingsClient.uploadLogo(file);
    setSettings(updated);
    return updated;
  }, []);

  const removeLogo = useCallback(async () => {
    const updated = await settingsClient.removeLogo();
    setSettings(updated);
    return updated;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchSettings();
  }, [isAuthenticated, fetchSettings]);

  // Preload the logo as a base64 data URL so PDF printers can use it
  // synchronously via doc.addImage(). jsPDF's addImage doesn't accept
  // remote URLs reliably, and most of our printers are sync top-to-bottom,
  // so we resolve the network fetch up-front and cache the result here.
  useEffect(() => {
    const url = settings.schoolLogoUrl;
    if (!url) {
      setLogoDataUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (!cancelled) setLogoDataUrl(dataUrl);
      } catch (e) {
        if (!cancelled) {
          console.error("[SettingsContext] logo preload failed", e?.message);
          setLogoDataUrl(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [settings.schoolLogoUrl]);

  // Bound formatDate that always uses the current dateFormat from settings —
  // saves callers from threading the format string through every call.
  const formatDate = useCallback(
    (input) => formatDateRaw(input, settings.dateFormat),
    [settings.dateFormat]
  );

  // Single object printers can spread into drawHeader/drawFooter. Mirrors
  // the schema fields so adding a new branding column here is a one-line
  // change downstream.
  const brand = useMemo(
    () => ({
      schoolName: settings.schoolName,
      schoolPhone: settings.schoolPhone,
      schoolEmail: settings.schoolEmail,
      schoolAddress: settings.schoolAddress,
      voucherHeader: settings.voucherHeader,
      voucherFooter: settings.voucherFooter,
      logoDataUrl,
    }),
    [settings.schoolName, settings.schoolPhone, settings.schoolEmail, settings.schoolAddress, settings.voucherHeader, settings.voucherFooter, logoDataUrl]
  );

  const value = useMemo(
    () => ({
      settings,
      loading,
      refreshSettings: fetchSettings,
      updateSettings,
      uploadLogo,
      removeLogo,
      formatDate,
      brand,
      logoDataUrl,
    }),
    [settings, loading, fetchSettings, updateSettings, uploadLogo, removeLogo, formatDate, brand, logoDataUrl]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
};
