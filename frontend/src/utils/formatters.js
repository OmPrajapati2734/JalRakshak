/**
 * formatters.js
 * Pure formatting utilities for JalRakshak AI frontend.
 */

/**
 * Format litres according to specification:
 * Format in litres; format as kL only above 100,000 litres
 */
export function formatWaterSaved(litres) {
  if (litres === undefined || litres === null || isNaN(litres)) {
    return '0 litres';
  }
  const val = Math.round(Number(litres));
  if (val > 100000) {
    const kL = (val / 1000).toLocaleString(undefined, {
      minimumFractionDigits: val % 1000 === 0 ? 0 : 1,
      maximumFractionDigits: 1
    });
    return `${kL} kL`;
  }
  return `${val.toLocaleString()} litres`;
}
