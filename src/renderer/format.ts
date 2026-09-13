export function formatCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function formatPercent(n: number): string {
  return (n * 100).toFixed(1) + '%';
}
