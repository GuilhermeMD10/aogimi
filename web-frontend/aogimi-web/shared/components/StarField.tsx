/**
 * Night's procedural star layer (README → Night · Sakura Yozora; DESIGN.md).
 *
 * Seeded LCG `s = (s·1103515245 + 12345) mod 2³¹`, seed 218, so the sky is the
 * same on the server and every client and hydration has nothing to disagree
 * about. ~160 stars per page, 0.8–3.0px, opacity 0.25–1, a glow above 2.4px.
 * Positions are percentages of a fixed full-viewport layer, so the field
 * neither scrolls nor stretches.
 *
 * Mounted by `AppFrame` when the theme is Night — nothing to do with
 * `features/sky/map`, which draws the user's cards, not decoration.
 */

const SEED = 218;
const COUNT = 160;

function lcg(seed: number) {
  let s = seed;
  return () => {
    // `Math.imul` keeps the product in 32 bits; `& 0x7fffffff` is the mod 2³¹.
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x80000000;
  };
}

type Star = { x: number; y: number; r: number; o: number };

function generate(): Star[] {
  const next = lcg(SEED);
  const stars: Star[] = [];
  for (let i = 0; i < COUNT; i++) {
    const x = next() * 100;
    const y = next() * 100;
    const r = 0.8 + next() * 2.2;
    const o = 0.25 + next() * 0.75;
    stars.push({ x, y, r, o });
  }
  return stars;
}

const STARS = generate();

export function StarField() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {STARS.map((s, i) => (
        <circle
          key={i}
          cx={`${s.x.toFixed(2)}%`}
          cy={`${s.y.toFixed(2)}%`}
          r={(s.r / 2).toFixed(2)}
          fill="#fff"
          opacity={s.o.toFixed(2)}
          style={s.r > 2.4 ? { filter: 'drop-shadow(0 0 6px rgba(255,255,255,.9))' } : undefined}
        />
      ))}
    </svg>
  );
}
