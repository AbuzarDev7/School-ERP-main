import axios from "axios"

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ""}/api`,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401 the token is invalid or expired — clear local auth state and bounce
// the user back to the login screen. We deliberately do NOT auto-logout on
// every 401: a transient backend hiccup or a permission check on a single
// endpoint shouldn't kill an otherwise-valid "Remember me" session. We only
// treat 401s as session-fatal when the server message clearly indicates the
// token/session itself is gone, or when the failing request is an auth
// endpoint. Other 401s are surfaced to the caller to handle locally.
const SESSION_FATAL_PATTERNS = [
  /not authorized, no token/i,
  /not authorized, token failed/i,
  /session expired/i,
  /session not found/i,
  /signed out remotely/i,
]

const isSessionFatal = (error) => {
  if (error?.response?.status !== 401) return false
  const url = String(error?.config?.url || "")
  if (url.includes("/auth/")) return true
  const msg = error?.response?.data?.message || ""
  return SESSION_FATAL_PATTERNS.some((re) => re.test(msg))
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isSessionFatal(error)) {
      const onLogin = window.location.pathname.startsWith("/auth/login")
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      if (!onLogin) {
        window.location.assign("/auth/login")
      }
    }
    return Promise.reject(error)
  }
)

export default api
