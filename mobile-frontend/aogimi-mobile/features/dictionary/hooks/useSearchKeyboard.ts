import { useCallback, useRef } from 'react';
import { Keyboard, type TextInput } from 'react-native';

/**
 * The dictionary's keyboard policy, in one place.
 *
 * **It used to have three**, none of them written down. `keyboardShouldPersistTaps`
 * decided what a tap on a result did, RN's default `submitBehavior` decided what
 * Return did, and unmounting a focused field during a frame push decided the
 * rest — and that last one left the input as RN's remembered focused node, so
 * coming back re-raised the keyboard. Hence "press once or twice more": three
 * mechanisms answering one question, each in a different state.
 *
 * The rule now, and there is only one:
 *
 *   · **A tap on the field is the only thing that opens the keyboard.** Nothing
 *     in this feature calls `focus()` — the old empty-state card wrapped the
 *     field in a `Pressable` that did, which is why a tap near the bar could
 *     raise it again.
 *   · **Return, a result, a kanji, a recent, a frame change or a tap on the
 *     page all close it**, through `dismiss()`.
 *
 * `blur()` *and* `Keyboard.dismiss()` on purpose: the first clears RN's focus
 * bookkeeping so a remounted field does not inherit it, the second closes the
 * keyboard even when focus already moved elsewhere. Either alone leaves one of
 * the two states behind.
 *
 * `keyboardShouldPersistTaps="handled"` stays on the lists. With `"never"` the
 * first tap outside the field is *swallowed* to dismiss the keyboard — which is
 * the other half of the double-tap this hook exists to remove.
 */
export function useSearchKeyboard(): {
  inputRef: React.RefObject<TextInput | null>;
  dismiss: () => void;
} {
  const inputRef = useRef<TextInput | null>(null);

  const dismiss = useCallback(() => {
    inputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  return { inputRef, dismiss };
}
