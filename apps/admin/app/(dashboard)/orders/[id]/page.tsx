"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Order, OrderStatus } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/format";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { LoadingBlock, ErrorBlock } from "@/components/DataStates";

const FORWARD_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  CONFIRMED: "PICKING",
  PICKING: "PACKED",
  PACKED: "DISPATCHED",
  DISPATCHED: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};

const CANCELLABLE: OrderStatus[] = ["CONFIRMED", "PICKING", "PACKED", "DISPATCHED", "OUT_FOR_DELIVERY"];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusModal, setStatusModal] = useState<{ status: OrderStatus; label: string } | null>(null);
  const [note, setNote] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [otpToggling, setOtpToggling] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Order>(`/admin/orders/${params.id}`)
      .then(setOrder)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load order."))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const openStatusModal = (status: OrderStatus, label: string) => {
    setNote("");
    setOtpInput("");
    setSubmitError(null);
    setStatusModal({ status, label });
  };

  const needsOtpForModal = statusModal?.status === "DELIVERED" && !!order?.requiresDeliveryOtp;

  const submitStatus = async () => {
    if (!statusModal || !order) return;
    if (needsOtpForModal && otpInput.trim().length === 0) {
      setSubmitError("Enter the delivery OTP the customer read out to confirm delivery.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.patch(`/admin/orders/${order.id}/status`, {
        status: statusModal.status,
        note: note.trim() || undefined,
        otp: needsOtpForModal ? otpInput.trim() : undefined,
      });
      setStatusModal(null);
      load();
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : "Failed to update status.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRequiresOtp = async () => {
    if (!order) return;
    setOtpToggling(true);
    try {
      await api.patch(`/admin/orders/${order.id}/delivery-otp-toggle`, {
        requiresDeliveryOtp: !order.requiresDeliveryOtp,
      });
      load();
    } catch {
      // surfaced via the reloaded order state staying unchanged; the toggle is low-stakes
    } finally {
      setOtpToggling(false);
    }
  };

  if (loading) return <LoadingBlock label="Loading order…" />;
  if (error) return <ErrorBlock message={error} />;
  if (!order) return null;

  const nextStatus = FORWARD_TRANSITIONS[order.status];
  const canCancel = CANCELLABLE.includes(order.status);
  const isPaymentGated = order.status === "PAYMENT_PENDING" || order.status === "PAYMENT_VERIFICATION";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/orders" className="text-sm text-slate-500 hover:text-blue-600">
            ← Back to orders
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">{order.orderNumber}</h2>
            <Badge value={order.status} />
            {order.payment && <Badge value={order.payment.status} />}
          </div>
        </div>
        <div className="flex gap-2">
          {isPaymentGated && (
            <span className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-500">
              Payment status changes happen on the Payments page
            </span>
          )}
          {nextStatus && (
            <Button onClick={() => openStatusModal(nextStatus, nextStatus.replaceAll("_", " "))}>
              Mark as {nextStatus.replaceAll("_", " ")}
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={() => openStatusModal("CANCELLED", "Cancelled")}>
              Cancel order
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-2 text-left font-medium text-slate-500">Product</th>
                    <th className="px-5 py-2 text-right font-medium text-slate-500">Case qty</th>
                    <th className="px-5 py-2 text-right font-medium text-slate-500">Free</th>
                    <th className="px-5 py-2 text-right font-medium text-slate-500">Price/case</th>
                    <th className="px-5 py-2 text-right font-medium text-slate-500">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(order.items ?? []).map((i) => (
                    <tr key={i.id}>
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-slate-900">{i.productNameSnapshot}</p>
                        <p className="text-xs text-slate-500">
                          {i.brandSnapshot} · {i.packSizeSnapshot}
                        </p>
                      </td>
                      <td className="px-5 py-2.5 text-right text-slate-600">{i.caseQty}</td>
                      <td className="px-5 py-2.5 text-right text-slate-600">{i.freeCaseQty || "—"}</td>
                      <td className="px-5 py-2.5 text-right text-slate-600">{formatCurrency(i.pricePerCase)}</td>
                      <td className="px-5 py-2.5 text-right font-medium text-slate-900">{formatCurrency(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-1.5 border-t border-slate-200 px-5 py-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Trade discount</span>
                <span>-{formatCurrency(order.tradeDiscount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Scheme discount</span>
                <span>-{formatCurrency(order.schemeDiscount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST</span>
                <span>{formatCurrency(order.gstAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Status history</h3>
            </div>
            <div className="px-5 py-4">
              {!order.statusHistory || order.statusHistory.length === 0 ? (
                <p className="text-sm text-slate-500">No status history recorded.</p>
              ) : (
                <ol className="space-y-4">
                  {order.statusHistory.map((h, idx) => (
                    <li key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                        {idx < (order.statusHistory?.length ?? 0) - 1 && <div className="w-px flex-1 bg-slate-200" />}
                      </div>
                      <div className="pb-1">
                        <p className="text-sm font-medium text-slate-900">{h.status.replaceAll("_", " ")}</p>
                        {h.note && <p className="text-sm text-slate-500">{h.note}</p>}
                        <p className="text-xs text-slate-400">{formatDateTime(h.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Retailer</h3>
            {order.retailer ? (
              <dl className="space-y-2 text-sm">
                <Row label="Shop" value={order.retailer.shopName || "—"} />
                <Row label="Owner" value={order.retailer.ownerName || "—"} />
                <Row label="Mobile" value={order.retailer.mobileNumber} />
                <Row label="City" value={order.retailer.city || "—"} />
              </dl>
            ) : (
              <p className="text-sm text-slate-500">—</p>
            )}
            {order.retailer && (
              <Link href={`/retailers/${order.retailer.id}`} className="mt-3 inline-block text-sm text-blue-600 hover:underline">
                View retailer profile →
              </Link>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Delivery slot</h3>
            {order.deliverySlot ? (
              <dl className="space-y-2 text-sm">
                <Row label="Slot" value={order.deliverySlot.label} />
                <Row label="Window" value={`${order.deliverySlot.windowStart} – ${order.deliverySlot.windowEnd}`} />
                <Row label="Delivery date" value={formatDateTime(order.deliveryDate)} />
              </dl>
            ) : (
              <p className="text-sm text-slate-500">—</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Delivery OTP</h3>
              {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                <button
                  type="button"
                  onClick={toggleRequiresOtp}
                  disabled={otpToggling}
                  className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {order.requiresDeliveryOtp ? "Required — tap to opt out" : "Opted out — tap to require"}
                </button>
              )}
            </div>
            {order.requiresDeliveryOtp ? (
              order.deliveryOtp ? (
                <dl className="space-y-2 text-sm">
                  <Row label="Code" value={order.deliveryOtp} />
                  <Row label="Verified" value={order.deliveryOtpVerifiedAt ? formatDateTime(order.deliveryOtpVerifiedAt) : "Not yet"} />
                </dl>
              ) : (
                <p className="text-sm text-slate-500">Generated once payment is verified.</p>
              )
            ) : (
              <p className="text-sm text-slate-500">This order is opted out — it can be marked delivered without an OTP.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Payment</h3>
            {order.payment ? (
              <dl className="space-y-2 text-sm">
                <Row label="Status" value={order.payment.status.replaceAll("_", " ")} />
                <Row label="Amount" value={formatCurrency(order.payment.amount)} />
                <Row label="UTR" value={order.payment.utr || "—"} />
                <Row label="Submitted" value={formatDateTime(order.payment.submittedAt)} />
                {order.payment.rejectionReason && (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-red-700 ring-1 ring-inset ring-red-200">
                    {order.payment.rejectionReason}
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-slate-500">—</p>
            )}
            <Link href="/payments" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
              Go to Payments →
            </Link>
          </div>
        </div>
      </div>

      <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title={`Update order status`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Move this order to <span className="font-semibold text-slate-900">{statusModal?.label}</span>.
          </p>
          {needsOtpForModal && (
            <div className="rounded-md bg-amber-50 px-3 py-2.5 ring-1 ring-inset ring-amber-200">
              <label className="mb-1 block text-sm font-medium text-amber-900">Delivery OTP</label>
              <p className="mb-2 text-xs text-amber-700">
                Ask the customer for the OTP shown in their app and enter it here to confirm delivery.
              </p>
              <input
                className="input"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                placeholder="4-digit OTP"
                inputMode="numeric"
                autoFocus
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Note (optional)</label>
            <textarea
              rows={3}
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note visible in the order timeline…"
            />
          </div>
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStatusModal(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant={statusModal?.status === "CANCELLED" ? "danger" : "primary"}
              onClick={submitStatus}
              loading={submitting}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
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
