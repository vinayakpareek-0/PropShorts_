"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Sidebar from "@/components/sidebar/Sidebar";

interface SidebarShellProps {
  children: React.ReactNode;
  className?: string;
}

export default function SidebarShell({ children, className = "" }: SidebarShellProps) {
  const { loading, session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      const next = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?next=${next}`);
    }
  }, [loading, pathname, router, session]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-5 text-black">
        <div className="text-center">
          <div className="mx-auto h-2 w-24 overflow-hidden rounded-full bg-[#ededed]">
            <div className="h-full w-1/2 animate-ticker rounded-full bg-black" />
          </div>
          <p className="mt-5 text-[13px] font-medium uppercase tracking-[0.24em] text-black/35">
            Checking session
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f7f7] font-[family-name:var(--font-poppins)] text-black">
      <Sidebar />
      <main className={`flex flex-1 flex-col overflow-y-auto pb-24 md:pb-0 ${className}`}>{children}</main>
    </div>
  );
}
