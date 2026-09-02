"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Product, Scheme, SchemeType } from "@/lib/types";
import { formatDate, toDateInputValue } from "@/lib/format";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { LoadingRow, EmptyRow, ErrorRow } from "@/components/DataStates";

interface FormState {
  title: string;
  description: string;
  type: SchemeType;
  minOrderValue: string;
  discountPercent: string;
  flatDiscount: string;
  productId: string;
  buyQty: string;
  freeQty: string;
  startDate: string;
  endDate: string;
  active: boolean;
  imageUrl: string;
  maxUsagePerRetailer: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  type: "ORDER_VALUE_DISCOUNT",
  minOrderValue: "",
  discountPercent: "",
  flatDiscount: "",
  productId: "",
  buyQty: "",
  freeQty: "",
  startDate: toDateInputValue(new Date().toISOString()),
  endDate: "",
  active: true,
  imageUrl: "",
  maxUsagePerRetailer: "",
};

function typeLabel(t: SchemeType) {
  return t === "ORDER_VALUE_DISCOUNT" ? "Order Value Discount" : "Buy X Get Y Free";
}

export default function SchemesPage() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Scheme | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Scheme | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Scheme[]>("/admin/schemes")
      .then(setSchemes)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load schemes."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    api
      .get<Product[]>("/admin/products")
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (s: Scheme) => {
    setEditing(s);
    setForm({
      title: s.title,
      description: s.description ?? "",
      type: s.type,
      minOrderValue: s.minOrderValue !== null ? String(s.minOrderValue) : "",
      discountPercent: s.discountPercent !== null ? String(s.discountPercent) : "",
      flatDiscount: s.flatDiscount !== null ? String(s.flatDiscount) : "",
      productId: s.productId ?? "",
      buyQty: s.buyQty !== null ? String(s.buyQty) : "",
      freeQty: s.freeQty !== null ? String(s.freeQty) : "",
      startDate: toDateInputValue(s.startDate),
      endDate: toDateInputValue(s.endDate),
      active: s.active,
      imageUrl: s.imageUrl ?? "",
      maxUsagePerRetailer: s.maxUsagePerRetailer !== null ? String(s.maxUsagePerRetailer) : "",
    });
    setFormError(null);
    setFormOpen(true);
  };

  const canSubmit =
    form.title.trim() &&
    form.description.trim() &&
    form.startDate &&
    form.endDate &&
    (form.type === "ORDER_VALUE_DISCOUNT"
      ? form.minOrderValue.trim() && (form.discountPercent.trim() || form.flatDiscount.trim())
      : form.productId && form.buyQty.trim() && form.freeQty.trim());

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        active: form.active,
        imageUrl: form.imageUrl.trim() || undefined,
        maxUsagePerRetailer: form.maxUsagePerRetailer.trim() ? Number(form.maxUsagePerRetailer) : undefined,
      };
      if (form.type === "ORDER_VALUE_DISCOUNT") {
        body.minOrderValue = Number(form.minOrderValue);
        body.discountPercent = form.discountPercent.trim() ? Number(form.discountPercent) : undefined;
        body.flatDiscount = form.flatDiscount.trim() ? Number(form.flatDiscount) : undefined;
      } else {
        body.productId = form.productId;
        body.buyQty = Number(form.buyQty);
        body.freeQty = Number(form.freeQty);
      }

      if (editing) {
        await api.patch(`/admin/schemes/${editing.id}`, body);
      } else {
        await api.post("/admin/schemes", body);
      }
      setFormOpen(false);
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Failed to save scheme.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>+ New Scheme</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Title</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Type</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Details</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Window</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Active</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <LoadingRow colSpan={6} label="Loading schemes…" />}
            {!loading && error && <ErrorRow colSpan={6} message={error} />}
            {!loading && !error && schemes.length === 0 && <EmptyRow colSpan={6} message="No schemes yet." />}
            {!loading &&
              !error &&
              schemes.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{s.title}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        s.type === "ORDER_VALUE_DISCOUNT"
                          ? "bg-blue-50 text-blue-700 ring-blue-600/20"
                          : "bg-violet-50 text-violet-700 ring-violet-600/20"
                      }`}
                    >
                      {typeLabel(s.type)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {s.type === "ORDER_VALUE_DISCOUNT"
                      ? `Order ≥ ₹${s.minOrderValue} → ${s.discountPercent ? `${s.discountPercent}% off` : `₹${s.flatDiscount} off`}`
                      : `${s.product?.name ?? "Product"}: Buy ${s.buyQty} Get ${s.freeQty} free`}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {formatDate(s.startDate)} – {formatDate(s.endDate)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        s.active
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                          : "bg-slate-100 text-slate-600 ring-slate-500/20"
                      }`}
                    >
                      {s.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(s)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit scheme" : "New scheme"} wide>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Scheme type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: "ORDER_VALUE_DISCOUNT" })}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                  form.type === "ORDER_VALUE_DISCOUNT"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Order Value Discount
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: "BUY_X_GET_Y_FREE" })}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                  form.type === "BUY_X_GET_Y_FREE"
                    ? "border-violet-500 bg-violet-50 text-violet-700"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Buy X Get Y Free
              </button>
            </div>
          </div>

          {form.type === "ORDER_VALUE_DISCOUNT" ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Min order value (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.minOrderValue}
                  onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
                />
              </div>
              <div />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Discount percent (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input"
                  value={form.discountPercent}
                  onChange={(e) => setForm({ ...form, discountPercent: e.target.value, flatDiscount: "" })}
                  placeholder="or use flat discount →"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Flat discount (₹)</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.flatDiscount}
                  onChange={(e) => setForm({ ...form, flatDiscount: e.target.value, discountPercent: "" })}
                  placeholder="or use percent ←"
                />
              </div>
              <p className="col-span-2 -mt-2 text-xs text-slate-500">Provide either a discount percent or a flat discount amount.</p>
            </>
          ) : (
            <>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Product <span className="text-red-500">*</span>
                </label>
                <select
                  className="select"
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                >
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.brand})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Buy qty (cases) <span className="text-red-500">*</span>
                </label>
                <input type="number" min={1} className="input" value={form.buyQty} onChange={(e) => setForm({ ...form, buyQty: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Free qty (cases) <span className="text-red-500">*</span>
                </label>
                <input type="number" min={1} className="input" value={form.freeQty} onChange={(e) => setForm({ ...form, freeQty: e.target.value })} />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Start date <span className="text-red-500">*</span>
            </label>
            <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              End date <span className="text-red-500">*</span>
            </label>
            <input type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Max usage / retailer</label>
            <input
              type="number"
              min={1}
              className="input"
              value={form.maxUsagePerRetailer}
              onChange={(e) => setForm({ ...form, maxUsagePerRetailer: e.target.value })}
              placeholder="Unlimited"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="checkbox" />
              Active
            </label>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Image URL</label>
            <input className="input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
          </div>

          {formError && <p className="col-span-2 text-sm text-red-600">{formError}</p>}
          <div className="col-span-2 flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} loading={saving} disabled={!canSubmit}>
              {editing ? "Save changes" : "Create scheme"}
            </Button>
          </div>
        </div>
      </Modal>

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await api.delete(`/admin/schemes/${deleteTarget.id}`);
            load();
          }}
          title="Delete scheme"
          description={`Delete "${deleteTarget.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
        />
      )}
    </div>
  );
}
