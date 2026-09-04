"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";

const REGION_ID = "admin-barcode-scanner-region";

export default function BarcodeScanner({
  open,
  onClose,
  onDetected,
  title = "Scan Barcode",
}: {
  open: boolean;
  onClose: () => void;
  onDetected: (value: string) => void;
  title?: string;
}) {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (cancelled) return;
      const scanner = new Html5QrcodeScanner(
        REGION_ID,
        { fps: 10, qrbox: { width: 250, height: 120 } },
        false,
      );
      scannerRef.current = scanner;
      scanner.render(
        (decodedText: string) => {
          onDetected(decodedText);
          scanner.clear().catch(() => undefined);
          onClose();
        },
        () => {
          // per-frame decode failure — expected while the camera hunts for a code, ignore
        },
      );
    }).catch(() => setError("Could not start the camera. Check browser camera permissions."));

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.clear().catch(() => undefined);
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <>
          <div id={REGION_ID} />
          <p className="mt-3 text-xs text-slate-500">
            Point the camera at a product barcode. Requires camera permission in this browser.
          </p>
        </>
      )}
    </Modal>
  );
}
