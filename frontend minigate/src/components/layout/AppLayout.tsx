import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuth } from "@/lib/auth-store";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function AppLayout() {
  const user     = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mounted, setMounted]       = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !user) {
      navigate({ to: "/login" });
    }
  }, [mounted, user, navigate]);

  /* Close mobile drawer on navigation */
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Subtle ambient teal glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-64 -left-64 h-[700px] w-[700px] rounded-full opacity-[0.06] blur-[140px]"
          style={{ background: "radial-gradient(circle, #0D9488 0%, transparent 65%)" }}
        />
        <div
          className="absolute -bottom-64 -right-48 h-[600px] w-[600px] rounded-full opacity-[0.04] blur-[130px]"
          style={{ background: "radial-gradient(circle, #06B6D4 0%, transparent 65%)" }}
        />
      </div>

      {/* Desktop sidebar */}
      <div className="relative z-10 hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 border-r border-sidebar-border bg-sidebar lg:hidden">
          <Sidebar mobile />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar onOpenMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
