// Exact-string-match cloze. Same caveats as the mobile version: only
// catches the surface form of the target word; conjugations fall
// through unchanged.

const BLANK = '＿＿＿';

export function cloze(sentence: string, target: string): string {
  if (!target || !sentence) return sentence;
  if (!sentence.includes(target)) return sentence;
  return sentence.split(target).join(BLANK);
}
