import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync(new URL("../src/lib/garden/music.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { HOME, describe, neighbors, pitch, position, seedKey, voice, gardenSeeds } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
assert.equal(describe(HOME).name, "C major");
assert.deepEqual(neighbors(HOME).map(move => move.chord.name), ["E minor", "A minor", "C minor"]);
const key = fold => fold.map(seedKey).sort().join("|");
const queue = [HOME];
const visited = new Set();
let transitions = 0;
while (queue.length) {
  const fold = queue.shift();
  if (visited.has(key(fold))) continue;
  visited.add(key(fold));
  assert.ok(["major", "minor"].includes(describe(fold).quality));
  assert.equal(new Set(fold.map(pitch)).size, 3);
  const previous = voice(fold);
  for (const move of neighbors(fold)) {
    const shared = fold.map(pitch).filter(pc => move.next.map(pitch).includes(pc));
    assert.equal(shared.length, 2, "Each fold must preserve exactly two pitch classes");
    assert.deepEqual(neighbors(move.next)[move.index].next, fold, "Folding back must restore the original triangle");
    const nextVoice = voice(move.next, previous);
    fold.forEach((seed, i) => {
      if (i !== move.index) assert.equal(nextVoice[i], previous[i], "Common notes must keep their register");
      assert.ok(Math.abs(nextVoice[i] - previous[i]) <= 6, "Move the changed voice by its shortest interval");
    });
    const a = position(move.fixed[0]), b = position(move.fixed[1]);
    const old = position(move.moving), next = position(move.planted);
    assert.ok(Math.abs((old.x + next.x) / 2 - (a.x + b.x) / 2) < 1e-9);
    assert.ok(Math.abs((old.z + next.z) / 2 - (a.z + b.z) / 2) < 1e-9);
    transitions++;
    if (move.allowed && !visited.has(key(move.next))) queue.push(move.next);
  }
}
assert.ok(visited.size > 15, "The garden needs room for more than its starting chords");
assert.ok(gardenSeeds().length > 12, "Pitch classes must repeat across the lattice");
console.log(`Garden Fold: ${visited.size} reachable triangles, ${transitions} transitions checked. Shared notes, reversible folds, geometry, and voice leading passed.`);
