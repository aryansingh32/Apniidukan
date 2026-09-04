"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Product } from "@/lib/types";
import Button from "@/components/Button";
import Barcode from "@/components/Barcode";
import BarcodeScanner from "@/components/BarcodeScanner";
import { LoadingRow, EmptyRow, ErrorRow } from "@/components/DataStates";

export default function BarcodesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<{ value: string; product: Product | null } | null>(null);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  const missingCount = products.filter((p) => !p.barcode || !p.barcode.trim()).length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id))));
  }

  async function handleGenerateMissing() {
    setGenerating(true);
    try {
      await api.post("/admin/products/generate-barcodes-bulk", {});
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not generate barcodes.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateSelected() {
    if (selected.size === 0) return;
    setGenerating(true);
    try {
      await api.post("/admin/products/generate-barcodes-bulk", { productIds: Array.from(selected) });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not generate barcodes.");
    } finally {
      setGenerating(false);
    }
  }

  function handlePrintSelected() {
    const items = products.filter((p) => selected.has(p.id) && p.barcode);
    if (items.length === 0) return;
    printBarcodeSheet(items);
  }

  function handlePrintAllWithBarcode() {
    const items = filtered.filter((p) => p.barcode);
    printBarcodeSheet(items);
  }

  function handleScanDetected(value: string) {
    const match = products.find((p) => p.barcode === value) ?? null;
    setScanResult({ value, product: match });
  }

  return (
    <div className="space-y-4">
      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleScanDetected} title="Scan to look up product" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Barcodes</h1>
          <p className="text-sm text-slate-500">
            Generate, print and scan product barcodes. {missingCount > 0 ? `${missingCount} product(s) have no barcode yet.` : "All products have a barcode."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setScannerOpen(true)}>
            Scan to look up
          </Button>
          {missingCount > 0 && (
            <Button variant="secondary" onClick={handleGenerateMissing} loading={generating}>
              Generate all missing ({missingCount})
            </Button>
          )}
          <Button variant="secondary" onClick={handlePrintAllWithBarcode}>
            Print all (filtered)
          </Button>
        </div>
      </div>

      {scanResult && (
        <div className="flex items-center justify-between rounded-md bg-blue-50 px-3 py-2.5 text-sm text-blue-800 ring-1 ring-inset ring-blue-200">
          <span>
            Scanned <span className="font-mono">{scanResult.value}</span>:{" "}
            {scanResult.product ? (
              <span className="font-medium">{scanResult.product.name}</span>
            ) : (
              "no matching product found"
            )}
          </span>
          <button className="text-blue-600 hover:underline" onClick={() => setScanResult(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, SKU, barcode…"
          className="w-72 rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {selected.size > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            {selected.size} selected
            <Button size="sm" variant="secondary" onClick={handleGenerateSelected} loading={generating}>
              Generate for selected
            </Button>
            <Button size="sm" onClick={handlePrintSelected}>
              Print selected
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <input type="checkbox" checked={selected.size > 0 && selected.size === filtered.length} onChange={toggleAll} />
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Product</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">SKU</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Barcode</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <LoadingRow colSpan={4} label="Loading products…" />}
            {!loading && error && <ErrorRow colSpan={4} message={error} />}
            {!loading && !error && filtered.length === 0 && <EmptyRow colSpan={4} message="No products found." />}
            {!loading &&
              !error &&
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.sku}</td>
                  <td className="px-4 py-2.5">
                    {p.barcode ? <Barcode value={p.barcode} height={28} fontSize={9} /> : <span className="text-xs text-slate-400">No barcode</span>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function printBarcodeSheet(items: Product[]) {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;
  const labels = items
    .map(
      (p) => `
      <div class="label">
        <svg class="bc" data-value="${p.barcode}"></svg>
        <p class="name">${escapeHtml(p.name)}</p>
      </div>`,
    )
    .join("");

  win.document.write(`
    <html>
      <head>
        <title>Barcode sheet</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
        <style>
          body { font-family: sans-serif; margin: 0; padding: 16px; }
          .sheet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .label { border: 1px dashed #cbd5e1; padding: 10px; text-align: center; page-break-inside: avoid; }
          .name { font-size: 11px; color: #334155; margin: 4px 0 0; }
        </style>
      </head>
      <body>
        <div class="sheet">${labels}</div>
        <script>
          document.querySelectorAll('.bc').forEach((el) => {
            JsBarcode(el, el.getAttribute('data-value'), { format: 'CODE128', height: 40, width: 1.4, fontSize: 10, displayValue: true });
          });
          window.onload = () => { window.print(); };
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
