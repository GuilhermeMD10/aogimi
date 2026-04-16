/**
 * DeepL translation service.
 *
 * Thin proxy in front of the DeepL v2 API. The only reason this lives on our
 * backend (instead of the client calling DeepL directly) is so the API key
 * never leaves the server. We do *not* cache, rate-limit, or log request text
 * here yet — if/when those become needed, add them in this file so the route
 * handler stays dumb.
 *
 *   Env:
 *     DEEPL_API_KEY   Required. Free keys end with ":fx" and go to the
 *                     api-free.deepl.com endpoint; any other key shape is
 *                     routed to api.deepl.com (Pro).
 *
 *   Public API:
 *     translate({ text, target }) -> { translatedText, detectedLanguage }
 *
 *   Errors are thrown with a `status` property so the route handler can map
 *   them straight onto HTTP codes (matches the convention used by
 *   searchService / wordService):
 *     400  missing/invalid input
 *     500  server mis-configuration (no API key) or unexpected failure
 *     502  DeepL upstream returned a non-2xx response
 */

// DeepL docs: https://developers.deepl.com/docs/api-reference/translate
// We intentionally do NOT pass `source_lang` — DeepL auto-detects and returns
// the detected language, which the client uses to render the "JA → EN" badge.
const DEEPL_PATH = '/v2/translate';

/** DeepL's documented target language codes, upper-cased. */
const ALLOWED_TARGETS = new Set([
  'BG', 'CS', 'DA', 'DE', 'EL', 'EN', 'EN-GB', 'EN-US', 'ES', 'ET', 'FI',
  'FR', 'HU', 'ID', 'IT', 'JA', 'KO', 'LT', 'LV', 'NB', 'NL', 'PL', 'PT',
  'PT-BR', 'PT-PT', 'RO', 'RU', 'SK', 'SL', 'SV', 'TR', 'UK', 'ZH',
]);

const DEFAULT_TARGET = 'EN';
const MAX_TEXT_LEN = 5000; // conservative cap, DeepL's real limit is higher

/** Normalise + validate translate() input. Throws on invalid. */
function validate({ text, target }) {
  if (typeof text !== 'string' || !text.trim()) {
    throw Object.assign(new Error('Missing or invalid "text".'), { status: 400 });
  }
  if (text.length > MAX_TEXT_LEN) {
    throw Object.assign(
      new Error(`"text" exceeds ${MAX_TEXT_LEN} characters.`),
      { status: 400 },
    );
  }

  let resolvedTarget = DEFAULT_TARGET;
  if (target !== undefined && target !== null) {
    if (typeof target !== 'string') {
      throw Object.assign(new Error('Invalid "target".'), { status: 400 });
    }
    const upper = target.trim().toUpperCase();
    if (!ALLOWED_TARGETS.has(upper)) {
      throw Object.assign(
        new Error(`Unsupported target language "${target}".`),
        { status: 400 },
      );
    }
    resolvedTarget = upper;
  }

  return { text, target: resolvedTarget };
}

function resolveBaseUrl(apiKey) {
  return apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com'
    : 'https://api.deepl.com';
}

/**
 * Translate a single string via DeepL.
 *
 * @param {{ text: string, target?: string }} input
 * @returns {Promise<{ translatedText: string, detectedLanguage: string }>}
 */
async function translate(input) {
  const { text, target } = validate(input);

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw Object.assign(
      new Error('DeepL is not configured on this server.'),
      { status: 500, internal: 'DEEPL_API_KEY env var is missing' },
    );
  }

  let upstream;
  try {
    upstream = await fetch(`${resolveBaseUrl(apiKey)}${DEEPL_PATH}`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: [text], target_lang: target }),
    });
  } catch (err) {
    throw Object.assign(
      new Error('Failed to reach the translation service.'),
      { status: 502, cause: err },
    );
  }

  if (!upstream.ok) {
    // Pull the body for logs, but don't forward DeepL's raw response to the
    // client — it can include account / billing details on some errors.
    const detail = await upstream.text().catch(() => '');
    throw Object.assign(
      new Error('Translation service returned an error.'),
      { status: 502, internal: `DeepL ${upstream.status}: ${detail}` },
    );
  }

  const data = await upstream.json();
  const first = Array.isArray(data?.translations) ? data.translations[0] : null;
  if (!first || typeof first.text !== 'string') {
    throw Object.assign(
      new Error('Translation service returned an unexpected payload.'),
      { status: 502 },
    );
  }

  return {
    translatedText: first.text,
    detectedLanguage: first.detected_source_language ?? '',
  };
}

module.exports = { translate };
