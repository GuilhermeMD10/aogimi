// Study session selection. Given a scope (decks) and a mode, return
// the ordered card list the client should show. The algorithm
// primitives live in cardSrsService; this file owns the *selection*
// policy — which cards, in what order.
//
// All ordering happens in JS, not SQL. Typical decks have at most a
// few hundred cards; in-memory sort + filter is plenty. Move to
// DB-side ordering only when a deck pushes past ~5k cards.

const cardRepo = require("../repositories/cardRepository");
const deckRepo = require("../repositories/deckRepository");
const srs = require("./cardSrsService");

const VALID_MODES = Object.freeze([
  'hardest',           // default: hardestSortKey desc
  'random',            // uniform shuffle
  'oldest_first',      // by last_reviewed_at ASC, never-reviewed first
  'oldest_only',       // last_reviewed_at older than 7d (or never)
  'newest_only',       // state = 'new' only
  'by_creation',       // by created_at ASC
  'hardest_all_decks', // hardest across every deck owned by the user
]);

const DEFAULT_SESSION_SIZE = 20;
const OLDEST_ONLY_CUTOFF_DAYS = 7;
const MS_PER_DAY = 86_400_000;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function compareLastReviewedAsc(a, b) {
  // nulls first — never-reviewed cards are "oldest"
  if (!a.last_reviewed_at && !b.last_reviewed_at) return 0;
  if (!a.last_reviewed_at) return -1;
  if (!b.last_reviewed_at) return 1;
  return new Date(a.last_reviewed_at) - new Date(b.last_reviewed_at);
}

function compareCreatedAsc(a, b) {
  return new Date(a.created_at) - new Date(b.created_at);
}

function orderByHardest(cards) {
  // Precompute the sort key (it uses Math.random for jitter, so calling
  // twice during the sort comparator would be unstable).
  const now = new Date();
  return cards
    .map((card) => ({ card, key: srs.hardestSortKey(card, now) }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.card);
}

function orderByMode(cards, mode) {
  switch (mode) {
    case 'hardest':
    case 'hardest_all_decks':
      return orderByHardest(cards);

    case 'random':
      return shuffle(cards);

    case 'oldest_first':
      return cards.slice().sort(compareLastReviewedAsc);

    case 'oldest_only': {
      const cutoff = Date.now() - OLDEST_ONLY_CUTOFF_DAYS * MS_PER_DAY;
      const filtered = cards.filter((c) =>
        !c.last_reviewed_at || new Date(c.last_reviewed_at).getTime() < cutoff
      );
      return shuffle(filtered);
    }

    case 'newest_only':
      return shuffle(cards.filter((c) => c.state === 'new'));

    case 'by_creation':
      return cards.slice().sort(compareCreatedAsc);

    default:
      return orderByHardest(cards);
  }
}

/**
 * Resolve a session: fetch eligible cards for the user, apply the
 * selected mode, and slice to the requested limit. Deck IDs not owned
 * by the user are silently dropped (no leak about which IDs exist).
 *
 * `dueOnly` narrows the candidate pool to cards that are due right now
 * (never reviewed, or past `next_due_at`) before the mode orders them. It's
 * a pool filter, not a mode: `dueOnly: true` with `scope: 'all'` is the
 * "study every due card across all decks" session. Combining it with a mode
 * that filters further (`oldest_only`, `newest_only`) intersects both
 * filters and can legitimately return fewer cards than `limit`.
 */
async function fetchSessionCards(userId, { scope, deckIds, mode, limit, dueOnly }) {
  if (!VALID_MODES.includes(mode)) {
    throw new Error(`Unknown mode: ${mode}`);
  }

  const userDecks = await deckRepo.findByUser(userId);
  const ownedIds = new Set(userDecks.map((d) => d.id));

  let effectiveDeckIds;
  if (scope === 'all' || mode === 'hardest_all_decks') {
    effectiveDeckIds = [...ownedIds];
  } else {
    effectiveDeckIds = (deckIds || []).filter((id) => ownedIds.has(id));
  }

  if (effectiveDeckIds.length === 0) return [];

  const cards = dueOnly
    ? await cardRepo.findDueByDeckIds(effectiveDeckIds)
    : await cardRepo.findByDeckIds(effectiveDeckIds);
  const ordered = orderByMode(cards, mode);

  const cap = Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_SESSION_SIZE;
  return ordered.slice(0, cap);
}

/**
 * How many cards are due, in total and per deck, across everything the user
 * owns. One round trip — the alternative is fetching the whole due inventory
 * just to measure it, which is what the home screen would otherwise do to
 * render a count and three deck chips.
 *
 * Decks with nothing due are omitted from `byDeck`; read a missing key as 0.
 */
async function fetchDueCounts(userId) {
  const userDecks = await deckRepo.findByUser(userId);
  const ownedIds = userDecks.map((d) => d.id);
  if (ownedIds.length === 0) return { total: 0, byDeck: {} };

  const rows = await cardRepo.countDueByDeckIds(ownedIds);
  const byDeck = {};
  let total = 0;
  for (const row of rows) {
    byDeck[row.deck_id] = row.count;
    total += row.count;
  }
  return { total, byDeck };
}

module.exports = {
  VALID_MODES,
  DEFAULT_SESSION_SIZE,
  fetchSessionCards,
  fetchDueCounts,
};
