import { describe, expect, it } from 'vitest'
import {
  aiProviderOptions,
  currencyOptions,
  dateFormatOptions,
  includeCurrentOption,
  localeOptions,
  timezoneOptions,
} from './settingsOptions'

describe('settings option library', () => {
  it('contains the seeded organization choices', () => {
    expect(currencyOptions.some((option) => option.value === 'USD')).toBe(true)
    expect(currencyOptions.some((option) => option.value === 'PHP')).toBe(true)
    expect(timezoneOptions.some((option) => option.value === 'Asia/Manila')).toBe(true)
    expect(localeOptions.some((option) => option.value === 'en')).toBe(true)
    expect(dateFormatOptions.some((option) => option.value === 'Y-m-d')).toBe(true)
    expect(aiProviderOptions).toHaveLength(1)
  })

  it('preserves a legacy value without duplicating known choices', () => {
    expect(includeCurrentOption(localeOptions, 'custom_LOCALE')[0].value).toBe('custom_LOCALE')
    expect(includeCurrentOption(localeOptions, 'en').filter((option) => option.value === 'en')).toHaveLength(
      1,
    )
  })
})
