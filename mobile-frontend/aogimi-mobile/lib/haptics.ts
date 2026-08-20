// Press haptics — one call site's worth of API, deliberately fire-and-forget.
//
// **Guarded because the native module may not be in the binary.** `expo-haptics`
// was added after the current dev client was built, so until the next
// `npx expo run:ios` the JS is present and the native side is not. Every call
// is therefore wrapped: a missing module degrades to no feedback, never to a
// crash on the app's most common interaction.
//
// Also a no-op on web and on any platform without a taptic engine, which
// `expo-haptics` handles itself.

import * as Haptics from 'expo-haptics';

let warned = false;

/**
 * The contact tick fired on press-in, alongside the visual nudge.
 *
 * **Press-in, not press-out**: the haptic is the feel of touching the control,
 * so it has to land with the finger rather than with the action. Light, because
 * it fires on every tap in the app — anything heavier turns a scroll-and-tap
 * session into a buzz.
 */
export function pressFeedback(): void {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      /* no engine, or no native module — silence is the correct fallback */
    });
  } catch (err) {
    if (!warned) {
      warned = true;
      console.warn('[haptics] unavailable — rebuild the dev client to enable press feedback', err);
    }
  }
}
