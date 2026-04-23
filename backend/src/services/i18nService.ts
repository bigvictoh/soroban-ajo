import { logger } from '../utils/logger'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code']

// In-memory translation cache (keyed by locale code)
const translationCache = new Map<string, Record<string, unknown>>()

export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES
}

export function getLanguageInfo(code: string) {
  return SUPPORTED_LANGUAGES.find(l => l.code === code) ?? null
}

/**
 * Loads translations for a locale. Reads from the frontend locales directory
 * so there is a single source of truth.
 */
export async function getTranslations(locale: string): Promise<Record<string, unknown> | null> {
  if (!SUPPORTED_LANGUAGES.find(l => l.code === locale)) return null

  if (translationCache.has(locale)) return translationCache.get(locale)!

  try {
    // Dynamic require so the path is resolved at runtime
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const messages = require(`../../../frontend/src/locales/${locale}.json`) as Record<string, unknown>
    translationCache.set(locale, messages)
    return messages
  } catch (err) {
    logger.warn('Translation file not found', { locale, error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

/**
 * Detects the preferred language from an Accept-Language header string.
 * Falls back to 'en' if no supported language is found.
 */
export function detectLanguage(acceptLanguageHeader: string | undefined): string {
  if (!acceptLanguageHeader) return 'en'

  const supported = new Set<string>(SUPPORTED_LANGUAGES.map(l => l.code))

  // Parse "en-US,en;q=0.9,es;q=0.8" → [['en', 1], ['es', 0.8], ...]
  const preferences = acceptLanguageHeader
    .split(',')
    .map(part => {
      const [tag, q] = part.trim().split(';q=')
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)

  for (const { tag } of preferences) {
    if (supported.has(tag)) return tag
    const base = tag.split('-')[0]
    if (supported.has(base)) return base
  }

  return 'en'
}

/**
 * Translates a dot-notation key within a locale's messages.
 * e.g. translateKey('en', 'common.loading') → 'Loading...'
 */
export async function translateKey(locale: string, key: string): Promise<string | null> {
  const messages = await getTranslations(locale)
  if (!messages) return null

  const value = key.split('.').reduce<unknown>((obj, k) => {
    if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[k]
    return undefined
  }, messages)

  return typeof value === 'string' ? value : null
}

/** Clears the in-memory translation cache (useful after locale file updates). */
export function clearTranslationCache(locale?: string) {
  if (locale) translationCache.delete(locale)
  else translationCache.clear()
}
