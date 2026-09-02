export function formatCurrency(value: number | null | undefined): string {
  const n = value ?? 0;
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
