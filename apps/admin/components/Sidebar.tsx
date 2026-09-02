"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "grid" },
  { href: "/payments", label: "Payments", icon: "cash" },
  { href: "/orders", label: "Orders", icon: "box" },
  { href: "/retailers", label: "Retailers", icon: "users" },
  { href: "/products", label: "Products", icon: "tag" },
  { href: "/categories", label: "Categories", icon: "folder" },
  { href: "/schemes", label: "Schemes", icon: "gift" },
  { href: "/banners", label: "Banners", icon: "image" },
  { href: "/delivery-slots", label: "Delivery Slots", icon: "clock" },
] as const;

function Icon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    grid: "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z",
    cash: "M3 6h18v12H3V6zm9 3a3 3 0 100 6 3 3 0 000-6zM5 8v.01M19 16v.01",
    box: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
    users: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-4a4 4 0 10-4-4 4 4 0 004 4zm7 0a4 4 0 10-4-4",
    tag: "M20.59 13.41L12 22l-9-9V4h9l9 9.41a2 2 0 010 2.83zM7 8h.01",
    folder: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
    gift: "M20 12v9H4v-9M2 7h20v5H2V7zm10 14V7m0 0a2.5 2.5 0 10-2.5-2.5A2.5 2.5 0 0012 7zm0 0a2.5 2.5 0 102.5-2.5A2.5 2.5 0 0012 7z",
    image: "M4 4h16v16H4V4zm4 8l3 3 5-6 4 8H4l4-5z",
    clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  };
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name] ?? paths.grid} />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          A
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-slate-900">Apniidukan</p>
          <p className="text-xs leading-tight text-slate-500">Business Console</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon name={item.icon} className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
