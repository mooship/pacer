const FORMAT_LOCALE = 'en';

export const CURRENCY_CODES: readonly string[] = Object.freeze(Intl.supportedValuesOf('currency'));

export function isCurrencyCode(code: string): boolean {
  return CURRENCY_CODES.includes(code);
}

const DEFAULT_DIGITS = 2;

function formatterFor(code: string): Intl.NumberFormat | null {
  if (!isCurrencyCode(code)) {
    return null;
  }
  return new Intl.NumberFormat(FORMAT_LOCALE, {
    style: 'currency',
    currency: code,
    currencyDisplay: 'narrowSymbol',
  });
}

export function currencyDigits(code: string): number {
  return formatterFor(code)?.resolvedOptions().maximumFractionDigits ?? DEFAULT_DIGITS;
}

export function currencySymbol(code: string): string {
  const part = formatterFor(code)
    ?.formatToParts(0)
    .find((p) => p.type === 'currency');
  return part ? part.value : code;
}

export function currencyName(code: string): string {
  if (!isCurrencyCode(code)) {
    return code;
  }
  // Every code in CURRENCY_CODES has a display name, so `.of()` is never
  // undefined here; the fallback only satisfies its `string | undefined` type.
  /* v8 ignore next */
  return new Intl.DisplayNames([FORMAT_LOCALE], { type: 'currency' }).of(code) ?? code;
}
