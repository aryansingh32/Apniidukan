"use client";

import { useRouter, usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { LoadingBlock } from "./DataStates";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <LoadingBlock label="Checking session…" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header pathname={pathname} />
        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
