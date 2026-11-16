/** Retail/dealer display helpers. Missing dealer cost stays hidden (it is not zero). */

export function rupiah(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export interface DealerQuote {
  wholesale: number;
  profit: number;
  marginPercent: number;
}

export function dealerQuote(retail: number, wholesale: number | undefined): DealerQuote | null {
  if (typeof wholesale !== 'number' || !Number.isFinite(wholesale)) return null;
  if (!Number.isFinite(retail) || retail < 0) return null;
  const profit = Math.max(0, retail - wholesale);
  const marginPercent = retail > 0 ? Math.round((profit / retail) * 100) : 0;
  return { wholesale, profit, marginPercent };
}
