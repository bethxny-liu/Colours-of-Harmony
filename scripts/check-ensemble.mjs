import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const compile = file => ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const asModule = code => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const musicURL = asModule(compile("../src/lib/garden/music.ts"));
const music = await import(musicURL);
const ensemble = await import(asModule(compile("../src/lib/garden/ensemble.ts").replace('"./music"', JSON.stringify(musicURL))));
const { DEFAULT_ENSEMBLE: defaults, HOMES, cadence, homeFold, normalizeMelody, scale, flowerFor, offsetForFlower, scoreBar, GardenTransport } = ensemble;
assert.deepEqual(music.describe(ensemble.findChord(4, false)).notes, ["E", "G♯", "B"]);
assert.deepEqual(music.describe(ensemble.findChord(1, true)).notes, ["D♭", "F♭", "A♭"]);

for (const [key, home] of Object.entries(HOMES)) {
  const path = cadence(key, "return");
  assert.equal(path.length, 4);
  assert.equal(cadence(key, "away").length, 3);
  assert.deepEqual(path[0], path[3]);
  assert.equal(music.describe(path[2]).root, (home.root + 7) % 12);
  assert.equal(music.describe(path[2]).quality, "major");
  for (const fullScale of [false, true]) {
    const config = normalizeMelody({ ...defaults, home: key, fullScale });
    assert.equal(scale(config).length, fullScale ? 7 : 5);
    assert.equal(config.melody[7], null, "A rest must survive a key or scale change");
    for (const offset of scale(config)) {
      const flower = flowerFor(offset, key);
      assert.ok(flower && music.inGarden(flower));
      assert.equal(music.pitch(flower), (home.root + offset) % 12);
      assert.equal(offsetForFlower(flower, config), offset);
    }
  }
}

for (let a = 2; a <= 7; a++) for (let b = 2; b <= 7; b++) {
  const config = { ...defaults, melodyOn: true, beatOn: true, pondOn: true, pond: [a, b] };
  const { events } = scoreBar(config, music.HOME, [60, 67, 64]);
  assert.equal(events.filter(e => e.kind === "step").length, 8);
  assert.equal(events.filter(e => e.kind === "melody").length, 7);
  assert.deepEqual(events.filter(e => e.kind === "beat").map(e => e.beat), [0, 1, 2, 3]);
  assert.deepEqual(events.filter(e => e.kind === "chord").map(e => e.beat), [0, 2]);
  for (const [ring, count] of [a, b].entries()) {
    const hits = events.filter(e => e.kind === "pond" && e.index === ring);
    assert.equal(hits.length, count);
    hits.forEach((hit, i) => assert.ok(Math.abs(hit.beat - 4 * i / count) < 1e-10));
    assert.equal(hits[0].beat, 0, "Both rhythms must meet at the loop boundary");
  }
  assert.ok(events.every((event, i) => event.beat >= 0 && event.beat < 4 && (!i || event.beat >= events[i - 1].beat)));
}
const offbeats = scoreBar({ ...defaults, beatOn: true, rhythm: [false, true, false, true, false, true, false, true] }, music.HOME, [60, 67, 64]);
assert.deepEqual(offbeats.events.filter(e => e.kind === "chord").map(e => e.beat), [.5, 1.5, 2.5, 3.5]);
const guide = scoreBar({ ...defaults, beatOn: true, rhythm: Array(8).fill(false) }, homeFold("Am"), [60, 67, 64], "return");
assert.deepEqual(guide.events.filter(e => e.kind === "chord").map(e => e.beat), [0], "Guided phrases need one clear chord per bar");

let time = 0, finished = 0;
const sounds = [];
const audio = {
  get now() { return time; }, get visualNow() { return time; },
  noteAt(note, when) { sounds.push({ note, when }); }, chordAt(notes, when) { sounds.push({ notes, when }); },
  tapAt(when) { sounds.push({ tap: true, when }); }, stop() {},
};
const transport = new GardenTransport(audio, () => {}, () => finished++);
try {
  transport.start({ ...defaults, melodyOn: true, beatOn: true }, [music.HOME]);
  assert.ok(sounds.length > 0 && sounds.every(sound => sound.when >= .09));
  time = .091;
  assert.equal(transport.frame().step, 0);
  assert.equal(music.pitch(transport.frame().landing), 0);
  time = .09 + 30 / defaults.bpm + .001;
  assert.equal(transport.frame().step, 1);
  assert.equal(music.pitch(transport.frame().landing), 2);
  assert.equal(music.pitch(transport.frame().previous), 0);
  assert.equal(music.pitch(transport.frame().next), 4);
  transport.stop();
  assert.equal(transport.frame().running, false);
  time = 0;
  transport.start({ ...defaults, beatOn: true }, [music.HOME], "away");
  time = 3 * 240 / defaults.bpm + .2;
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(finished, 1, "The away comparison must stop on V instead of looping home");
  assert.equal(transport.frame().running, false);
} finally { transport.dispose(); }
console.log("Ensemble passed: three musical homes, scale-safe melody edits and rests, 36 polyrhythm ratios, offbeat chords, audio-clock frames, and finite cadence playback.");
