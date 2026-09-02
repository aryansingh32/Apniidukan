export default function StatCard({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: string | number;
  accent?: "slate" | "blue" | "amber" | "red" | "emerald";
}) {
  const accents: Record<string, string> = {
    slate: "text-slate-900",
    blue: "text-blue-600",
    amber: "text-amber-600",
    red: "text-red-600",
    emerald: "text-emerald-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold ${accents[accent]}`}>{value}</p>
    </div>
  );
}
