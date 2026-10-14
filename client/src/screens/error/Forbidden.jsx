import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldOff, ArrowLeft, Home, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Rendered standalone by ProtectedRoute when the authenticated user's role
// isn't in the route's allowedRoles. Full-screen frame because we're outside
// DashboardLayout at this point — the layout is gated on role too in some
// future iterations, so we don't lean on it.
export default function Forbidden() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 p-10 sm:p-12 text-center space-y-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-rose-50 rounded-full opacity-60 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-50 rounded-full opacity-50 pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-rose-50 border-2 border-rose-100">
            <ShieldOff size={40} className="text-rose-500" />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-600">
              403 · Restricted
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              You don't have access here
            </h1>
            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
              {user?.name ? (
                <>
                  You're signed in as <b className="text-slate-700">{user.name}</b>
                  {user.role && (
                    <> with the role <b className="text-slate-700">{user.role}</b></>
                  )}
                  , but this page is reserved for a different role.
                </>
              ) : (
                <>This page is reserved for users with elevated permissions.</>
              )}{" "}
              Contact an administrator if you believe this is a mistake.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full px-4 py-2 max-w-full">
            <ShieldOff size={12} className="text-slate-400 shrink-0" />
            <code className="font-mono text-[11px] text-slate-600 truncate">
              {location.pathname}
            </code>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="h-11 rounded-xl font-bold border-slate-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
            <Link to="/">
              <Button className="h-11 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20">
                <Home className="mr-2 h-4 w-4" /> Open Dashboard
              </Button>
            </Link>
          </div>

          <button
            type="button"
            onClick={logout}
            className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-500 inline-flex items-center gap-1.5 transition-colors"
          >
            <LogOut size={11} /> Sign out & switch accounts
          </button>
        </div>
      </div>
    </div>
  );
}
