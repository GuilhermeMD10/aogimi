export interface DeckRecord {
  id: string;
  user_id: number;
  name: string;
  description: string;
  created_at: string;
  card_count: number;
}

export type CardState = 'new' | 'learning' | 'mastered';

export interface CardRecord {
  id: string;
  deck_id: string;
  front: string;
  reading: string;
  back: string;
  notes: string;
  context_sentence: string;
  state: CardState;
  reviewed_times: number;
  created_at: string;
}
