import React, { useEffect } from "react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar.jsx";

function SidebarBridge() {
  const { toggleSidebar } = useSidebar();
  useEffect(() => {
    window.__toggleSidebar = () => toggleSidebar();
    return () => {
      if (window.__toggleSidebar) delete window.__toggleSidebar;
    };
  }, [toggleSidebar]);
  return null;
}

function SidebarBackdrop() {
  const { openMobile, isMobile, setOpenMobile } = useSidebar();
  if (!isMobile) return null;
  return openMobile ? (
    <div
      aria-hidden
      onClick={() => setOpenMobile(false)}
      className="fixed inset-0 z-30 bg-black/30"
    />
  ) : null;
}

export default function SidebarRoot({ children }) {
  return (
    <SidebarProvider>
      <div className="lg:hidden">
        <AppSidebar />
      </div>
      <SidebarBackdrop />
      {children}
      <SidebarBridge />
    </SidebarProvider>
  );
}
