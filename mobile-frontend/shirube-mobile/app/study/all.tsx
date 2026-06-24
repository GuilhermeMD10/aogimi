import { StudyScreen } from '@/components/study/ui/StudyScreen';
import type { StudySessionConfig } from '@/components/study/types';

const SPEC: StudySessionConfig = {
  scope: 'all',
  mode: 'hardest_all_decks',
  limit: 20,
};

// Cross-deck "hardest across all decks" route. Hardcoded spec — there's
// no per-config UI for this mode (it's a single-tap CTA from the decks
// list). Title left empty so the deck-name front toggle stays inert.
export default function StudyAllRoute() {
  return <StudyScreen sessionSpec={SPEC} />;
}
