/** Tonnetz coordinates: one step east is a fifth, northeast a major third. */
export type Seed = { a: number; b: number };
export type Fold = readonly [Seed, Seed, Seed];
export const HOME: Fold = [{ a: 0, b: 0 }, { a: 1, b: 0 }, { a: 0, b: 1 }];
const NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURALS = [0, 2, 4, 5, 7, 9, 11];
function spellChordTone(root: number, letterSteps: number, semitones: number) {
  const letter = (LETTERS.indexOf(NAMES[root][0]) + letterSteps) % 7;
  const difference = (((root + semitones - NATURALS[letter]) % 12) + 18) % 12 - 6;
  const accidental = difference < 0 ? "♭".repeat(-difference) : "♯".repeat(difference);
  return LETTERS[letter] + accidental;
}
export const seedKey = (seed: Seed) => `${seed.a},${seed.b}`;
export const pitch = ({ a, b }: Seed) => ((a * 7 + b * 4) % 12 + 12) % 12;
export const noteName = (seed: Seed) => NAMES[pitch(seed)];
export const position = ({ a, b }: Seed) => ({
  x: (a + b * 0.5 - 0.5) * 1.55,
  z: (b * Math.sqrt(3) / 2 - Math.sqrt(3) / 6) * 1.55,
});
export const inGarden = (seed: Seed) => {
  const { x, z } = position(seed);
  return Math.hypot(x, z) < 3.35;
};

export function describe(fold: Fold) {
  const pcs = fold.map(pitch);
  for (const root of pcs) {
    for (const third of [4, 3]) {
      if (pcs.includes((root + third) % 12) && pcs.includes((root + 7) % 12)) {
        const quality = third === 4 ? "major" : "minor";
        return {
          root, quality,
          name: `${NAMES[root]} ${quality}`,
          short: `${NAMES[root]}${quality === "minor" ? "m" : ""}`,
          notes: [NAMES[root], spellChordTone(root, 2, third), spellChordTone(root, 4, 7)],
        };
      }
    }
  }
  throw new Error("A garden triangle must be a major or minor triad.");
}

export function neighbors(fold: Fold) {
  return fold.map((moving, index) => {
    const fixed = fold.filter((_, i) => i !== index);
    const planted = { a: fixed[0].a + fixed[1].a - moving.a, b: fixed[0].b + fixed[1].b - moving.b };
    const next = fold.map((seed, i) => i === index ? planted : seed) as unknown as Fold;
    return { index, next, moving, planted, fixed, allowed: inGarden(planted), chord: describe(next) };
  });
}

export function gardenSeeds() {
  const seeds: Seed[] = [];
  for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) {
    const seed = { a, b };
    if (inGarden(seed)) seeds.push(seed);
  }
  return seeds;
}

/** Keep common voices in the same register and move the changing voice by the shortest distance. */
export function voice(fold: Fold, previous: number[] = [60, 67, 64]) {
  return fold.map((seed, i) => {
    const pc = pitch(seed);
    const held = previous.find(note => ((note % 12) + 12) % 12 === pc);
    if (held !== undefined) return held;
    return [48 + pc, 60 + pc, 72 + pc].reduce((best, candidate) =>
      Math.abs(candidate - previous[i]) < Math.abs(best - previous[i]) ? candidate : best,
    );
  });
}
