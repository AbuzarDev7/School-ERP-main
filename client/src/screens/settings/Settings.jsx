import { useState } from "react";
import {
  ShieldCheck,
  Building2,
  Ticket,
  CalendarClock,
  SlidersHorizontal,
  Monitor,
  Database,
  // Bell, // [Notifications disabled — re-enable when launching the feature]
  Users,
  Activity,
  ChevronRight,
  IdCard,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AdminSettingsProvider } from "@/context/AdminSettingsContext";
import { cn } from "@/lib/utils";

import AccountTab from "./tabs/AccountTab";
import SessionsTab from "./tabs/SessionsTab";
import SchoolTab from "./tabs/SchoolTab";
import VouchersTab from "./tabs/VouchersTab";
import FinanceTab from "./tabs/FinanceTab";
import PreferencesTab from "./tabs/PreferencesTab";
import DataTab from "./tabs/DataTab";
// import NotificationsTab from "./tabs/NotificationsTab"; // [Notifications disabled — re-enable when launching the feature]
import StudentsTab from "./tabs/StudentsTab";
import UsersTab from "./tabs/UsersTab";
import RolesTab from "./tabs/RolesTab";
import ActivityTab from "./tabs/ActivityTab";

const SECTIONS = [
  {
    label: "Personal",
    items: [
      {
        value: "account",
        label: "Account",
        description: "Profile, password & avatar",
        icon: ShieldCheck,
        adminOnly: false,
      },
      {
        value: "sessions",
        label: "Sessions",
        description: "Active devices & sign-out",
        icon: Monitor,
        adminOnly: false,
      },
    ],
  },
  {
    label: "Organization",
    items: [
      {
        value: "school",
        label: "School Profile",
        description: "Logo, name & contact info",
        icon: Building2,
        adminOnly: true,
      },
      {
        value: "vouchers",
        label: "Vouchers",
        description: "Numbering & cadence",
        icon: Ticket,
        adminOnly: true,
      },
      {
        value: "students",
        label: "Student Numbering",
        description: "Reg# & roll# prefix, padding, restart",
        icon: IdCard,
        adminOnly: true,
      },
      {
        value: "finance",
        label: "Fees & Salary",
        description: "Late fees & absence rules",
        icon: CalendarClock,
        adminOnly: true,
      },
      {
        value: "preferences",
        label: "Preferences",
        description: "Date format & display",
        icon: SlidersHorizontal,
        adminOnly: true,
      },
      // [Notifications disabled — re-enable when launching the feature]
      // {
      //   value: "notifications",
      //   label: "Notifications",
      //   description: "Email, SMS & WhatsApp templates",
      //   icon: Bell,
      //   adminOnly: true,
      // },
      {
        value: "data",
        label: "Data",
        description: "Export, reset & danger zone",
        icon: Database,
        adminOnly: true,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        value: "users",
        label: "Users",
        description: "Invite, edit & revoke staff accounts",
        icon: Users,
        adminOnly: true,
      },
      {
        value: "roles",
        label: "Roles & Permissions",
        description: "System & custom roles",
        icon: ShieldCheck,
        adminOnly: true,
      },
      {
        value: "activity",
        label: "Activity Log",
        description: "Audit trail of recent actions",
        icon: Activity,
        adminOnly: true,
      },
    ],
  },
];

const TAB_COMPONENTS = {
  account: AccountTab,
  sessions: SessionsTab,
  school: SchoolTab,
  vouchers: VouchersTab,
  students: StudentsTab,
  finance: FinanceTab,
  preferences: PreferencesTab,
  // notifications: NotificationsTab, // [Notifications disabled — re-enable when launching the feature]
  data: DataTab,
  users: UsersTab,
  roles: RolesTab,
  activity: ActivityTab,
};

export default function Settings() {
  // Provider is mounted inside the screen so the four admin data slices
  // (sessions, users, roles, activity) only fetch when an admin opens
  // Settings — and stay cached across tab switches inside this screen.
  return (
    <AdminSettingsProvider>
      <SettingsInner />
    </AdminSettingsProvider>
  );
}

function SettingsInner() {
  const { user, isAdmin } = useAuth();
  const [active, setActive] = useState("account");

  const visibleSections = SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.adminOnly || isAdmin) }))
    .filter((s) => s.items.length > 0);

  const ActiveComponent = TAB_COMPONENTS[active] || AccountTab;
  const flatItems = visibleSections.flatMap((s) => s.items);
  const activeMeta = flatItems.find((i) => i.value === active);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page header */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-40 h-40 bg-emerald-50 rounded-full opacity-60" />
        <div className="absolute right-12 bottom-0 w-24 h-24 bg-blue-50 rounded-full opacity-50" />

        <div className="relative z-10 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <ShieldCheck size={32} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">
              Settings
            </p>
            <h2 className="text-3xl font-black text-slate-900 leading-tight">
              {user?.name || "Administrator"}
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Manage your account, school, and operational rules
            </p>
          </div>
        </div>

        <div className="relative z-10 hidden md:flex flex-col items-end">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Role</span>
          <span className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full mt-1">
            {user?.role || "ADMIN"}
          </span>
        </div>
      </div>

      {/* Mobile sticky quick-switch nav (visible below lg) */}
      <div className="lg:hidden sticky top-0 z-30 -mx-4 px-4 py-2 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
          {flatItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setActive(item.value)}
                className={cn(
                  "shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sidebar + content layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar nav (desktop only — mobile uses the sticky bar above) */}
        <aside className="hidden lg:block bg-white rounded-3xl shadow-sm border border-slate-100 p-4 sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto">
          <nav className="space-y-6">
            {visibleSections.map((section) => (
              <div key={section.label} className="space-y-1.5">
                <p className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = active === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setActive(item.value)}
                        className={cn(
                          "w-full text-left px-3 py-3 rounded-xl flex items-center gap-3 transition-all group",
                          isActive
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                            : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <div
                          className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            isActive
                              ? "bg-white/15 text-white"
                              : "bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600"
                          )}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm font-bold truncate leading-tight",
                              isActive ? "text-white" : "text-slate-900"
                            )}
                          >
                            {item.label}
                          </p>
                          <p
                            className={cn(
                              "text-[11px] font-medium truncate mt-0.5",
                              isActive ? "text-emerald-50/80" : "text-slate-400"
                            )}
                          >
                            {item.description}
                          </p>
                        </div>
                        <ChevronRight
                          size={14}
                          className={cn(
                            "shrink-0 transition-transform",
                            isActive ? "text-white" : "text-slate-300 group-hover:translate-x-0.5"
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0">
          {activeMeta && (
            <div className="hidden lg:flex items-center gap-2 mb-6 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <span>Settings</span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className="text-slate-700">{activeMeta.label}</span>
            </div>
          )}
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
