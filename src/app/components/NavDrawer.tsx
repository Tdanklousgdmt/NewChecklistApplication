import { useEffect } from "react";
import {
  X,
  LayoutDashboard,
  Library,
  Plus,
  CheckCheck,
  ChevronRight,
  UserCircle,
  ShieldCheck,
  BarChart3,
  ScanLine,
} from "lucide-react";

type View = "dashboard" | "library" | "create" | "reports";

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  currentView: string;
  role: "user" | "manager";
  onNavigate: (view: View) => void;
  onSwitchRole: () => void;
  onOpenScanner?: () => void;
}

const NAV_ITEMS: { view: View; label: string; icon: React.ReactNode; managerOnly?: boolean }[] = [
  {
    view: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    view: "library",
    label: "Checklist Library",
    icon: <Library className="w-5 h-5" />,
    managerOnly: true,
  },
  {
    view: "reports",
    label: "Plant Reports",
    icon: <BarChart3 className="w-5 h-5" />,
    managerOnly: true,
  },
  {
    view: "create",
    label: "Create Checklist",
    icon: <Plus className="w-5 h-5" />,
    managerOnly: true,
  },
];

export function NavDrawer({
  open,
  onClose,
  currentView,
  role,
  onNavigate,
  onSwitchRole,
  onOpenScanner,
}: NavDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const isActive = (view: View) =>
    currentView === view ||
    (view === "library" && currentView === "checklist-detail") ||
    (view === "reports"  && currentView === "reports");

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Drawer panel ── */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-50 w-72 bg-white shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
          open ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none"
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shrink-0">
              <CheckCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-800 tracking-wide">eCheck</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            Navigation
          </p>

          {NAV_ITEMS.filter((item) => !item.managerOnly || role === "manager").map((item) => {
            const active = isActive(item.view);
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => {
                  onNavigate(item.view);
                  onClose();
                }}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  active
                    ? "bg-teal-50 text-[#2abaad]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <span
                  className={`shrink-0 ${
                    active ? "text-[#2abaad]" : "text-gray-400"
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2abaad] shrink-0" />
                )}
              </button>
            );
          })}
        </nav>
        {/* Scan QR — available to all roles */}
        <div className="px-3 py-3 border-t border-gray-100">
          <p className="px-3 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            Quick Actions
          </p>
          <button
            type="button"
            onClick={() => { onOpenScanner?.(); onClose(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-800"
          >
            <ScanLine className="w-5 h-5 text-gray-400 shrink-0" />
            Scan QR Code
          </button>
        </div>

        {/* Footer — role indicator + switch */}
        <div className="px-3 pb-4 border-t border-gray-100 pt-4 space-y-2">
          {/* Current role card */}
          <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-xl">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                role === "manager" ? "bg-teal-50" : "bg-slate-100"
              }`}
            >
              {role === "manager" ? (
                <ShieldCheck className="w-4 h-4 text-[#2abaad]" />
              ) : (
                <UserCircle className="w-4 h-4 text-slate-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-800 capitalize">{role}</p>
              <p className="text-[10px] text-gray-400">Current role</p>
            </div>
          </div>

          {/* Switch role button */}
          <button
            type="button"
            onClick={() => {
              onSwitchRole();
              onClose();
            }}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            <span className="flex items-center gap-3">
              <UserCircle className="w-5 h-5 text-gray-400 shrink-0" />
              Switch role
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Hamburger button — drop-in for page headers ── */
export function BurgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open navigation menu"
      className="p-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 shrink-0"
    >
      {/* Three-line hamburger */}
      <div className="flex flex-col gap-[5px] w-5">
        <span className="block h-0.5 w-5 bg-current rounded-full" />
        <span className="block h-0.5 w-3.5 bg-current rounded-full" />
        <span className="block h-0.5 w-5 bg-current rounded-full" />
      </div>
    </button>
  );
}
