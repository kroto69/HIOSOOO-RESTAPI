import { useLocation, useMatch } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { listDevices } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/settings": "Settings",
};

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation();
  const oltMatch = useMatch("/olt/:id");
  const { user, clearSession } = useAuthStore();
  const currentOltId = oltMatch?.params?.id || null;
  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: listDevices,
    enabled: !!currentOltId,
    staleTime: 30000,
  });
  const currentOlt = currentOltId
    ? devices.find((device) => device.id === currentOltId)
    : null;
  const title = location.pathname.startsWith("/olt")
    ? "OLT Detail"
    : routeTitles[location.pathname] || "OLT Manager";
  const isOltDetailRoute = location.pathname.startsWith("/olt/");

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-10">
      <div
        className={[
          "mx-auto w-full",
          isOltDetailRoute ? "max-w-[1440px]" : "max-w-7xl",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={onMenuClick}
              className="xl:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
                OLT Management
              </p>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                {title}
              </h1>
              {currentOltId && (
                <p className="mt-1 text-xs font-semibold text-primary">
                  OLT aktif: {currentOlt?.name || currentOltId}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:inline-flex">
                {user.username}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearSession();
                window.location.assign("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
