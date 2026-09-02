"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { DeliverySlot } from "@/lib/types";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { LoadingRow, EmptyRow, ErrorRow } from "@/components/DataStates";

interface FormState {
  label: string;
  windowStart: string;
  windowEnd: string;
  cutoffTime: string;
  active: boolean;
}

const EMPTY_FORM: FormState = { label: "", windowStart: "09:00", windowEnd: "13:00", cutoffTime: "20:00", active: true };

export default function DeliverySlotsPage() {
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<DeliverySlot | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeliverySlot | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<DeliverySlot[]>("/admin/delivery-slots")
      .then(setSlots)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load delivery slots."))
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

  const openEdit = (s: DeliverySlot) => {
    setEditing(s);
    setForm({ label: s.label, windowStart: s.windowStart, windowEnd: s.windowEnd, cutoffTime: s.cutoffTime, active: s.active });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        label: form.label.trim(),
        windowStart: form.windowStart,
        windowEnd: form.windowEnd,
        cutoffTime: form.cutoffTime,
        active: form.active,
      };
      if (editing) {
        await api.patch(`/admin/delivery-slots/${editing.id}`, body);
      } else {
        await api.post("/admin/delivery-slots", body);
      }
      setFormOpen(false);
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Failed to save delivery slot.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>+ New Slot</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Label</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Window</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Cutoff</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Active</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <LoadingRow colSpan={5} label="Loading delivery slots…" />}
            {!loading && error && <ErrorRow colSpan={5} message={error} />}
            {!loading && !error && slots.length === 0 && <EmptyRow colSpan={5} message="No delivery slots yet." />}
            {!loading &&
              !error &&
              slots.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{s.label}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {s.windowStart} – {s.windowEnd}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{s.cutoffTime}</td>
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
                      {s.active && (
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(s)}>
                          Disable
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit delivery slot" : "New delivery slot"}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Label <span className="text-red-500">*</span>
            </label>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="input" placeholder="Morning (9 AM – 1 PM)" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Window start</label>
              <input type="time" value={form.windowStart} onChange={(e) => setForm({ ...form, windowStart: e.target.value })} className="input" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Window end</label>
              <input type="time" value={form.windowEnd} onChange={(e) => setForm({ ...form, windowEnd: e.target.value })} className="input" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Order cutoff time</label>
            <input type="time" value={form.cutoffTime} onChange={(e) => setForm({ ...form, cutoffTime: e.target.value })} className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="checkbox" />
            Active
          </label>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} loading={saving} disabled={!form.label.trim()}>
              {editing ? "Save changes" : "Create slot"}
            </Button>
          </div>
        </div>
      </Modal>

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await api.delete(`/admin/delivery-slots/${deleteTarget.id}`);
            load();
          }}
          title="Disable delivery slot"
          description={`Disable "${deleteTarget.label}"? Retailers will no longer be able to select it at checkout.`}
          confirmLabel="Disable"
          variant="danger"
        />
      )}
    </div>
  );
}
