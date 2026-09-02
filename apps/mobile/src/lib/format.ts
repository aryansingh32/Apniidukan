// Accepts string too: the order/payment endpoints serialize Prisma Decimal
// fields as numeric strings (e.g. "4498.2") even though the contract types
// them as numbers and the cart/product endpoints do send real numbers —
// coerce explicitly here rather than leaning on implicit JS arithmetic
// coercion everywhere a total gets rendered.
export function formatCurrency(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  const rounded = Math.round(n * 100) / 100;
  const parts = rounded.toFixed(2).split('.');
  const isNegative = parts[0].startsWith('-');
  let intPart = isNegative ? parts[0].slice(1) : parts[0];
  const decPart = parts[1];
  let lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  if (rest) {
    lastThree = ',' + lastThree;
  }
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const sign = isNegative ? '-' : '';
  const showDecimals = decPart !== '00';
  return `${sign}₹${grouped}${showDecimals ? '.' + decPart : ''}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-IN');
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
