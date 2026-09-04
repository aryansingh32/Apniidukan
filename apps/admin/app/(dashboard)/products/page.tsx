"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import BarcodeScanner from "@/components/BarcodeScanner";
import { LoadingRow, EmptyRow, ErrorRow } from "@/components/DataStates";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Product[]>("/admin/products")
      .then(setProducts)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load products."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode ?? "").toLowerCase().includes(q) ||
      (p.categoryName ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={(v) => setSearch(v)} title="Scan to find product" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, brand, SKU, barcode…"
            className="w-72 rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Button variant="secondary" onClick={() => setScannerOpen(true)}>
            Scan
          </Button>
        </div>
        <Link href="/products/new">
          <Button>+ New Product</Button>
        </Link>
      </div>

      <div className="rounded-md bg-blue-50 px-3 py-2.5 text-sm text-blue-800 ring-1 ring-inset ring-blue-200">
        Expiry dates aren&apos;t set here — they&apos;re set per <span className="font-medium">batch</span> (a
        product can have several batches with different expiry dates at once). Open a product, then use its{" "}
        <span className="font-medium">Batches / lots</span> section to stock one in. See the{" "}
        <Link href="/expiry" className="font-medium underline">
          Expiry Center
        </Link>{" "}
        for the bucketed overview across every batch.
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Product</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Category</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Brand</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">MRP/unit</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Buying/case</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Margin</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Stock (cases)</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Status</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <LoadingRow colSpan={9} label="Loading products…" />}
            {!loading && error && <ErrorRow colSpan={9} message={error} />}
            {!loading && !error && filtered.length === 0 && (
              <EmptyRow colSpan={9} message="No products found." />
            )}
            {!loading &&
              !error &&
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/products/${p.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {p.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {p.packSize} · SKU {p.sku}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{p.categoryName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.brand}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(p.mrpPerUnit)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(p.buyingPricePerCase)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {p.marginPercent !== undefined ? `${p.marginPercent.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-900">{p.stockCases}</td>
                  <td className="px-4 py-2.5">
                    <Badge value={p.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end">
                      <Link
                        href={`/products/${p.id}`}
                        className="inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
