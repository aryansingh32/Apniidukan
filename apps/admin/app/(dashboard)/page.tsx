"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import StatCard from "@/components/StatCard";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/DataStates";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [broadcastResult, setBroadcastResult] = useState<number | null>(null);

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    setBroadcastSending(true);
    setBroadcastError(null);
    try {
      const res = await api.post<{ count: number }>("/admin/notifications/broadcast", {
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
      });
      setBroadcastResult(res.count);
      setBroadcastTitle("");
      setBroadcastBody("");
    } catch (e) {
      setBroadcastError(e instanceof ApiError ? e.message : "Failed to send notification.");
    } finally {
      setBroadcastSending(false);
    }
  };

  const closeBroadcast = () => {
    setBroadcastOpen(false);
    setBroadcastError(null);
    setBroadcastResult(null);
  };

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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
        <Button variant="secondary" onClick={() => setBroadcastOpen(true)}>
          Send notification to retailers
        </Button>
      </div>

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

      <Modal open={broadcastOpen} onClose={closeBroadcast} title="Send notification to retailers">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Sends an in-app notification to every <span className="font-medium">approved</span> retailer — e.g. a new
            scheme, a delivery update, or a general announcement.
          </p>
          {broadcastResult !== null ? (
            <div className="rounded-md bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
              Sent to {broadcastResult} retailer{broadcastResult === 1 ? "" : "s"}.
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <input
                  className="input"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Diwali Bonanza"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Message</label>
                <textarea
                  rows={3}
                  className="input"
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="Extra 10% off this week only…"
                  maxLength={300}
                />
              </div>
              {broadcastError && <p className="text-sm text-red-600">{broadcastError}</p>}
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeBroadcast}>
              {broadcastResult !== null ? "Close" : "Cancel"}
            </Button>
            {broadcastResult === null && (
              <Button onClick={sendBroadcast} loading={broadcastSending} disabled={!broadcastTitle.trim() || !broadcastBody.trim()}>
                Send
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
