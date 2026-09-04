"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, qs } from "@/lib/api";
import type { ReturnRequest, ReturnStatus } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/format";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { LoadingRow, EmptyRow, ErrorRow } from "@/components/DataStates";

const STATUS_TABS: { label: string; value: ReturnStatus | "" }[] = [
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: "" },
];

function ReturnsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = (searchParams.get("status") as ReturnStatus | null) ?? "SUBMITTED";
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<{ item: ReturnRequest; kind: "approve" | "reject" } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<ReturnRequest[]>(`/admin/returns${qs({ status: status || undefined })}`)
      .then(setReturns)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load returns."))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value);
    else params.delete("status");
    router.push(`/returns?${params.toString()}`);
  };

  const runAction = async (reason?: string) => {
    if (!action) return;
    if (action.kind === "approve") {
      await api.post(`/admin/returns/${action.item.id}/approve`);
    } else {
      await api.post(`/admin/returns/${action.item.id}/reject`, { reason });
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Returns & Damaged Goods</h1>
        <p className="text-sm text-slate-500">
          Approving a return instantly issues a credit note to the retailer for the returned line&apos;s value.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => setTab(t.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              status === t.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Return #</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Order</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Retailer</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Item</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Qty</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Reason</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Photo</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Status</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <LoadingRow colSpan={9} label="Loading returns…" />}
            {!loading && error && <ErrorRow colSpan={9} message={error} />}
            {!loading && !error && returns.length === 0 && (
              <EmptyRow colSpan={9} message={status === "SUBMITTED" ? "No returns awaiting review." : "No returns found for this filter."} />
            )}
            {!loading &&
              !error &&
              returns.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{r.returnNumber}</td>
                  <td className="px-4 py-2.5">
                    {r.order ? (
                      <Link href={`/orders/${r.order.id}`} className="text-blue-600 hover:underline">
                        {r.order.orderNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{r.retailer?.shopName || r.retailer?.ownerName || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.orderItem?.productNameSnapshot ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{r.qty}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {r.reason.replaceAll("_", " ")}
                    {r.note && <p className="text-xs text-slate-400">{r.note}</p>}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.photoUrl ? (
                      <a href={r.photoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                        View
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge value={r.status} />
                    {r.creditNote && (
                      <p className="mt-1 text-xs text-emerald-700">
                        {r.creditNote.creditNoteNumber} · {formatCurrency(r.creditNote.amount)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      {r.status === "SUBMITTED" && (
                        <>
                          <Button size="sm" variant="success" onClick={() => setAction({ item: r, kind: "approve" })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setAction({ item: r, kind: "reject" })}>
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {action && (
        <ConfirmDialog
          open={!!action}
          onClose={() => setAction(null)}
          onConfirm={runAction}
          title={action.kind === "approve" ? "Approve return" : "Reject return"}
          description={
            action.kind === "approve"
              ? `Approve return ${action.item.returnNumber} for ${action.item.qty} case(s) of ${action.item.orderItem?.productNameSnapshot ?? "this item"}. A credit note is issued instantly. This cannot be undone from here.`
              : `Reject return ${action.item.returnNumber}. The retailer will be notified with your reason.`
          }
          confirmLabel={action.kind === "approve" ? "Approve & issue credit note" : "Reject return"}
          variant={action.kind === "approve" ? "success" : "danger"}
          requireReason={action.kind === "reject"}
          reasonLabel="Rejection reason"
        />
      )}
    </div>
  );
}

export default function ReturnsPage() {
  return (
    <Suspense>
      <ReturnsInner />
    </Suspense>
  );
}
