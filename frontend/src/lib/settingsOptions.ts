export interface SelectOption {
  value: string
  label: string
}

const fallbackCurrencies = [
  'AUD',
  'CAD',
  'CHF',
  'CNY',
  'EUR',
  'GBP',
  'HKD',
  'INR',
  'JPY',
  'KRW',
  'NZD',
  'PHP',
  'SGD',
  'THB',
  'USD',
]
const fallbackTimezones = [
  'UTC',
  'America/Chicago',
  'America/Los_Angeles',
  'America/New_York',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Manila',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Paris',
]

function supportedValues(key: 'currency' | 'timeZone', fallback: string[]) {
  try {
    return Intl.supportedValuesOf(key)
  } catch {
    return fallback
  }
}

const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' })

export const currencyOptions: SelectOption[] = supportedValues('currency', fallbackCurrencies).map(
  (code) => ({
    value: code,
    label: `${code} — ${currencyNames.of(code) ?? code}`,
  }),
)

export const timezoneOptions: SelectOption[] = Array.from(
  new Set(['UTC', ...supportedValues('timeZone', fallbackTimezones)]),
).map((timezone) => ({ value: timezone, label: timezone.replaceAll('_', ' ') }))

export const localeOptions: SelectOption[] = [
  { value: 'en', label: 'English' },
  { value: 'en_US', label: 'English (United States)' },
  { value: 'en_GB', label: 'English (United Kingdom)' },
  { value: 'fil', label: 'Filipino' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt_BR', label: 'Portuguese (Brazil)' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh_CN', label: 'Chinese (Simplified)' },
  { value: 'zh_TW', label: 'Chinese (Traditional)' },
  { value: 'ar', label: 'Arabic' },
]

export const dateFormatOptions: SelectOption[] = [
  { value: 'Y-m-d', label: '2026-07-28 (YYYY-MM-DD)' },
  { value: 'm/d/Y', label: '07/28/2026 (MM/DD/YYYY)' },
  { value: 'd/m/Y', label: '28/07/2026 (DD/MM/YYYY)' },
  { value: 'd M Y', label: '28 Jul 2026' },
  { value: 'M j, Y', label: 'Jul 28, 2026' },
]

export const emailEncryptionOptions: SelectOption[] = [
  { value: 'tls', label: 'TLS (recommended)' },
  { value: 'ssl', label: 'SSL' },
]

export const aiProviderOptions: SelectOption[] = [
  { value: 'openai-compatible', label: 'OpenAI-compatible API' },
]

export const semanticTypeOptions: SelectOption[] = [
  { value: 'open', label: 'Open' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

export function includeCurrentOption(options: SelectOption[], current: string): SelectOption[] {
  return !current || options.some((option) => option.value === current)
    ? options
    : [{ value: current, label: `${current} (current)` }, ...options]
}
