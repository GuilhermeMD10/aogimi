// Shared validation plumbing, so every domain's schemas can reuse it
// without a cross-domain require.

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
  requiredText,
  optionalText,
  nullableText,
};
