"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, qs } from "@/lib/api";
import type { Payment, PaymentStatus } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/format";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { LoadingRow, EmptyRow, ErrorRow } from "@/components/DataStates";

const STATUS_TABS: { label: string; value: PaymentStatus | "" }[] = [
  { label: "Under Review", value: "UNDER_REVIEW" },
  { label: "Approved", value: "PAYMENT_APPROVED" },
  { label: "Rejected", value: "PAYMENT_REJECTED" },
  { label: "Unpaid", value: "UNPAID" },
  { label: "All", value: "" },
];

function isLikelyImage(url: string) {
  return /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url) || url.startsWith("data:image");
}

function PaymentsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = (searchParams.get("status") as PaymentStatus | null) ?? "UNDER_REVIEW";
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<{ payment: Payment; kind: "approve" | "reject" } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Payment[]>(`/admin/payments${qs({ status: status || undefined })}`)
      .then(setPayments)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load payments."))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value);
    else params.delete("status");
    router.push(`/payments?${params.toString()}`);
  };

  const runAction = async (reason?: string) => {
    if (!action) return;
    if (action.kind === "approve") {
      await api.post(`/admin/payments/${action.payment.id}/approve`);
    } else {
      await api.post(`/admin/payments/${action.payment.id}/reject`, { reason });
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
        Review the UTR against your bank statement before approving. Approving confirms the order; rejecting lets the
        retailer resubmit a corrected UTR.
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
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Order #</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Retailer</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Amount</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">UTR</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Proof</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Submitted</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Status</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <LoadingRow colSpan={8} label="Loading payments…" />}
            {!loading && error && <ErrorRow colSpan={8} message={error} />}
            {!loading && !error && payments.length === 0 && (
              <EmptyRow colSpan={8} message={status === "UNDER_REVIEW" ? "No payments pending verification." : "No payments found for this filter."} />
            )}
            {!loading &&
              !error &&
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    {p.order ? (
                      <Link href={`/orders/${p.order.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                        {p.order.orderNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {p.order?.retailer?.shopName || p.order?.retailer?.ownerName || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-900">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{p.utr || "—"}</td>
                  <td className="px-4 py-2.5">
                    {p.screenshotUrl ? (
                      isLikelyImage(p.screenshotUrl) ? (
                        <a href={p.screenshotUrl} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.screenshotUrl} alt="Payment proof" className="h-9 w-9 rounded-md object-cover ring-1 ring-slate-200" />
                        </a>
                      ) : (
                        <a
                          href={p.screenshotUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View proof
                        </a>
                      )
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{formatDateTime(p.submittedAt)}</td>
                  <td className="px-4 py-2.5">
                    <Badge value={p.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      {p.status === "UNDER_REVIEW" && (
                        <>
                          <Button size="sm" variant="success" onClick={() => setAction({ payment: p, kind: "approve" })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setAction({ payment: p, kind: "reject" })}>
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
          title={action.kind === "approve" ? "Approve payment" : "Reject payment"}
          description={
            action.kind === "approve"
              ? `Confirm ₹${action.payment.amount} was received for order ${action.payment.order?.orderNumber ?? ""} (UTR: ${action.payment.utr ?? "—"}). This will confirm the order. This action cannot be undone from here.`
              : `Reject the UTR submitted for order ${action.payment.order?.orderNumber ?? ""}. The retailer will be able to resubmit.`
          }
          confirmLabel={action.kind === "approve" ? "Approve payment" : "Reject payment"}
          variant={action.kind === "approve" ? "success" : "danger"}
          requireReason={action.kind === "reject"}
          reasonLabel="Rejection reason"
        />
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense>
      <PaymentsInner />
    </Suspense>
  );
}
