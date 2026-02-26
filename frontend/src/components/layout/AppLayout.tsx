import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function AppLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isOltDetailRoute = location.pathname.startsWith("/olt/");

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-surface lg:px-6 lg:py-6">
      <div className="flex min-h-screen lg:min-h-[calc(100vh-3rem)] lg:overflow-hidden lg:cappuccino-frame">
        <Sidebar />
        {mobileMenuOpen && (
          <>
            <Sidebar
              mobile
              open
              onClose={() => setMobileMenuOpen(false)}
            />
            <button
              type="button"
              aria-label="Close mobile menu"
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200 xl:hidden"
            />
          </>
        )}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="flex-1 overflow-x-hidden px-4 pb-10 pt-4 sm:px-6 sm:pt-6 lg:px-10">
            <div
              className={[
                "mx-auto w-full",
                isOltDetailRoute ? "max-w-[1440px]" : "max-w-7xl",
              ].join(" ")}
            >
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
