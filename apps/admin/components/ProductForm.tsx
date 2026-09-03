"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Category, Product, ProductStatus } from "@/lib/types";
import Button from "./Button";

export interface ProductFormValues {
  name: string;
  brand: string;
  categoryId: string;
  imageUrl: string;
  packSize: string;
  unitsPerCase: string;
  mrpPerUnit: string;
  buyingPricePerCase: string;
  gstRate: string;
  hsnCode: string;
  sku: string;
  barcode: string;
  status: ProductStatus;
  stockCases: string;
}

function toFormValues(p?: Product | null): ProductFormValues {
  return {
    name: p?.name ?? "",
    brand: p?.brand ?? "",
    categoryId: p?.categoryId ?? "",
    imageUrl: p?.imageUrl ?? "",
    packSize: p?.packSize ?? "",
    unitsPerCase: p ? String(p.unitsPerCase) : "",
    mrpPerUnit: p ? String(p.mrpPerUnit) : "",
    buyingPricePerCase: p ? String(p.buyingPricePerCase) : "",
    gstRate: p ? String(p.gstRate) : "18",
    hsnCode: p?.hsnCode ?? "",
    sku: p?.sku ?? "",
    barcode: p?.barcode ?? "",
    status: p?.status ?? "ACTIVE",
    stockCases: p ? String(p.stockCases) : "0",
  };
}

export default function ProductForm({
  product,
  onSaved,
  onCancel,
}: {
  product?: Product | null;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductFormValues>(toFormValues(product));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Category[]>("/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setForm(toFormValues(product));
  }, [product]);

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const numbersValid =
    Number(form.unitsPerCase) > 0 &&
    Number(form.mrpPerUnit) >= 0 &&
    Number(form.buyingPricePerCase) >= 0 &&
    Number(form.gstRate) >= 0 &&
    Number(form.stockCases) >= 0;

  const canSubmit =
    form.name.trim() &&
    form.brand.trim() &&
    form.categoryId &&
    form.packSize.trim() &&
    form.hsnCode.trim() &&
    form.sku.trim() &&
    form.barcode.trim() &&
    numbersValid;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        categoryId: form.categoryId,
        imageUrl: form.imageUrl.trim() || undefined,
        packSize: form.packSize.trim(),
        unitsPerCase: Number(form.unitsPerCase),
        mrpPerUnit: Number(form.mrpPerUnit),
        buyingPricePerCase: Number(form.buyingPricePerCase),
        gstRate: Number(form.gstRate),
        hsnCode: form.hsnCode.trim(),
        sku: form.sku.trim(),
        barcode: form.barcode.trim(),
        status: form.status,
        stockCases: Number(form.stockCases),
      };
      if (product) {
        await api.patch<Product>(`/admin/products/${product.id}`, body);
        onSaved(product.id);
      } else {
        const created = await api.post<Product>("/admin/products", body);
        onSaved(created.id);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Product name" required>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Brand" required>
          <input className="input" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
        </Field>
        <Field label="Category" required>
          <select className="select" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Pack size" required>
          <input className="input" placeholder="100g" value={form.packSize} onChange={(e) => set("packSize", e.target.value)} />
        </Field>
        <Field label="Image URL">
          <input className="input" placeholder="https://…" value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
        </Field>
        <Field label="Status">
          <select className="select" value={form.status} onChange={(e) => set("status", e.target.value as ProductStatus)}>
            <option value="ACTIVE">Active</option>
            <option value="OUT_OF_STOCK">Out of stock</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </Field>
      </div>

      <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
        No expiry date here — expiry is set per <span className="font-medium">batch</span>, from this product&apos;s
        page{product ? " below (Batches / lots)" : " once you save it"}, since one product can have several batches
        expiring on different dates.
      </p>

      <div className="border-t border-slate-200 pt-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Pricing &amp; tax</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Units per case" required>
            <input type="number" min={1} className="input" value={form.unitsPerCase} onChange={(e) => set("unitsPerCase", e.target.value)} />
          </Field>
          <Field label="MRP per unit (₹)" required>
            <input type="number" min={0} step="0.01" className="input" value={form.mrpPerUnit} onChange={(e) => set("mrpPerUnit", e.target.value)} />
          </Field>
          <Field label="Buying price/case (₹)" required>
            <input type="number" min={0} step="0.01" className="input" value={form.buyingPricePerCase} onChange={(e) => set("buyingPricePerCase", e.target.value)} />
          </Field>
          <Field label="GST rate (%)" required>
            <input type="number" min={0} step="0.01" className="input" value={form.gstRate} onChange={(e) => set("gstRate", e.target.value)} />
          </Field>
          <Field label="HSN code" required>
            <input className="input" value={form.hsnCode} onChange={(e) => set("hsnCode", e.target.value)} />
          </Field>
          <Field label="Stock (cases)" required>
            <input type="number" min={0} className="input" value={form.stockCases} onChange={(e) => set("stockCases", e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Identifiers</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="SKU" required>
            <input className="input" value={form.sku} onChange={(e) => set("sku", e.target.value)} />
          </Field>
          <Field label="Barcode" required>
            <input className="input" value={form.barcode} onChange={(e) => set("barcode", e.target.value)} />
          </Field>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={submit} loading={saving} disabled={!canSubmit}>
          {product ? "Save changes" : "Create product"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
