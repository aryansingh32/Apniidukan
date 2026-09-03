"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { BatchDetail } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import Badge from "@/components/Badge";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/DataStates";

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<BatchDetail>(`/admin/expiry/batches/${params.id}`)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load batch."))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingBlock label="Loading batch…" />;
  if (error) return <ErrorBlock message={error} />;
  if (!detail) return null;

  const { batch, distributedTotals } = detail;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/expiry" className="text-sm text-slate-500 hover:text-blue-600">
          ← Back to Expiry Center
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-900">
            {batch.product.name} — {batch.batchNumber}
          </h2>
          <Badge value={batch.status} />
          <Badge value={detail.liveBucket} />
        </div>
        <p className="text-sm text-slate-500">
          {batch.product.brand} · Expires {formatDate(batch.expiryDate)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Received (total)" value={batch.receivedQty} />
        <Stat label="In our warehouse" value={batch.warehouseRemainingQty} />
        <Stat label="Distributed to retailers" value={distributedTotals.receivedByRetailers} />
        <Stat label="Retailers holding" value={detail.retailersHolding} />
        <Stat label="Claimed" value={distributedTotals.claimed} accent="text-amber-600" />
        <Stat label="Returned" value={distributedTotals.returned} />
        <Stat label="Written off / damaged" value={distributedTotals.writtenOff + distributedTotals.damaged} />
        <Stat label="Remaining with retailers" value={distributedTotals.remainingWithRetailers} accent="text-emerald-600" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Batch details</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
          <Row label="Manufacturing date" value={formatDate(batch.manufacturingDate)} />
          <Row label="Stock-in date" value={formatDate(batch.stockInDate)} />
          <Row label="Cost price / case" value={batch.costPricePerCase != null ? formatCurrency(batch.costPricePerCase) : "—"} />
          <Row label="Storage requirements" value={batch.storageRequirements || "—"} />
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          &ldquo;Sold&rdquo; is deliberately not shown — this platform doesn&apos;t track a retailer&apos;s own
          point-of-sale activity, see EXPIRY_SYSTEM_DESIGN.md.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Retailers holding this batch</h3>
        </div>
        {detail.holdings.length === 0 ? (
          <div className="p-6">
            <EmptyBlock message="No retailer currently holds stock of this batch." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-2.5 text-left font-medium text-slate-500">Retailer</th>
                  <th className="px-6 py-2.5 text-left font-medium text-slate-500">City</th>
                  <th className="px-6 py-2.5 text-right font-medium text-slate-500">Received</th>
                  <th className="px-6 py-2.5 text-right font-medium text-slate-500">Claimed</th>
                  <th className="px-6 py-2.5 text-right font-medium text-slate-500">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.holdings.map((h) => (
                  <tr key={h.retailerId} className="hover:bg-slate-50">
                    <td className="px-6 py-2.5">
                      <Link href={`/retailers/${h.retailerId}`} className="font-medium text-slate-900 hover:text-blue-600">
                        {h.shopName || h.ownerName || "—"}
                      </Link>
                    </td>
                    <td className="px-6 py-2.5 text-slate-600">{h.city || "—"}</td>
                    <td className="px-6 py-2.5 text-right text-slate-600">{h.receivedQty}</td>
                    <td className="px-6 py-2.5 text-right text-slate-600">{h.claimedQty}</td>
                    <td className="px-6 py-2.5 text-right font-medium text-slate-900">{h.remainingQty}</td>
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

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold ${accent ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
