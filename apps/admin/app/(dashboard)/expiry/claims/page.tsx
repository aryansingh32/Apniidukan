"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { ExpiryClaim, ExpiryClaimRejectionReason, ExpiryClaimStatus } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/DataStates";

const STATUS_TABS: { key: ExpiryClaimStatus | "ALL"; label: string }[] = [
  { key: "SUBMITTED", label: "Pending review" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ALL", label: "All" },
];

const REJECTION_REASONS: ExpiryClaimRejectionReason[] = [
  "WRONG_BATCH",
  "NOT_DELIVERED",
  "QUANTITY_EXCEEDED",
  "CLAIM_WINDOW",
  "EVIDENCE",
  "DUPLICATE",
  "POLICY",
  "SUSPICIOUS",
];

export default function ExpiryClaimsPage() {
  const [tab, setTab] = useState<ExpiryClaimStatus | "ALL">("SUBMITTED");
  const [claims, setClaims] = useState<ExpiryClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [approveTarget, setApproveTarget] = useState<ExpiryClaim | null>(null);
  const [approveNote, setApproveNote] = useState("");
  const [rejectTarget, setRejectTarget] = useState<ExpiryClaim | null>(null);
  const [rejectReason, setRejectReason] = useState<ExpiryClaimRejectionReason>("QUANTITY_EXCEEDED");
  const [rejectNote, setRejectNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<ExpiryClaim[]>(`/admin/expiry/claims${tab === "ALL" ? "" : `?status=${tab}`}`)
      .then(setClaims)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load claims."))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const doApprove = async () => {
    if (!approveTarget) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await api.post(`/admin/expiry/claims/${approveTarget.id}/approve`, { note: approveNote.trim() || undefined });
      setApproveTarget(null);
      setApproveNote("");
      load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Failed to approve claim.");
    } finally {
      setSubmitting(false);
    }
  };

  const doReject = async () => {
    if (!rejectTarget) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await api.post(`/admin/expiry/claims/${rejectTarget.id}/reject`, {
        rejectionReasonCode: rejectReason,
        note: rejectNote.trim() || undefined,
      });
      setRejectTarget(null);
      setRejectNote("");
      load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Failed to reject claim.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/expiry" className="text-sm text-slate-500 hover:text-blue-600">
          ← Back to Expiry Center
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">Expiry Claims</h1>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingBlock label="Loading claims…" />
      ) : error ? (
        <ErrorBlock message={error} />
      ) : claims.length === 0 ? (
        <EmptyBlock message="No claims here." />
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <div key={claim.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{claim.claimNumber}</p>
                    <Badge value={claim.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {claim.retailer?.shopName || claim.retailer?.ownerName || "—"} · Submitted{" "}
                    {formatDateTime(claim.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{claim.reason}</p>
                </div>
                {claim.status === "SUBMITTED" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setActionError(null);
                        setRejectTarget(claim);
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setActionError(null);
                        setApproveTarget(claim);
                      }}
                    >
                      Approve
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Batch</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Expiry</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">Requested</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">Claimable at submission</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">Approved</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {claim.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 font-medium text-slate-900">{item.batch?.batchNumber ?? item.batchId}</td>
                        <td className="px-3 py-2 text-slate-600">{item.batch ? formatDate(item.batch.expiryDate) : "—"}</td>
                        <td
                          className={`px-3 py-2 text-right ${
                            item.requestedQty > item.claimableQtyAtSubmission ? "font-semibold text-red-600" : "text-slate-600"
                          }`}
                        >
                          {item.requestedQty}
                          {item.requestedQty > item.claimableQtyAtSubmission && " ⚠"}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">{item.claimableQtyAtSubmission}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{item.approvedQty ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-slate-900">
                          {item.totalCreditAmount != null ? formatCurrency(item.totalCreditAmount) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {claim.decisionNote && (
                <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-700">Decision note: </span>
                  {claim.decisionNote}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title={`Approve ${approveTarget?.claimNumber ?? ""}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Approves the claim for its full requested quantity and credits the retailer&apos;s ledger. This cannot be
            undone.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Note (optional)</label>
            <textarea rows={3} className="input" value={approveNote} onChange={(e) => setApproveNote(e.target.value)} />
          </div>
          {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setApproveTarget(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={doApprove} loading={submitting}>
              Approve
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={`Reject ${rejectTarget?.claimNumber ?? ""}`}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Reason code</label>
            <select className="input" value={rejectReason} onChange={(e) => setRejectReason(e.target.value as ExpiryClaimRejectionReason)}>
              {REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Note (optional)</label>
            <textarea rows={3} className="input" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
          </div>
          {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectTarget(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={doReject} loading={submitting}>
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
