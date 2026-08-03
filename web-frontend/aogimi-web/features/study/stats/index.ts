// Stats sub-feature public surface.
//
// The Activity/Cards tab screen is gone — the star map lives on `/decks` now —
// but the aggregation fetchers live on: the stage's ledger reads activity and
// upgrades, and the decks/home upgrade rows were already importing from here.
export { fetchActivity, fetchCards, fetchRecentUpgrades } from './lib/statsApi';
export type { ActivityStats, ByStateCounts, CardsStats, RecentUpgrade } from './lib/statsApi';
