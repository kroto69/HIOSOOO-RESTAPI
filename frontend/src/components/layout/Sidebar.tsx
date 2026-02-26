import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, LayoutDashboard, Settings, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import logo from "@/images/logo3.png";
import { listDevices } from "@/lib/api";
import { useUiStore } from "@/store/useUiStore";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  mobile?: boolean;
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  mobile = false,
  open = false,
  onClose,
}: SidebarProps) {
  const location = useLocation();
  const { autoRefreshEnabled, setAutoRefreshEnabled } = useUiStore();
  const dashboardRouteActive =
    location.pathname === "/" || location.pathname.startsWith("/olt/");
  const [dashboardExpanded, setDashboardExpanded] = useState(
    dashboardRouteActive
  );

  const { data: devices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: listDevices,
    enabled: mobile ? open : true,
    staleTime: 30000,
  });

  useEffect(() => {
    if (dashboardRouteActive) {
      setDashboardExpanded(true);
    }
  }, [dashboardRouteActive]);

  const containerClass = mobile
    ? [
        "fixed inset-y-0 left-0 z-50 flex h-[100dvh] max-h-[100dvh] w-[min(20rem,92vw)] flex-col overflow-hidden border-r border-[#3b6a97] bg-[#4478aa] px-4 py-4 shadow-card transition-transform duration-300 sm:w-[min(22rem,86vw)] sm:px-6 sm:py-6 xl:hidden",
        open ? "translate-x-0" : "-translate-x-full",
      ].join(" ")
    : "sticky top-0 hidden h-screen w-64 flex-col border-r border-[#3b6a97] bg-[#4478aa] px-5 py-8 xl:flex";

  return (
    <aside className={containerClass}>
      <div className={mobile ? "mb-8" : "mb-10"}>
        <div className="flex items-center justify-between gap-3">
          <img src={logo} alt="KROTO" className="h-16 w-16" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-white">HIOSO</p>
            <p className="truncate text-xs text-blue-100">OLT Management</p>
          </div>
          {mobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close menu"
              className="text-white hover:bg-white/15 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      <nav className="mt-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        <button
          type="button"
          onClick={() => setDashboardExpanded((prev) => !prev)}
          aria-expanded={dashboardExpanded}
          className={[
            "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
            dashboardRouteActive
              ? "bg-white/20 text-white"
              : "text-blue-100 hover:bg-white/10 hover:text-white",
          ].join(" ")}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="flex-1 text-left">Dashboard</span>
          <ChevronDown
            className={[
              "h-4 w-4 transition-transform",
              dashboardExpanded ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>
        <div
          className={[
            "overflow-hidden transition-all duration-200",
            dashboardExpanded ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0",
          ].join(" ")}
        >
          <div
            className={[
              "mt-1 space-y-1 overflow-y-auto rounded-xl p-2",
              mobile ? "ml-2 max-h-64 bg-[#3f709f]" : "max-h-72 bg-[#3f709f]",
            ].join(" ")}
          >
            <NavLink
              to="/"
              onClick={() => onClose?.()}
              className={({ isActive }) =>
                [
                  "block rounded-lg px-3 py-2 text-sm font-semibold transition",
                  isActive
                    ? "bg-white text-[#2f5f8d]"
                    : "text-blue-100 hover:bg-white/10 hover:text-white",
                ].join(" ")
              }
            >
              Overview
            </NavLink>
            {devicesLoading && (
              <p className="px-3 py-2 text-xs text-blue-100/90">Loading OLT list...</p>
            )}
            {!devicesLoading && devices.length === 0 && (
              <p className="px-3 py-2 text-xs text-blue-100/90">
                Belum ada OLT terdaftar
              </p>
            )}
            {devices.map((device) => (
              <NavLink
                key={device.id}
                to={`/olt/${device.id}`}
                onClick={() => onClose?.()}
              >
                {({ isActive }) => (
                  <div
                    className={[
                      "rounded-lg px-3 py-2 text-sm transition",
                      isActive
                        ? "border border-white/40 bg-white text-[#2f5f8d]"
                        : "text-blue-100 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{device.name}</p>
                      {isActive && (
                        <span className="rounded-full bg-[#4478aa]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#4478aa]">
                          Sedang dibuka
                        </span>
                      )}
                    </div>
                    <p
                      className={[
                        "truncate text-[11px]",
                        isActive ? "text-[#4478aa]/80" : "text-blue-100/80",
                      ].join(" ")}
                    >
                      {device.id}
                    </p>
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        </div>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            [
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
              isActive
                ? "bg-white/20 text-white"
                : "text-blue-100 hover:bg-white/10 hover:text-white",
            ].join(" ")
          }
          onClick={() => onClose?.()}
        >
          <Settings className="h-5 w-5" />
          Settings
        </NavLink>
      </nav>
      <div className="mt-3 rounded-2xl border border-white/25 bg-white/10 p-4 text-sm text-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Auto-refresh</p>
            <p className="text-xs text-blue-100/90">
              Interval 30 detik (opsional)
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoRefreshEnabled}
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className={[
              "relative inline-flex h-6 w-11 items-center rounded-full transition",
              autoRefreshEnabled ? "bg-[#9fd8c5]" : "bg-[#2f5f8d]",
            ].join(" ")}
          >
            <span
              className={[
                "inline-block h-4 w-4 rounded-full bg-white transition",
                autoRefreshEnabled ? "translate-x-6" : "translate-x-1",
              ].join(" ")}
            />
          </button>
        </div>
      </div>
    </aside>
  );
}
