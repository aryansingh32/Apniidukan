"use client";

import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void> | void;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "primary" | "danger" | "success";
  requireReason?: boolean;
  reasonLabel?: string;
}

/**
 * Shared confirm/reason modal used for every irreversible or money-affecting
 * action: retailer reject/suspend, payment approve/reject, product/category
 * delete, etc. When `requireReason` is set the confirm button stays disabled
 * until non-whitespace text is entered.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "primary",
  requireReason = false,
  reasonLabel = "Reason",
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (submitting) return;
    setReason("");
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(requireReason ? reason.trim() : undefined);
      setReason("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={title}>
      <div className="space-y-4">
        {description && <p className="text-sm text-slate-600">{description}</p>}
        {requireReason && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {reasonLabel} <span className="text-red-500">*</span>
            </label>
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Explain why…"
            />
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            loading={submitting}
            disabled={requireReason && !reason.trim()}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
