"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { BulkPriceSlab, Product } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import ProductForm from "@/components/ProductForm";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/DataStates";

interface SlabFormState {
  minCases: string;
  maxCases: string;
  pricePerCase: string;
}

const EMPTY_SLAB: SlabFormState = { minCases: "", maxCases: "", pricePerCase: "" };

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [slabForm, setSlabForm] = useState<SlabFormState>(EMPTY_SLAB);
  const [addingSlab, setAddingSlab] = useState(false);
  const [slabError, setSlabError] = useState<string | null>(null);
  const [removeSlabTarget, setRemoveSlabTarget] = useState<BulkPriceSlab | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Product>(`/admin/products/${params.id}`)
      .then(setProduct)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load product."))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const addSlab = async () => {
    if (!product) return;
    setSlabError(null);
    const minCases = Number(slabForm.minCases);
    const maxCases = slabForm.maxCases.trim() ? Number(slabForm.maxCases) : undefined;
    const pricePerCase = Number(slabForm.pricePerCase);
    if (!minCases || minCases < 1) {
      setSlabError("Min cases must be at least 1.");
      return;
    }
    if (maxCases !== undefined && maxCases < minCases) {
      setSlabError("Max cases must be greater than or equal to min cases.");
      return;
    }
    if (!pricePerCase || pricePerCase <= 0) {
      setSlabError("Price per case must be greater than 0.");
      return;
    }
    setAddingSlab(true);
    try {
      await api.post(`/admin/products/${product.id}/slabs`, { minCases, maxCases, pricePerCase });
      setSlabForm(EMPTY_SLAB);
      load();
    } catch (e) {
      setSlabError(e instanceof ApiError ? e.message : "Failed to add slab.");
    } finally {
      setAddingSlab(false);
    }
  };

  if (loading) return <LoadingBlock label="Loading product…" />;
  if (error) return <ErrorBlock message={error} />;
  if (!product) return null;

  const slabs = [...(product.bulkPriceSlabs ?? [])].sort((a, b) => a.minCases - b.minCases);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/products" className="text-sm text-slate-500 hover:text-blue-600">
            ← Back to products
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{product.name}</h2>
        </div>
        {product.status !== "INACTIVE" && (
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Delete product
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-sm font-semibold text-slate-900">Product details</h3>
        <ProductForm
          product={product}
          onSaved={() => load()}
          onCancel={() => router.push("/products")}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Bulk price slabs</h3>
          <p className="text-xs text-slate-500">
            Tiered pricing per case quantity. Buying price/case above is the base rate used below the first slab.
          </p>
        </div>

        {slabs.length === 0 ? (
          <div className="p-6">
            <EmptyBlock message="No bulk price slabs configured for this product yet." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-2.5 text-left font-medium text-slate-500">Min cases</th>
                  <th className="px-6 py-2.5 text-left font-medium text-slate-500">Max cases</th>
                  <th className="px-6 py-2.5 text-right font-medium text-slate-500">Price / case</th>
                  <th className="px-6 py-2.5 text-right font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slabs.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-2.5 font-medium text-slate-900">{s.minCases}</td>
                    <td className="px-6 py-2.5 text-slate-600">{s.maxCases ?? "No limit"}</td>
                    <td className="px-6 py-2.5 text-right text-slate-900">{formatCurrency(s.pricePerCase)}</td>
                    <td className="px-6 py-2.5">
                      <div className="flex justify-end">
                        <Button size="sm" variant="danger" onClick={() => setRemoveSlabTarget(s)}>
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-200 px-6 py-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Add a slab</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Min cases</label>
              <input
                type="number"
                min={1}
                className="input w-28"
                value={slabForm.minCases}
                onChange={(e) => setSlabForm({ ...slabForm, minCases: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Max cases (optional)</label>
              <input
                type="number"
                min={1}
                className="input w-32"
                placeholder="No limit"
                value={slabForm.maxCases}
                onChange={(e) => setSlabForm({ ...slabForm, maxCases: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Price / case (₹)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input w-32"
                value={slabForm.pricePerCase}
                onChange={(e) => setSlabForm({ ...slabForm, pricePerCase: e.target.value })}
              />
            </div>
            <Button onClick={addSlab} loading={addingSlab}>
              Add slab
            </Button>
          </div>
          {slabError && <p className="mt-2 text-sm text-red-600">{slabError}</p>}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await api.delete(`/admin/products/${product.id}`);
          load();
        }}
        title="Delete product"
        description={`This soft-deletes "${product.name}" by setting its status to Inactive — it will disappear from the retailer catalog but its order history is preserved.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {removeSlabTarget && (
        <ConfirmDialog
          open={!!removeSlabTarget}
          onClose={() => setRemoveSlabTarget(null)}
          onConfirm={async () => {
            await api.delete(`/admin/products/slabs/${removeSlabTarget.id}`);
            load();
          }}
          title="Remove price slab"
          description={`Remove the slab for ${removeSlabTarget.minCases}${removeSlabTarget.maxCases ? `–${removeSlabTarget.maxCases}` : "+"} cases?`}
          confirmLabel="Remove"
          variant="danger"
        />
      )}
    </div>
  );
}
