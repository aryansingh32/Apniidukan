"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Category } from "@/lib/types";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { LoadingRow, EmptyRow, ErrorRow } from "@/components/DataStates";

interface FormState {
  name: string;
  imageUrl: string;
  sortOrder: string;
}

const EMPTY_FORM: FormState = { name: "", imageUrl: "", sortOrder: "0" };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Category[]>("/admin/categories")
      .then((data) => setCategories([...data].sort((a, b) => a.sortOrder - b.sortOrder)))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load categories."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, imageUrl: c.imageUrl ?? "", sortOrder: String(c.sortOrder) });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        name: form.name.trim(),
        imageUrl: form.imageUrl.trim() || undefined,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing) {
        await api.patch(`/admin/categories/${editing.id}`, body);
      } else {
        await api.post("/admin/categories", body);
      }
      setFormOpen(false);
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>+ New Category</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Image</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Name</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Products</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Sort Order</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <LoadingRow colSpan={5} label="Loading categories…" />}
            {!loading && error && <ErrorRow colSpan={5} message={error} />}
            {!loading && !error && categories.length === 0 && (
              <EmptyRow colSpan={5} message="No categories yet." />
            )}
            {!loading &&
              !error &&
              categories.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.imageUrl} alt="" className="h-9 w-9 rounded-md object-cover ring-1 ring-slate-200" />
                    ) : (
                      <div className="h-9 w-9 rounded-md bg-slate-100" />
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{c.productCount ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{c.sortOrder}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(c)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit category" : "New category"}>
        <div className="space-y-4">
          <Field label="Name" required>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Image URL">
            <input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className="input"
              placeholder="https://…"
            />
          </Field>
          <Field label="Sort order">
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              className="input"
            />
          </Field>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} loading={saving} disabled={!form.name.trim()}>
              {editing ? "Save changes" : "Create category"}
            </Button>
          </div>
        </div>
      </Modal>

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await api.delete(`/admin/categories/${deleteTarget.id}`);
            load();
          }}
          title="Delete category"
          description={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
        />
      )}
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
