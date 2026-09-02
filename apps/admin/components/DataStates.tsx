export function LoadingRow({ colSpan = 1, label = "Loading…" }: { colSpan?: number; label?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {label}
        </span>
      </td>
    </tr>
  );
}

export function EmptyRow({ colSpan = 1, message }: { colSpan?: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-500">
        {message}
      </td>
    </tr>
  );
}

export function ErrorRow({ colSpan = 1, message }: { colSpan?: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-red-600">
        {message}
      </td>
    </tr>
  );
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-16 text-sm text-slate-500">
      <svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      {label}
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
      {message}
    </div>
  );
}

export function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
