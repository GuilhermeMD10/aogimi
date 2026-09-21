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
 * The four weights the engine offers, named for how they feel rather than for
 * Apple's enum, as one progression: `firm` is crisp and abrupt, and each step
 * softens until `soft` is diffuse and barely there. That ordering is the point
 * wherever a set of them is used together — a set that merely *differed* would
 * only be noise. None is Heavy: these fire on hot paths, and anything with real
 * amplitude turns a session into a buzz.
 */
export type ImpactFeel = 'firm' | 'solid' | 'light' | 'soft';

const IMPACT: Record<ImpactFeel, Haptics.ImpactFeedbackStyle> = {
  firm: Haptics.ImpactFeedbackStyle.Rigid,
  solid: Haptics.ImpactFeedbackStyle.Medium,
  light: Haptics.ImpactFeedbackStyle.Light,
  soft: Haptics.ImpactFeedbackStyle.Soft,
};

/**
 * One impact, picked by feel.
 *
 * The named functions in this file are the app's vocabulary and should stay the
 * way a feature asks for a haptic — they say what the moment *is*. This is for
 * code whose whole subject is the feel itself and which therefore has nothing
 * to name: the dock tuning lab, where three bars exist only to be told apart by
 * their weight.
 */
export function impactFeedback(feel: ImpactFeel): void {
  run(() => Haptics.impactAsync(IMPACT[feel]));
}

/**
 * How a grade button feels under the finger, as four distinguishable weights.
 *
 * Its own name rather than `impactFeedback` at the call site so this module
 * stays ignorant of the study domain — the mapping from Again/Hard/Good/Easy
 * lives with the grades themselves, in `GradeShelf`, beside the colours that
 * already carry the same meaning.
 */
export type GradeFeel = ImpactFeel;

export function gradeFeedback(feel: GradeFeel): void {
  impactFeedback(feel);
}

/**
 * The dock's slide has crossed into the next route.
 *
 * `selectionAsync`, like the reader's band: the highlight is clicking through
 * detents under the finger, and this fires on every crossing while dragging,
 * so it has to be the lightest thing the engine offers. The tap that enters a
 * route is `pressFeedback`, as everywhere else.
 */
export function dockStepFeedback(): void {
  run(() => Haptics.selectionAsync());
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
