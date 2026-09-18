"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tractor, LogOut } from "lucide-react";

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
    }
  }, [router]);

  if (!mounted) return null;

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile-friendly Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Tractor className="h-6 w-6 text-green-600 mr-2" />
            <span className="font-bold text-slate-800 text-lg tracking-tight">Kisan Portal</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area - Max width for mobile reading comfort on desktop */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
