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
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/**
 * The reader's text selection has engaged — the hold was long enough and the
 * band is now live under the finger.
 *
 * **Medium, unlike every other haptic here.** It marks a mode change rather
 * than a tap: the next drag means "select" instead of "turn the page", and the
 * reader needs to feel that switch through the glass without looking. It fires
 * once per gesture.
 */
export function selectionStartFeedback(): void {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/**
 * One more character has entered (or left) the selection band.
 *
 * `selectionAsync` rather than an impact: it is the OS's own picker-detent
 * feel, which is exactly the metaphor — the band is clicking through
 * characters. It is also the lightest thing the engine offers, which matters
 * because this can fire many times per second while dragging.
 */
export function selectionTickFeedback(): void {
  run(() => Haptics.selectionAsync());
}

/**
 * A star in the sky map has been hit.
 *
 * **Rigid, which nothing else here uses**, because nothing else here is a hit on a target the size
 * of a star: the canvas is not a Touchable, so this is the only feedback that tap produces, and it
 * has to say "that one" rather than merely "something happened". Rigid is the crispest, shortest
 * thing the engine offers — a tap on glass — which is both distinguishable from the soft Light tick
 * every button gives and quiet enough to fire while a reader picks their way around a constellation.
 *
 * Missing the stars stays silent on purpose: with a hit that speaks, the silence is what tells the
 * reader they caught empty sky.
 */
export function starTapFeedback(): void {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
}

/**
 * How a grade button feels under the finger, as four distinguishable weights.
 *
 * Named for the feel rather than the grade so this module stays ignorant of the study domain — the
 * mapping from Again/Hard/Good/Easy lives with the grades themselves, in `ResultButtons`, beside
 * the colours that already carry the same meaning.
 *
 * The four are one progression, not four arbitrary picks: `firm` is crisp and abrupt, and each step
 * softens until `soft` is diffuse and barely there. That ordering is the point — a reader grading a
 * long queue learns the row through their thumb, and a set of four that merely *differed* would
 * only be noise. None is Heavy: this fires on every card of every session, and anything with real
 * amplitude turns a study run into a buzz.
 */
export type GradeFeel = 'firm' | 'solid' | 'light' | 'soft';

const GRADE_STYLE: Record<GradeFeel, Haptics.ImpactFeedbackStyle> = {
  firm: Haptics.ImpactFeedbackStyle.Rigid,
  solid: Haptics.ImpactFeedbackStyle.Medium,
  light: Haptics.ImpactFeedbackStyle.Light,
  soft: Haptics.ImpactFeedbackStyle.Soft,
};

export function gradeFeedback(feel: GradeFeel): void {
  run(() => Haptics.impactAsync(GRADE_STYLE[feel]));
}

/** Shared guard: a missing engine or native module is silence, never a throw. */
function run(fire: () => Promise<void>): void {
  try {
    void fire().catch(() => {
      /* no engine, or no native module — silence is the correct fallback */
    });
  } catch (err) {
    if (!warned) {
      warned = true;
      console.warn('[haptics] unavailable — rebuild the dev client to enable haptics', err);
    }
  }
}
