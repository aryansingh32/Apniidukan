"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export default function Barcode({
  value,
  height = 50,
  width = 1.6,
  fontSize = 12,
  className,
}: {
  value: string;
  height?: number;
  width?: number;
  fontSize?: number;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        height,
        width,
        fontSize,
        margin: 6,
        displayValue: true,
      });
    } catch {
      // invalid value for the symbology — leave the SVG empty rather than crash
    }
  }, [value, height, width, fontSize]);

  if (!value) return null;
  return <svg ref={ref} className={className} />;
}
