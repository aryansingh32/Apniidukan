"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Admin } from "@/lib/types";
import { clearAuth, getAdmin } from "@/lib/auth";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/payments": "Payment Verification",
  "/orders": "Orders",
  "/retailers": "Retailers",
  "/products": "Products",
  "/categories": "Categories",
  "/schemes": "Schemes",
  "/banners": "Banners",
  "/delivery-slots": "Delivery Slots",
};

export default function Header({ pathname }: { pathname: string }) {
  const router = useRouter();
  const [admin, setAdminState] = useState<Admin | null>(null);

  useEffect(() => {
    setAdminState(getAdmin());
  }, []);

  const title =
    TITLES[pathname] ??
    Object.entries(TITLES).find(([p]) => p !== "/" && pathname.startsWith(p))?.[1] ??
    "Apniidukan";

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <div className="flex items-center gap-4">
        {admin && (
          <div className="text-right leading-tight">
            <p className="text-sm font-medium text-slate-900">{admin.name}</p>
            <p className="text-xs text-slate-500">{admin.role}</p>
          </div>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
          {admin?.name ? admin.name.charAt(0).toUpperCase() : "?"}
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
