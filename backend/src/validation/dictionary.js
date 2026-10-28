// Zod schemas for the public dictionary routes (/api/search, /api/words).
//
// Both read from the URL, not a body, and the URL is the one place Express
// hands a route something other than a string: `?q=a&q=b` is an array,
// `?q[x]=1` is an object. Asserting the type here is what keeps `q.trim()`
// from throwing. The length cap bounds what an unauthenticated request can
// make the search pipeline do.

const { z } = require("zod");
const { TEXT, NUMBERS } = require("../config/limits");
const { requiredText } = require("./_helpers");

const searchQuerySchema = z.object({
  q: requiredText("Query parameter q", TEXT.SEARCH_QUERY),
});

// `:id` is always a string; the checks are shape and range. `words.id` is
// int4, so an id past WORD_ID_MAX would fail in Postgres (22003) instead of
// reading as not-found.
const wordIdSchema = z.object({
  id: z.coerce
    .number({ error: "Invalid id" })
    .int("Invalid id")
    .positive("Invalid id")
    .max(NUMBERS.WORD_ID_MAX, "Invalid id"),
});

module.exports = { searchQuerySchema, wordIdSchema };
