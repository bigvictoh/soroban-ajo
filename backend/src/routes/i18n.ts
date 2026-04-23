import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { getSupportedLanguages, getLanguageInfo, getTranslations, detectLanguage, translateKey } from '../services/i18nService'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: i18n
 *   description: Internationalisation — language list, translations, detection
 */

/**
 * GET /api/i18n/languages
 * Returns all supported languages with RTL flag.
 */
router.get(
  '/languages',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: getSupportedLanguages() })
  })
)

/**
 * GET /api/i18n/detect
 * Detects preferred language from Accept-Language header.
 */
router.get(
  '/detect',
  asyncHandler(async (req: Request, res: Response) => {
    const code = detectLanguage(req.headers['accept-language'])
    const info = getLanguageInfo(code)
    res.json({ success: true, data: { detected: code, info } })
  })
)

/**
 * GET /api/i18n/:locale
 * Returns the full translation messages for a locale.
 */
router.get(
  '/:locale',
  asyncHandler(async (req: Request, res: Response) => {
    const messages = await getTranslations(req.params.locale)
    if (!messages) {
      res.status(404).json({ success: false, error: `Locale '${req.params.locale}' not supported` })
      return
    }
    res.json({ success: true, data: messages })
  })
)

/**
 * GET /api/i18n/:locale/key/:key
 * Translates a single dot-notation key for a locale.
 * e.g. GET /api/i18n/en/key/common.loading
 */
router.get(
  '/:locale/key/*',
  asyncHandler(async (req: Request, res: Response) => {
    const key = (req.params as Record<string, string>)[0]
    const value = await translateKey(req.params.locale, key)
    if (value === null) {
      res.status(404).json({ success: false, error: `Key '${key}' not found in locale '${req.params.locale}'` })
      return
    }
    res.json({ success: true, data: { locale: req.params.locale, key, value } })
  })
)

export const i18nRouter = router
