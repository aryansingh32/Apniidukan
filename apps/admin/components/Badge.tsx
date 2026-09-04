const styles: Record<string, string> = {
  // retailer / generic
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  REJECTED: "bg-red-50 text-red-700 ring-red-600/20",
  SUSPENDED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  // product
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  OUT_OF_STOCK: "bg-amber-50 text-amber-700 ring-amber-600/20",
  INACTIVE: "bg-slate-100 text-slate-600 ring-slate-500/20",
  // order
  PAYMENT_PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  PAYMENT_VERIFICATION: "bg-sky-50 text-sky-700 ring-sky-600/20",
  CONFIRMED: "bg-blue-50 text-blue-700 ring-blue-600/20",
  PICKING: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  PACKED: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  DISPATCHED: "bg-violet-50 text-violet-700 ring-violet-600/20",
  OUT_FOR_DELIVERY: "bg-violet-50 text-violet-700 ring-violet-600/20",
  DELIVERED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  CANCELLED: "bg-red-50 text-red-700 ring-red-600/20",
  // payment
  UNPAID: "bg-slate-100 text-slate-600 ring-slate-500/20",
  UTR_SUBMITTED: "bg-sky-50 text-sky-700 ring-sky-600/20",
  UNDER_REVIEW: "bg-amber-50 text-amber-700 ring-amber-600/20",
  PAYMENT_APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PAYMENT_REJECTED: "bg-red-50 text-red-700 ring-red-600/20",
  COD_PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  COD_COLLECTED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  // batch status
  NEAR_EXPIRY: "bg-amber-50 text-amber-700 ring-amber-600/20",
  EXPIRED: "bg-red-50 text-red-700 ring-red-600/20",
  BLOCKED: "bg-red-100 text-red-800 ring-red-600/30",
  // expiry bucket
  HEALTHY: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  INFO_180: "bg-sky-50 text-sky-700 ring-sky-600/20",
  WARNING_90: "bg-amber-50 text-amber-700 ring-amber-600/20",
  WARNING_60: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CRITICAL_30: "bg-orange-50 text-orange-700 ring-orange-600/20",
  CRITICAL_7: "bg-red-50 text-red-700 ring-red-600/20",
  // expiry claim status
  SUBMITTED: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export default function Badge({ value }: { value: string }) {
  const cls = styles[value] ?? "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
