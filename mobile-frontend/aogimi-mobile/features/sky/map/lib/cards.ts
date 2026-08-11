/**
 * What a host hands the sky when it mines a card, and the one-line clipper the views need to fit it.
 *
 * There is no content *generator* here. A star's words, its rank and its review count all come from
 * the host's own card and nothing else: `addStar` requires them, so there is no placeholder path to
 * drift away from the real one and no invented display name for a host to have to map onto.
 * Placement never reads any of these fields, so whatever a card says — and however far up the
 * ladder it has climbed — the sky it makes is the same sky.
 */

export type CardContent = {
  front: string;
  back: string;
  /** 0..3 up the host's SRS ladder (Aogimi: new / met / learned / mastered). Drives what the
   *  star is drawn as — colour, silhouette, radius — never where it sits. */
  mastery: number;
  /** 0..1, how brightly this star burns *now* — the host's retrievability. The second half of
   *  what a star says: `mastery` is the rank it earned, this is how fresh it is. Rank alone can
   *  only show decay by demoting, which the ladder deliberately refuses to do above Learned.
   *  Omitted means fully lit. Like `mastery`, placement never reads it. */
  glow?: number;
  /** How many times the card has been reviewed. Display and histograms only. */
  count: number;
};

/** Ellipsis-clip for the one-line places a card's text has to fit: list rows and star labels. */
export const clip = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
