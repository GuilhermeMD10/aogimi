import { StudyScreen } from '@/features/sky/study/components/StudyScreen';
import type { StudySessionConfig } from '@/features/sky/study/types';

const SPEC: StudySessionConfig = {
  scope: 'all',
  mode: 'hardest_all_decks',
  limit: 20,
  // Due cards only. Without this the pool is every card the user owns, and
  // since the FSRS-6 port a grade on a card that isn't due changes nothing —
  // so the session would hand out work that silently cannot count. `dueOnly`
  // filters the pool before `hardest_all_decks` orders it, so the ordering is
  // unchanged; there is just less in the hat.
  dueOnly: true,
};

// Cross-deck "hardest across all decks" route. Hardcoded spec — there's
// no per-config UI for this mode (it's a single-tap CTA from the decks
// list). Title left empty so the deck-name front toggle stays inert.
export default function StudyAllRoute() {
  return <StudyScreen sessionSpec={SPEC} />;
}
