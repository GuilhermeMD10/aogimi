const { PgSearchIndex } = require('./PgSearchIndex');

/**
 * Default search index instance. Swap this export (or wire it through
 * `SEARCH_BACKEND` env later) to migrate to Meilisearch / Elasticsearch
 * without touching `searchService.js`.
 */
module.exports = { index: new PgSearchIndex() };
