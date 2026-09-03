"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { ExpiryBucket, ExpiryBucketBatchRow, ExpiryCenterSummary, ExpiryClaimPolicy } from "@/lib/types";
import { formatDate } from "@/lib/format";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/DataStates";

const BUCKET_ORDER: { key: ExpiryBucket; label: string; accent: string }[] = [
  { key: "EXPIRED", label: "Expired", accent: "text-red-600" },
  { key: "CRITICAL_7", label: "Expiring < 7 days", accent: "text-red-600" },
  { key: "CRITICAL_30", label: "Expiring < 30 days", accent: "text-orange-600" },
  { key: "WARNING_60", label: "Expiring < 60 days", accent: "text-amber-600" },
  { key: "WARNING_90", label: "Expiring < 90 days", accent: "text-amber-600" },
  { key: "INFO_180", label: "Expiring < 180 days", accent: "text-sky-600" },
  { key: "HEALTHY", label: "Healthy", accent: "text-emerald-600" },
];

export default function ExpiryCenterPage() {
  const [summary, setSummary] = useState<ExpiryCenterSummary | null>(null);
  const [bucket, setBucket] = useState<ExpiryBucket | null>(null);
  const [batches, setBatches] = useState<ExpiryBucketBatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningCheck, setRunningCheck] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  const [policy, setPolicy] = useState<ExpiryClaimPolicy | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<ExpiryCenterSummary>("/admin/expiry/center"),
      api.get<ExpiryBucketBatchRow[]>(`/admin/expiry/batches${bucket ? `?bucket=${bucket}` : ""}`),
    ])
      .then(([s, b]) => {
        setSummary(s);
        setBatches(b);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load Expiry Center."))
      .finally(() => setLoading(false));
  }, [bucket]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get<ExpiryClaimPolicy>("/admin/expiry/policy")
      .then(setPolicy)
      .catch(() => {});
  }, []);

  const runChecks = async () => {
    setRunningCheck(true);
    setRunResult(null);
    try {
      const res = await api.post<{ batchesUpdated: number; notificationsSent: number }>("/admin/expiry/run-checks");
      setRunResult(`${res.batchesUpdated} batch(es) crossed a threshold, ${res.notificationsSent} notification(s) sent.`);
      load();
    } catch (e) {
      setRunResult(e instanceof ApiError ? e.message : "Failed to run checks.");
    } finally {
      setRunningCheck(false);
    }
  };

  const savePolicy = async () => {
    if (!policy) return;
    setPolicySaving(true);
    setPolicyError(null);
    try {
      const updated = await api.patch<ExpiryClaimPolicy>("/admin/expiry/policy", {
        claimAllowed: policy.claimAllowed,
        minimumExpiryAtDeliveryDays: Number(policy.minimumExpiryAtDeliveryDays),
        claimWindowAfterExpiryDays: Number(policy.claimWindowAfterExpiryDays),
        claimWindowBeforeExpiryDays: Number(policy.claimWindowBeforeExpiryDays),
        minimumRemainingShelfLifeDays: Number(policy.minimumRemainingShelfLifeDays),
        requiresPhoto: policy.requiresPhoto,
        autoApproveLimitAmount: Number(policy.autoApproveLimitAmount),
      });
      setPolicy(updated);
      setPolicyOpen(false);
    } catch (e) {
      setPolicyError(e instanceof ApiError ? e.message : "Failed to save policy.");
    } finally {
      setPolicySaving(false);
    }
  };

  if (loading && !summary) return <LoadingBlock label="Loading Expiry Center…" />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Expiry Center</h1>
          <p className="text-sm text-slate-500">Traceability across every batch — see EXPIRY_SYSTEM_DESIGN.md.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/expiry/claims">
            <Button variant="secondary">Expiry claims →</Button>
          </Link>
          <Button variant="secondary" onClick={() => setPolicyOpen((o) => !o)}>
            {policyOpen ? "Hide policy" : "Claim policy"}
          </Button>
          <Button onClick={runChecks} loading={runningCheck}>
            Run expiry checks now
          </Button>
        </div>
      </div>

      {runResult && (
        <div className="rounded-md bg-blue-50 px-3 py-2.5 text-sm text-blue-800 ring-1 ring-inset ring-blue-200">{runResult}</div>
      )}

      {policyOpen && policy && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Claim policy</h3>
          <p className="mb-4 text-xs text-slate-500">
            Applies platform-wide. <code>minimumRemainingShelfLifeDays</code> also gates checkout itself — a batch
            with less shelf life left than this is skipped by FEFO allocation entirely.
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <PolicyField
              label="Min. expiry at delivery (days)"
              value={policy.minimumExpiryAtDeliveryDays}
              onChange={(v) => setPolicy({ ...policy, minimumExpiryAtDeliveryDays: v })}
            />
            <PolicyField
              label="Min. remaining shelf life (days)"
              value={policy.minimumRemainingShelfLifeDays}
              onChange={(v) => setPolicy({ ...policy, minimumRemainingShelfLifeDays: v })}
            />
            <PolicyField
              label="Claim window before expiry (days)"
              value={policy.claimWindowBeforeExpiryDays}
              onChange={(v) => setPolicy({ ...policy, claimWindowBeforeExpiryDays: v })}
            />
            <PolicyField
              label="Claim window after expiry (days)"
              value={policy.claimWindowAfterExpiryDays}
              onChange={(v) => setPolicy({ ...policy, claimWindowAfterExpiryDays: v })}
            />
            <PolicyField
              label="Auto-approve limit (₹)"
              value={policy.autoApproveLimitAmount}
              onChange={(v) => setPolicy({ ...policy, autoApproveLimitAmount: v })}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Claims allowed</label>
              <select
                className="input"
                value={policy.claimAllowed ? "yes" : "no"}
                onChange={(e) => setPolicy({ ...policy, claimAllowed: e.target.value === "yes" })}
              >
                <option value="yes">Yes</option>
                <option value="no">No — disabled</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Requires photo evidence</label>
              <select
                className="input"
                value={policy.requiresPhoto ? "yes" : "no"}
                onChange={(e) => setPolicy({ ...policy, requiresPhoto: e.target.value === "yes" })}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>
          {policyError && <p className="mt-3 text-sm text-red-600">{policyError}</p>}
          <div className="mt-4 flex justify-end">
            <Button onClick={savePolicy} loading={policySaving}>
              Save policy
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        {BUCKET_ORDER.map((b) => (
          <button
            key={b.key}
            onClick={() => setBucket(bucket === b.key ? null : b.key)}
            className={`rounded-xl border p-4 text-left shadow-sm transition-colors ${
              bucket === b.key ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{b.label}</p>
            <p className={`mt-1.5 text-2xl font-semibold ${b.accent}`}>{summary?.counts[b.key] ?? 0}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">
            {bucket ? BUCKET_ORDER.find((b) => b.key === bucket)?.label : "All batches"}
          </h3>
          {bucket && (
            <Button size="sm" variant="secondary" onClick={() => setBucket(null)}>
              Clear filter
            </Button>
          )}
        </div>
        {batches.length === 0 ? (
          <div className="p-6">
            <EmptyBlock message="No batches in this bucket." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium text-slate-500">Product</th>
                  <th className="px-5 py-2.5 text-left font-medium text-slate-500">Batch</th>
                  <th className="px-5 py-2.5 text-left font-medium text-slate-500">Expiry</th>
                  <th className="px-5 py-2.5 text-left font-medium text-slate-500">Bucket</th>
                  <th className="px-5 py-2.5 text-right font-medium text-slate-500">Warehouse qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5">
                      <Link href={`/expiry/batches/${b.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                        {b.productName}
                      </Link>
                      <p className="text-xs text-slate-500">{b.brand}</p>
                    </td>
                    <td className="px-5 py-2.5 text-slate-600">{b.batchNumber}</td>
                    <td className="px-5 py-2.5 text-slate-600">{formatDate(b.expiryDate)}</td>
                    <td className="px-5 py-2.5">
                      <Badge value={b.bucket} />
                    </td>
                    <td className="px-5 py-2.5 text-right text-slate-900">{b.warehouseRemainingQty}</td>
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

function PolicyField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input type="number" min={0} className="input" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
