/** Rounds a step size up to 1, 2 or 5 times a power of ten, so axis ticks land on clean numbers. */
export function niceStep(roughStep: number): number {
  if (roughStep <= 0) {
    return 1;
  }
  const power = 10 ** Math.floor(Math.log10(roughStep));
  const fraction = roughStep / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

/**
 * Evenly spaced ticks from 0 up to the first clean value at or above the
 * maximum, aiming for about `targetCount` intervals.
 */
export function getAxisTicks(maxValue: number, targetCount = 4): number[] {
  if (maxValue <= 0) {
    return [0];
  }
  const step = niceStep(maxValue / targetCount);
  const top = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) {
    ticks.push(value);
  }
  return ticks;
}

/** Axis label for an amount in cents: whole dollars without decimals ("$1,500"), otherwise with cents. */
export function formatAxisMoney(cents: number): string {
  const options: Intl.NumberFormatOptions =
    cents % 100 === 0
      ? { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }
      : { style: 'currency', currency: 'USD' };
  return new Intl.NumberFormat('en-US', options).format(cents / 100);
}

/** "Sep 2" for a YYYY-MM-DD day, in UTC to match how orders are grouped by day. */
export function formatShortDay(day: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

/** A value as a percentage of the maximum, for sizing bars. Zero when there is nothing to compare with. */
export function toPercent(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Math.min(Math.max((value / max) * 100, 0), 100);
}
