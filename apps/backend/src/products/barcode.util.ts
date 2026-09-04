/**
 * Generates EAN-13-shaped barcode values for internal use.
 * Prefix "20" falls in the GS1 "restricted circulation / internal use" range
 * (20–29), so these never collide with real retail EAN-13s on the product.
 */
export function computeEan13CheckDigit(twelveDigits: string): number {
  const digits = twelveDigits.split('').map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

export function buildBarcodeValue(sequence: number): string {
  const body = `20${sequence.toString().padStart(10, '0')}`;
  return `${body}${computeEan13CheckDigit(body)}`;
}
