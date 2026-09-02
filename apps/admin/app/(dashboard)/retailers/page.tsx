"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, qs } from "@/lib/api";
import type { Retailer, RetailerStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { LoadingRow, EmptyRow, ErrorRow } from "@/components/DataStates";

const TABS: { label: string; value: RetailerStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Suspended", value: "SUSPENDED" },
];

type ActionKind = "approve" | "reject" | "suspend" | "reactivate";

function RetailersInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = (searchParams.get("status") as RetailerStatus | null) ?? "";
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ retailer: Retailer; kind: ActionKind } | null>(
    null,
  );

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Retailer[]>(`/admin/retailers${qs({ status: statusParam || undefined, search: search || undefined })}`)
      .then(setRetailers)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load retailers."))
      .finally(() => setLoading(false));
  }, [statusParam, search]);

  useEffect(() => {
    load();
  }, [load]);

  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value);
    else params.delete("status");
    router.push(`/retailers?${params.toString()}`);
  };

  const runAction = async (reason?: string) => {
    if (!actionTarget) return;
    const { retailer, kind } = actionTarget;
    const endpoints: Record<ActionKind, string> = {
      approve: `/admin/retailers/${retailer.id}/approve`,
      reject: `/admin/retailers/${retailer.id}/reject`,
      suspend: `/admin/retailers/${retailer.id}/suspend`,
      reactivate: `/admin/retailers/${retailer.id}/reactivate`,
    };
    await api.patch(endpoints[kind], kind === "reject" ? { reason } : undefined);
    load();
  };

  const dialogCopy: Record<ActionKind, { title: string; confirmLabel: string; variant: "primary" | "danger" | "success"; requireReason: boolean; description: string }> = {
    approve: {
      title: "Approve retailer",
      confirmLabel: "Approve",
      variant: "success",
      requireReason: false,
      description: `Grant "${actionTarget?.retailer.shopName ?? actionTarget?.retailer.ownerName ?? "this retailer"}" marketplace access.`,
    },
    reject: {
      title: "Reject retailer",
      confirmLabel: "Reject",
      variant: "danger",
      requireReason: true,
      description: `This retailer will be told why their application was rejected.`,
    },
    suspend: {
      title: "Suspend retailer",
      confirmLabel: "Suspend",
      variant: "danger",
      requireReason: false,
      description: "This retailer will immediately lose marketplace access.",
    },
    reactivate: {
      title: "Reactivate retailer",
      confirmLabel: "Reactivate",
      variant: "success",
      requireReason: false,
      description: "This retailer will regain marketplace access.",
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.label}
              onClick={() => setTab(t.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusParam === t.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="flex gap-2"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shop, owner, mobile…"
            className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Shop</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Owner</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Mobile</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">City</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Status</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Joined</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <LoadingRow colSpan={7} label="Loading retailers…" />}
            {!loading && error && <ErrorRow colSpan={7} message={error} />}
            {!loading && !error && retailers.length === 0 && (
              <EmptyRow colSpan={7} message="No retailers found for this filter." />
            )}
            {!loading &&
              !error &&
              retailers.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/retailers/${r.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {r.shopName || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{r.ownerName || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.mobileNumber}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.city || "—"}</td>
                  <td className="px-4 py-2.5">
                    <Badge value={r.status} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      {r.status === "PENDING" && (
                        <>
                          <Button size="sm" variant="success" onClick={() => setActionTarget({ retailer: r, kind: "approve" })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setActionTarget({ retailer: r, kind: "reject" })}>
                            Reject
                          </Button>
                        </>
                      )}
                      {r.status === "APPROVED" && (
                        <Button size="sm" variant="danger" onClick={() => setActionTarget({ retailer: r, kind: "suspend" })}>
                          Suspend
                        </Button>
                      )}
                      {r.status === "SUSPENDED" && (
                        <Button size="sm" variant="success" onClick={() => setActionTarget({ retailer: r, kind: "reactivate" })}>
                          Reactivate
                        </Button>
                      )}
                      <Link
                        href={`/retailers/${r.id}`}
                        className="inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {actionTarget && (
        <ConfirmDialog
          open={!!actionTarget}
          onClose={() => setActionTarget(null)}
          onConfirm={runAction}
          title={dialogCopy[actionTarget.kind].title}
          description={dialogCopy[actionTarget.kind].description}
          confirmLabel={dialogCopy[actionTarget.kind].confirmLabel}
          variant={dialogCopy[actionTarget.kind].variant}
          requireReason={dialogCopy[actionTarget.kind].requireReason}
          reasonLabel="Rejection reason"
        />
      )}
    </div>
  );
}

export default function RetailersPage() {
  return (
    <Suspense>
      <RetailersInner />
    </Suspense>
  );
}
