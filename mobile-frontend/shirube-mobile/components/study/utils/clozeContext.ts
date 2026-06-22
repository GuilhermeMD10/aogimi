// Replace the target word with a visual blank in a context sentence.
// Exact string match only — the context_sentence usually contains the
// same surface form the user clicked in the reader, so an exact match
// catches the common case. Conjugated verbs and inflected adjectives
// fall through unchanged; proper morphology-aware cloze is a polish
// item.

const BLANK = '＿＿＿';

export function cloze(sentence: string, target: string): string {
  if (!target || !sentence) return sentence;
  if (!sentence.includes(target)) return sentence;
  return sentence.split(target).join(BLANK);
}
