// Money utilities for AED (fils) conversions and formatting

const FILS_PER_AED = 100;

export function aedToFils(aed: number): number {
  return Math.round(aed * FILS_PER_AED);
}

export function filsToAed(fils: number): number {
  return fils / FILS_PER_AED;
}

export function formatAED(fils: number, decimals: number = 2): string {
  const aed = filsToAed(fils);
  return `AED ${aed.toFixed(decimals)}`;
}

export function formatFilsAsAED(fils: number): string {
  return formatAED(fils, 2);
}

export function parseAEDInput(value: string): number {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    return 0;
  }
  return aedToFils(parsed);
}

export function formatAEDInput(fils: number): string {
  const aed = filsToAed(fils);
  return aed.toString();
}
