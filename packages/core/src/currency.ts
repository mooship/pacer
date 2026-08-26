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

// ISO 3166-1 alpha-2 region -> the region's principal ISO 4217 currency.
// Used to guess a visitor's currency from their locale; not exhaustive of
// every territory, but covers the countries a browser locale is likely to
// report.
const REGION_CURRENCY: Readonly<Record<string, string>> = {
  // Africa
  DZ: 'DZD',
  AO: 'AOA',
  BJ: 'XOF',
  BW: 'BWP',
  BF: 'XOF',
  BI: 'BIF',
  CV: 'CVE',
  CM: 'XAF',
  CF: 'XAF',
  TD: 'XAF',
  KM: 'KMF',
  CG: 'XAF',
  CD: 'CDF',
  CI: 'XOF',
  DJ: 'DJF',
  EG: 'EGP',
  GQ: 'XAF',
  ER: 'ERN',
  SZ: 'SZL',
  ET: 'ETB',
  GA: 'XAF',
  GM: 'GMD',
  GH: 'GHS',
  GN: 'GNF',
  GW: 'XOF',
  KE: 'KES',
  LS: 'LSL',
  LR: 'LRD',
  LY: 'LYD',
  MG: 'MGA',
  MW: 'MWK',
  ML: 'XOF',
  MR: 'MRU',
  MU: 'MUR',
  MA: 'MAD',
  MZ: 'MZN',
  NA: 'NAD',
  NE: 'XOF',
  NG: 'NGN',
  RW: 'RWF',
  ST: 'STN',
  SN: 'XOF',
  SC: 'SCR',
  SL: 'SLE',
  SO: 'SOS',
  ZA: 'ZAR',
  SS: 'SSP',
  SD: 'SDG',
  TZ: 'TZS',
  TG: 'XOF',
  TN: 'TND',
  UG: 'UGX',
  ZM: 'ZMW',
  ZW: 'ZWG',

  // Americas
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',
  BZ: 'BZD',
  CR: 'CRC',
  SV: 'USD',
  GT: 'GTQ',
  HN: 'HNL',
  NI: 'NIO',
  PA: 'PAB',
  BR: 'BRL',
  AR: 'ARS',
  BO: 'BOB',
  CL: 'CLP',
  CO: 'COP',
  EC: 'USD',
  GY: 'GYD',
  PY: 'PYG',
  PE: 'PEN',
  SR: 'SRD',
  UY: 'UYU',
  VE: 'VES',
  BS: 'BSD',
  BB: 'BBD',
  CU: 'CUP',
  DM: 'XCD',
  DO: 'DOP',
  GD: 'XCD',
  HT: 'HTG',
  JM: 'JMD',
  KN: 'XCD',
  LC: 'XCD',
  VC: 'XCD',
  TT: 'TTD',
  AG: 'XCD',
  PR: 'USD',
  BM: 'BMD',
  KY: 'KYD',
  VG: 'USD',
  VI: 'USD',
  AI: 'XCD',
  MS: 'XCD',
  TC: 'USD',
  AW: 'AWG',
  CW: 'ANG',
  SX: 'ANG',
  BQ: 'USD',
  FK: 'FKP',
  GS: 'GBP',

  // Europe
  AL: 'ALL',
  AD: 'EUR',
  AT: 'EUR',
  BY: 'BYN',
  BE: 'EUR',
  BA: 'BAM',
  BG: 'BGN',
  HR: 'EUR',
  CY: 'EUR',
  CZ: 'CZK',
  DK: 'DKK',
  EE: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  GR: 'EUR',
  HU: 'HUF',
  IS: 'ISK',
  IE: 'EUR',
  IT: 'EUR',
  LV: 'EUR',
  LI: 'CHF',
  LT: 'EUR',
  LU: 'EUR',
  MT: 'EUR',
  MD: 'MDL',
  MC: 'EUR',
  ME: 'EUR',
  NL: 'EUR',
  MK: 'MKD',
  NO: 'NOK',
  PL: 'PLN',
  PT: 'EUR',
  RO: 'RON',
  RU: 'RUB',
  SM: 'EUR',
  RS: 'RSD',
  SK: 'EUR',
  SI: 'EUR',
  ES: 'EUR',
  SE: 'SEK',
  CH: 'CHF',
  UA: 'UAH',
  GB: 'GBP',
  VA: 'EUR',
  AX: 'EUR',
  GG: 'GBP',
  JE: 'GBP',
  IM: 'GBP',
  GI: 'GIP',
  FO: 'DKK',
  GL: 'DKK',
  SH: 'SHP',

  // Asia
  AF: 'AFN',
  AM: 'AMD',
  AZ: 'AZN',
  BH: 'BHD',
  BD: 'BDT',
  BT: 'BTN',
  BN: 'BND',
  KH: 'KHR',
  CN: 'CNY',
  GE: 'GEL',
  IN: 'INR',
  ID: 'IDR',
  IR: 'IRR',
  IQ: 'IQD',
  IL: 'ILS',
  JP: 'JPY',
  JO: 'JOD',
  KZ: 'KZT',
  KW: 'KWD',
  KG: 'KGS',
  LA: 'LAK',
  LB: 'LBP',
  MY: 'MYR',
  MV: 'MVR',
  MN: 'MNT',
  MM: 'MMK',
  NP: 'NPR',
  KP: 'KPW',
  OM: 'OMR',
  PK: 'PKR',
  PS: 'ILS',
  PH: 'PHP',
  QA: 'QAR',
  SA: 'SAR',
  SG: 'SGD',
  KR: 'KRW',
  LK: 'LKR',
  SY: 'SYP',
  TW: 'TWD',
  TJ: 'TJS',
  TH: 'THB',
  TL: 'USD',
  TR: 'TRY',
  TM: 'TMT',
  AE: 'AED',
  UZ: 'UZS',
  VN: 'VND',
  YE: 'YER',
  HK: 'HKD',
  MO: 'MOP',

  // Oceania
  AU: 'AUD',
  FJ: 'FJD',
  KI: 'AUD',
  MH: 'USD',
  FM: 'USD',
  NR: 'AUD',
  NZ: 'NZD',
  PW: 'USD',
  PG: 'PGK',
  WS: 'WST',
  SB: 'SBD',
  TO: 'TOP',
  TV: 'AUD',
  VU: 'VUV',
  NC: 'XPF',
  PF: 'XPF',
  WF: 'XPF',
  AS: 'USD',
  GU: 'USD',
  MP: 'USD',
  CK: 'NZD',
  NU: 'NZD',
  TK: 'NZD',
  PN: 'NZD',
  IO: 'USD',
};

export function currencyForRegion(region: string): string | null {
  return REGION_CURRENCY[region.toUpperCase()] ?? null;
}
