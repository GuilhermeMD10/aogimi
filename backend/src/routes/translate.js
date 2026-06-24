const { Router } = require('express');
const translateService = require('../services/translateService');

const router = Router();

/**
 * POST /api/translate
 *
 * Proxies a DeepL translation so the API key stays server-side.
 *
 *   Body:
 *     {
 *       "text":   string,          // required, ≤ 5000 chars, non-empty after trim
 *       "target": string?          // optional DeepL target code (default "EN")
 *     }
 *
 *   Response 200:
 *     {
 *       "translatedText":   string,
 *       "detectedLanguage": string  // DeepL-detected source, e.g. "JA"
 *     }
 *
 *   Errors:
 *     400 — malformed body / unsupported target language
 *     500 — server mis-configuration (missing DEEPL_API_KEY)
 *     502 — DeepL upstream unreachable or returned an error
 */
router.post('/', async (req, res) => {
  // Translation is disabled for now. Remove this guard to re-enable;
  // the original DeepL proxy logic below is left intact.
  return res.status(403).json({ error: 'Translation is currently disabled.' });

  // eslint-disable-next-line no-unreachable
  try {
    const { text, target } = req.body ?? {};
    const result = await translateService.translate({ text, target });
    res.json(result);
  } catch (err) {
    const status = err.status ?? 500;
    if (status >= 500) {
      // Internal detail (set by the service when safe to log) wins over the
      // generic message so the dev console shows the real upstream error.
      console.error(`[translate] →`, err.internal ?? err);
    }
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
