// Shared validation plumbing. Lives here (rather than in validation/auth.js,
// where `parseBody` started) so every domain's schemas can reuse it without
// a cross-domain require.

const { z } = require("zod");

/** Express helper: validate body against schema, send 400 on failure,
 *  return parsed object on success. Returns null when validation
 *  failed and the response has already been written. */
function parseBody(schema, req, res) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ error: result.error.issues.map((i) => i.message).join(", ") });
    return null;
  }
  return result.data;
}

/** Same, for `req.query`. Query values arrive as strings, so query schemas
 *  are built from `z.coerce.*`. */
function parseQuery(schema, req, res) {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    res
      .status(400)
      .json({ error: result.error.issues.map((i) => i.message).join(", ") });
    return null;
  }
  return result.data;
}

/**
 * Coerce a `?limit=` query value into a sane integer.
 *
 * Replaces the `parseInt(req.query.limit, 10) || fallback` idiom, which
 * accepted any magnitude and passed it into `LIMIT $n` — unbounded, on
 * unauthenticated routes. Clamping rather than 400-ing keeps the endpoints
 * backward-compatible: an over-large limit now returns `max` rows instead
 * of the whole table.
 */
function clampLimit(raw, { fallback, max }) {
  const n = typeof raw === "string" || typeof raw === "number" ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

/**
 * A trimmed, non-empty, length-capped required string.
 *
 * `.trim()` runs before the length checks, so trailing whitespace can't
 * be used to smuggle past `max` and a whitespace-only value fails `min(1)`
 * rather than landing in the DB as ''.
 */
function requiredText(label, max) {
  return z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} must not be empty`)
    .max(max, `${label} must be at most ${max} characters`);
}

/** Optional counterpart: absent stays absent, present is trimmed + capped.
 *  Empty string is allowed — the columns default to '' and the clients send
 *  '' to mean "no value". */
function optionalText(label, max) {
  return z
    .string({ error: `${label} must be a string` })
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .optional();
}

/** Optional text that may also be explicitly null — the shape the book
 *  identity payloads use for "this format doesn't have this field". */
function nullableText(label, max) {
  return optionalText(label, max).nullable();
}

module.exports = {
  parseBody,
  parseQuery,
  clampLimit,
  requiredText,
  optionalText,
  nullableText,
};
