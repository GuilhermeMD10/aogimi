// Mirror of mobile components/study/utils/orderByMode.ts and backend
// src/services/studyService.js. Used when the backend session endpoint
// isn't reachable; same 7 modes, same comparators.

import type { CardRecord } from '@/features/sky/stage/types';
import type { StudyMode } from '../types';
import { hardestSortKey } from './srs';

const MS_PER_DAY = 86_400_000;
const OLDEST_ONLY_CUTOFF_DAYS = 7;

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function compareLastReviewedAsc(a: CardRecord, b: CardRecord): number {
  if (!a.last_reviewed_at && !b.last_reviewed_at) return 0;
  if (!a.last_reviewed_at) return -1;
  if (!b.last_reviewed_at) return 1;
  return new Date(a.last_reviewed_at).getTime() - new Date(b.last_reviewed_at).getTime();
}

function compareCreatedAsc(a: CardRecord, b: CardRecord): number {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function orderByHardest(cards: CardRecord[]): CardRecord[] {
  const now = new Date();
  return cards
    .map((card) => ({ card, key: hardestSortKey(card, now) }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.card);
}

export function orderByMode(cards: CardRecord[], mode: StudyMode): CardRecord[] {
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
      const filtered = cards.filter(
        (c) => !c.last_reviewed_at || new Date(c.last_reviewed_at).getTime() < cutoff,
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
