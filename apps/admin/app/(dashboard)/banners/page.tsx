"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Banner } from "@/lib/types";
import { formatDate, toDateInputValue } from "@/lib/format";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { LoadingRow, EmptyRow, ErrorRow } from "@/components/DataStates";

interface FormState {
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaTarget: string;
  priority: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  title: "",
  subtitle: "",
  imageUrl: "",
  ctaLabel: "",
  ctaTarget: "",
  priority: "0",
  startDate: "",
  endDate: "",
  active: true,
};

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Banner | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Banner[]>("/admin/banners")
      .then((data) => setBanners([...data].sort((a, b) => b.priority - a.priority)))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load banners."))
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

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title,
      subtitle: b.subtitle ?? "",
      imageUrl: b.imageUrl,
      ctaLabel: b.ctaLabel ?? "",
      ctaTarget: b.ctaTarget ?? "",
      priority: String(b.priority),
      startDate: toDateInputValue(b.startDate),
      endDate: toDateInputValue(b.endDate),
      active: b.active,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        imageUrl: form.imageUrl.trim(),
        ctaLabel: form.ctaLabel.trim() || undefined,
        ctaTarget: form.ctaTarget.trim() || undefined,
        priority: Number(form.priority) || 0,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        active: form.active,
      };
      if (editing) {
        await api.patch(`/admin/banners/${editing.id}`, body);
      } else {
        await api.post("/admin/banners", body);
      }
      setFormOpen(false);
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Failed to save banner.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>+ New Banner</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Image</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Title</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">CTA Target</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Priority</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Window</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Active</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <LoadingRow colSpan={7} label="Loading banners…" />}
            {!loading && error && <ErrorRow colSpan={7} message={error} />}
            {!loading && !error && banners.length === 0 && <EmptyRow colSpan={7} message="No banners yet." />}
            {!loading &&
              !error &&
              banners.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.imageUrl} alt="" className="h-9 w-14 rounded-md object-cover ring-1 ring-slate-200" />
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900">{b.title}</p>
                    {b.subtitle && <p className="text-xs text-slate-500">{b.subtitle}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{b.ctaTarget || "—"}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{b.priority}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {b.startDate || b.endDate ? `${formatDate(b.startDate)} – ${formatDate(b.endDate)}` : "Always"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        b.active
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                          : "bg-slate-100 text-slate-600 ring-slate-500/20"
                      }`}
                    >
                      {b.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(b)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(b)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit banner" : "New banner"} wide>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Subtitle</label>
            <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="input" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Image URL <span className="text-red-500">*</span>
            </label>
            <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="input" placeholder="https://…" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">CTA label</label>
            <input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} className="input" placeholder="Shop now" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">CTA target</label>
            <input
              value={form.ctaTarget}
              onChange={(e) => setForm({ ...form, ctaTarget: e.target.value })}
              className="input"
              placeholder="schemes / category:Biscuits"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
            <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="checkbox" />
              Active
            </label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Start date</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">End date</label>
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="input" />
          </div>
          {formError && <p className="col-span-2 text-sm text-red-600">{formError}</p>}
          <div className="col-span-2 flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} loading={saving} disabled={!form.title.trim() || !form.imageUrl.trim()}>
              {editing ? "Save changes" : "Create banner"}
            </Button>
          </div>
        </div>
      </Modal>

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await api.delete(`/admin/banners/${deleteTarget.id}`);
            load();
          }}
          title="Delete banner"
          description={`Delete "${deleteTarget.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
        />
      )}
    </div>
  );
}
