import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass, ArrowLeft, Home, Search } from "lucide-react";

// Rendered inside DashboardLayout's main content area (via the router's
// catch-all). Centered card so the surrounding sidebar/header still feel
// present — users keep their navigation context instead of being yanked
// silently back to the dashboard.
export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-in fade-in duration-500">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-sm border border-slate-100 p-10 sm:p-12 text-center space-y-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-emerald-50 rounded-full opacity-60 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-50 rounded-full opacity-50 pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-50 border-2 border-emerald-100">
            <Compass size={40} className="text-emerald-600" />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">
              404 · Not Found
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              We can't find that page
            </h1>
            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
              The page you were looking for doesn't exist or has moved. Double-check the
              link, or jump back to a familiar spot.
            </p>
          </div>

          {/* Show the path the user tried so they know exactly what failed */}
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full px-4 py-2 max-w-full">
            <Search size={12} className="text-slate-400 shrink-0" />
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
        </div>
      </div>
    </div>
  );
}
