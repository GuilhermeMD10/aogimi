const statsRepo = require("../repositories/statsRepository");

async function getActivity(userId) {
  const [perDay, daysStudied] = await Promise.all([
    statsRepo.perDayReviewCounts(userId),
    statsRepo.daysStudiedTotal(userId),
  ]);
  return { daysStudied, perDay };
}

async function getCards(userId) {
  const [byState, hardest] = await Promise.all([
    statsRepo.cardCountsByState(userId),
    statsRepo.hardestCards(userId),
  ]);
  const total = byState.new + byState.seen + byState.learned + byState.mastered;
  return { byState, total, hardest };
}

// The 5 most recent tier promotions. A bare list — the repository already
// shapes each row for display, so there's nothing to assemble here.
async function getRecentUpgrades(userId) {
  return await statsRepo.recentTierUpgrades(userId);
}

module.exports = { getActivity, getCards, getRecentUpgrades };
