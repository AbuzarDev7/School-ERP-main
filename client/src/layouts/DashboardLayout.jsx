import { useState, useEffect } from "react";
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Layers,
  ClipboardList,
  Ticket,
  Menu,
  X,
  ChevronLeft,
  Package,
  NotepadText,
  FileText,
  LogOut,
  Settings,
  ChevronRight,
  GraduationCap,
  Wallet,
  CreditCard,
  Receipt,
  UserPlus,
  ShieldCheck,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { VoucherProvider } from "@/context/VoucherContext";
import { cn } from "@/lib/utils";

// moduleKey must match the keys in UserManagement.jsx ALL_MODULES list.
// ADMIN users see all items. Staff users only see items whose moduleKey is
// in their user.allowedModules array (set by the admin in User Management).
// Items without a moduleKey are always visible (e.g. admin-only pages).
const navGroups = [
  {
    label: "Overview",
    items: [{ name: "Dashboard", path: "/", icon: LayoutDashboard, moduleKey: "dashboard" }],
  },
  {
    label: "Academics",
    items: [
      { name: "Register Student", path: "/students/new", icon: UserPlus, moduleKey: "register-student" },
      { name: "Students", path: "/students", icon: Users, moduleKey: "students" },
      { name: "Fee Structure", path: "/fees", icon: ClipboardList, moduleKey: "fee-structure" },
      { name: "Fee Vouchers", path: "/fees/vouchers", icon: Ticket, moduleKey: "fee-vouchers" },
    ],
  },
  {
    label: "HR & Payroll",
    items: [{ name: "Salary Management", path: "/salary", icon: Wallet, moduleKey: "salary" }],
  },
  {
    label: "Finance",
    items: [
      { name: "Payment Methods", path: "/payment-methods", icon: CreditCard, moduleKey: "payment-methods" },
      { name: "Expenses", path: "/expenses", icon: Receipt, moduleKey: "expenses" },
    ],
  },
  {
    label: "Analysis",
    items: [{ name: "Reports", path: "/reports", icon: FileText, moduleKey: "reports" }],
  },
  {
    label: "Commerce",
    items: [
      { name: "Products", path: "/commerce/products", icon: Package, moduleKey: "products" },
      { name: "Invoices / Sales", path: "/commerce/invoices", icon: NotepadText, moduleKey: "invoices" },
    ],
  },
  {
    label: "Admin",
    adminOnly: true,
    items: [{ name: "User Management", path: "/users", icon: ShieldCheck }],
  },
  {
    label: "Account",
    items: [{ name: "Settings", path: "/settings", icon: Settings, moduleKey: "settings" }],
  },
];

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const allowedModules = user?.allowedModules || [];
  const location = useLocation();

  // Helper to get the current page name from the path
  const getActivePageName = () => {
    const path = location.pathname.split("/").pop();
    if (!path || path === "dashboard") return "Dashboard";
    return path.replace(/-/g, " ");
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleNavClick = () => {
    if (isMobile) setIsSidebarOpen(false);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
        {/* Mobile Overlay */}
        {isMobile && isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-60"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={cn(
            "fixed inset-y-0 left-0 z-70 bg-[#0F172A] text-slate-300 flex flex-col transition-all duration-300 ease-in-out",
            isMobile 
              ? (isSidebarOpen ? "w-72 translate-x-0" : "w-72 -translate-x-full") 
              : (isSidebarOpen ? "w-64" : "w-19.5")
          )}
        >
          {/* Logo Section */}
          <div className="h-20 flex items-center px-4 shrink-0 border-b border-white/5 bg-[#1E293B]/20">
            <div className="flex items-center gap-3 w-full justify-center lg:justify-start lg:px-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                <GraduationCap className="text-white w-6 h-6" />
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col overflow-hidden whitespace-nowrap">
                  <span className="text-sm font-bold text-white tracking-tight leading-none uppercase">School Fee</span>
                  <span className="text-[10px] text-emerald-400 font-bold tracking-[0.2em] mt-1">ERP PORTAL</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 space-y-8 scrollbar-hide px-3 mask-fade-y">
            {navGroups.map((group) => {
              // Admin-only groups (e.g. User Management) only visible to ADMIN
              if (group.adminOnly && !isAdmin) return null;

              // Filter items by allowedModules for non-admin users
              const visibleItems = isAdmin
                ? group.items
                : group.items.filter((item) =>
                    !item.moduleKey || allowedModules.includes(item.moduleKey)
                  );

              if (visibleItems.length === 0) return null;

              return (
                <div key={group.label} className="space-y-2">
                  {isSidebarOpen && (
                    <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                      {group.label}
                    </p>
                  )}
                  <div className="space-y-1">
                    {visibleItems.map((item) => (
                      <SidebarLink
                        key={item.path}
                        item={item}
                        collapsed={!isSidebarOpen && !isMobile}
                        isActive={location.pathname === item.path}
                        onClick={handleNavClick}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Footer User/Logout */}
          <div className="p-4 border-t border-white/5 bg-[#1E293B]/20">
             <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all rounded-xl",
                  !isSidebarOpen && !isMobile && "justify-center px-0"
                )}
                onClick={logout}
             >
                <LogOut size={20} className={cn(isSidebarOpen ? "mr-3" : "m-0")} />
                {isSidebarOpen && <span className="font-semibold text-sm">Sign Out</span>}
             </Button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          !isMobile ? (isSidebarOpen ? "pl-64" : "pl-19.5") : "pl-0"
        )}>
          {/* Header */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-slate-500 hover:bg-slate-100"
              >
                {isSidebarOpen && !isMobile ? <ChevronLeft size={20} /> : <Menu size={20} />}
              </Button>
              {/* Dynamic Page Name in Header */}
              <div className="flex items-center text-sm font-semibold tracking-tight overflow-hidden whitespace-nowrap">
                <span className="text-slate-400 uppercase text-[11px] tracking-widest hidden xs:block">Management</span>
                <ChevronRight size={16} className="mx-2 text-slate-300 hidden xs:block" />
                <span className="text-slate-900 capitalize truncate">
                  {getActivePageName()}
                </span>
              </div>
            </div>

            <Link
              to="/settings"
              className="flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-slate-100 transition-colors"
              title="Account settings"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-none">{user?.name || "Admin"}</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase">Administrator</p>
              </div>
              <Avatar className="h-9 w-9 border-2 border-emerald-500/20">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user?.name} />}
                <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold text-xs">
                  {user?.name?.charAt(0).toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
            </Link>
          </header>

          <main className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
            <div className="max-w-7xl mx-auto">
              <VoucherProvider>
                <Outlet />
              </VoucherProvider>
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 p-4 text-center text-xs text-slate-500 font-medium flex justify-center items-center gap-2">
            {/* <span>
              &copy; {new Date().getFullYear()} School Fee Software. All rights reserved.
            </span> */}
            <span>
              Powered By{" "}
              <a href="https://addsmint.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">AddsMint</a>
            </span>
          </footer>
        </div>
      </div>
    </TooltipProvider>
  );
}

function SidebarLink({ item, collapsed, isActive, onClick }) {
  const Icon = item.icon;
  
  const content = (
    <NavLink
      to={item.path}
      onClick={onClick}
      end={item.path === "/dashboard"}
      className={cn(
        "flex items-center h-8 px-4 rounded-xl text-sm font-medium transition-all duration-200 group relative",
        isActive 
          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
          : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
      )}
    >
      <Icon size={20} className={cn("shrink-0", !isActive && "group-hover:text-emerald-400 transition-colors")} />
      {!collapsed && (
        <span className="ml-3 truncate tracking-wide">
          {item.name}
        </span>
      )}
      
      {/* Visual cue for active state when collapsed */}
      {isActive && collapsed && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full" />
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="bg-[#0F172A] border-slate-700 text-white font-bold text-xs">
          {item.name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}