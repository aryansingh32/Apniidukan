"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, qs } from "@/lib/api";
import type { Order, OrderStatus } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/format";
import Badge from "@/components/Badge";
import { LoadingRow, EmptyRow, ErrorRow } from "@/components/DataStates";

const STATUSES: OrderStatus[] = [
  "PAYMENT_PENDING",
  "PAYMENT_VERIFICATION",
  "CONFIRMED",
  "PICKING",
  "PACKED",
  "DISPATCHED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

function OrdersInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = (searchParams.get("status") as OrderStatus | null) ?? "";
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Order[]>(`/admin/orders${qs({ status: status || undefined })}`)
      .then(setOrders)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load orders."))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value);
    else params.delete("status");
    router.push(`/orders?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="select w-64">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Order #</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Retailer</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Amount</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Payment</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Order status</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Placed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <LoadingRow colSpan={6} label="Loading orders…" />}
            {!loading && error && <ErrorRow colSpan={6} message={error} />}
            {!loading && !error && orders.length === 0 && <EmptyRow colSpan={6} message="No orders found for this filter." />}
            {!loading &&
              !error &&
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/orders/${o.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {o.retailer?.shopName || o.retailer?.ownerName || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-900">{formatCurrency(o.totalAmount)}</td>
                  <td className="px-4 py-2.5">{o.payment ? <Badge value={o.payment.status} /> : "—"}</td>
                  <td className="px-4 py-2.5">
                    <Badge value={o.status} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersInner />
    </Suspense>
  );
}
