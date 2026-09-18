"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Users, LogOut, FileText, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
    }
  }, [router]);

  if (!mounted) return null;

  const navigation = [
    { name: "Live Queue", href: "/admin", icon: LayoutDashboard },
    { name: "Farmers", href: "/admin/farmers", icon: Users },
    { name: "Reports", href: "/admin/reports", icon: FileText },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Shield className="w-6 h-6 text-indigo-400 mr-3" />
          <span className="text-lg font-semibold tracking-tight">Procurement Admin</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <a
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 flex-shrink-0 h-5 w-5",
                    isActive ? "text-indigo-200" : "text-slate-400 group-hover:text-slate-300"
                  )}
                />
                {item.name}
              </a>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors group"
          >
            <LogOut className="mr-3 h-5 w-5 text-slate-400 group-hover:text-slate-300" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <h1 className="text-xl font-semibold text-slate-800">
            {navigation.find((n) => n.href === pathname)?.name || "Dashboard"}
          </h1>
          <div className="flex items-center">
            <span className="text-sm font-medium text-slate-600 mr-4">System Administrator</span>
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
              <span className="text-indigo-700 font-bold text-xs">SA</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
