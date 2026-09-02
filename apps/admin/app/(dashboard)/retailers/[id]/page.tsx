"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Retailer } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/DataStates";

type ActionKind = "approve" | "reject" | "suspend" | "reactivate";

export default function RetailerDetailPage() {
  const params = useParams<{ id: string }>();
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionKind | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Retailer>(`/admin/retailers/${params.id}`)
      .then(setRetailer)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load retailer."))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (reason?: string) => {
    if (!action || !retailer) return;
    const endpoints: Record<ActionKind, string> = {
      approve: `/admin/retailers/${retailer.id}/approve`,
      reject: `/admin/retailers/${retailer.id}/reject`,
      suspend: `/admin/retailers/${retailer.id}/suspend`,
      reactivate: `/admin/retailers/${retailer.id}/reactivate`,
    };
    await api.patch(endpoints[action], action === "reject" ? { reason } : undefined);
    load();
  };

  if (loading) return <LoadingBlock label="Loading retailer…" />;
  if (error) return <ErrorBlock message={error} />;
  if (!retailer) return null;

  const dialogCopy: Record<ActionKind, { title: string; confirmLabel: string; variant: "primary" | "danger" | "success"; requireReason: boolean; description: string }> = {
    approve: { title: "Approve retailer", confirmLabel: "Approve", variant: "success", requireReason: false, description: "Grant this retailer marketplace access." },
    reject: { title: "Reject retailer", confirmLabel: "Reject", variant: "danger", requireReason: true, description: "This retailer will be told why their application was rejected." },
    suspend: { title: "Suspend retailer", confirmLabel: "Suspend", variant: "danger", requireReason: false, description: "This retailer will immediately lose marketplace access." },
    reactivate: { title: "Reactivate retailer", confirmLabel: "Reactivate", variant: "success", requireReason: false, description: "This retailer will regain marketplace access." },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/retailers" className="text-sm text-slate-500 hover:text-blue-600">
            ← Back to retailers
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">{retailer.shopName || "Unnamed shop"}</h2>
            <Badge value={retailer.status} />
          </div>
        </div>
        <div className="flex gap-2">
          {retailer.status === "PENDING" && (
            <>
              <Button variant="success" onClick={() => setAction("approve")}>Approve</Button>
              <Button variant="danger" onClick={() => setAction("reject")}>Reject</Button>
            </>
          )}
          {retailer.status === "APPROVED" && (
            <Button variant="danger" onClick={() => setAction("suspend")}>Suspend</Button>
          )}
          {retailer.status === "SUSPENDED" && (
            <Button variant="success" onClick={() => setAction("reactivate")}>Reactivate</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Profile</h3>
          <dl className="space-y-2.5 text-sm">
            <Row label="Owner" value={retailer.ownerName || "—"} />
            <Row label="Mobile" value={retailer.mobileNumber} />
            <Row label="Address" value={retailer.address || "—"} />
            <Row label="City" value={retailer.city || "—"} />
            <Row label="Pincode" value={retailer.pincode || "—"} />
            <Row label="GSTIN" value={retailer.gstin || "—"} />
            <Row label="Joined" value={formatDate(retailer.createdAt)} />
            {retailer.shopPhotoUrl && (
              <div>
                <dt className="text-slate-500">Shop photo</dt>
                <dd className="mt-1 break-all text-blue-600">
                  <a href={retailer.shopPhotoUrl} target="_blank" rel="noreferrer" className="hover:underline">
                    {retailer.shopPhotoUrl}
                  </a>
                </dd>
              </div>
            )}
            {retailer.status === "REJECTED" && retailer.rejectionReason && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-red-700 ring-1 ring-inset ring-red-200">
                <p className="font-medium">Rejection reason</p>
                <p>{retailer.rejectionReason}</p>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Recent orders</h3>
          </div>
          {!retailer.orders || retailer.orders.length === 0 ? (
            <div className="p-5">
              <EmptyBlock message="This retailer has not placed any orders yet." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">Order #</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">Date</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-500">Amount</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">Order status</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {retailer.orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <Link href={`/orders/${o.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{formatDateTime(o.createdAt)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                        {formatCurrency(o.totalAmount)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge value={o.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        {o.payment ? <Badge value={o.payment.status} /> : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {action && (
        <ConfirmDialog
          open={!!action}
          onClose={() => setAction(null)}
          onConfirm={runAction}
          title={dialogCopy[action].title}
          description={dialogCopy[action].description}
          confirmLabel={dialogCopy[action].confirmLabel}
          variant={dialogCopy[action].variant}
          requireReason={dialogCopy[action].requireReason}
          reasonLabel="Rejection reason"
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
