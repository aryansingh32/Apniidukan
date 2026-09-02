"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import StatCard from "@/components/StatCard";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/DataStates";
import Badge from "@/components/Badge";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<DashboardStats>("/admin/dashboard")
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingBlock label="Loading dashboard…" />;
  if (error) return <ErrorBlock message={error} />;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total Orders" value={stats.totalOrders} />
        <StatCard label="Today's Orders" value={stats.todaysOrders} accent="blue" />
        <StatCard label="Pending Payments" value={stats.pendingPayments} accent="amber" />
        <StatCard label="Pending Approvals" value={stats.pendingApprovals} accent="amber" />
        <StatCard label="Revenue" value={formatCurrency(stats.revenue)} accent="emerald" />
        <StatCard label="Pending Dispatches" value={stats.pendingDispatches} accent="blue" />
        <StatCard label="Total Retailers" value={stats.totalRetailers} />
      </div>

      <div className="flex flex-wrap gap-3">
        {stats.pendingPayments > 0 && (
          <Link
            href="/payments"
            className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 ring-1 ring-inset ring-amber-200 hover:bg-amber-100"
          >
            {stats.pendingPayments} payment{stats.pendingPayments === 1 ? "" : "s"} awaiting verification →
          </Link>
        )}
        {stats.pendingApprovals > 0 && (
          <Link
            href="/retailers?status=PENDING"
            className="rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 ring-1 ring-inset ring-blue-200 hover:bg-blue-100"
          >
            {stats.pendingApprovals} retailer{stats.pendingApprovals === 1 ? "" : "s"} awaiting approval →
          </Link>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Low Stock Products</h2>
          <p className="text-xs text-slate-500">Products running low on case inventory</p>
        </div>
        {stats.lowStockProducts.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyBlock message="No low-stock products right now." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium text-slate-500">Product</th>
                  <th className="px-5 py-2.5 text-left font-medium text-slate-500">Brand</th>
                  <th className="px-5 py-2.5 text-left font-medium text-slate-500">Status</th>
                  <th className="px-5 py-2.5 text-right font-medium text-slate-500">Stock (cases)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.lowStockProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5">
                      <Link href={`/products/${p.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-slate-600">{p.brand}</td>
                    <td className="px-5 py-2.5">
                      <Badge value={p.status} />
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-amber-700">{p.stockCases}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
