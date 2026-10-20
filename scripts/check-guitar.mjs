import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync(new URL("../src/lib/garden/guitar.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { guitarChart, melodyBar, GuitarSession, HIT_WINDOW, PERFECT_WINDOW } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
function rig(level = "stroll", root = 0, minor = false) {
  const chart = guitarChart(level, root, minor), plucks = [], taps = [];
  const audio = { now: 0, visualNow: 0, stops: 0, pluckAt(...args) { plucks.push(args); }, tapAt(...args) { taps.push(args); }, stop() { this.stops++; } };
  const session = new GuitarSession(chart, audio);
  session.start();
  const origin = session.snapshot().lead;
  const advance = (time, outputLatency = 0) => { audio.visualNow = time; audio.now = time + outputLatency; session.tick(); };
  return { chart, audio, session, plucks, taps, origin, advance, seconds: 60 / chart.bpm };
}

for (const level of ["stroll", "offbeats"]) for (const [root, minor] of [[0, false], [7, false], [9, true]]) {
  const { chart, session, advance, origin, seconds } = rig(level, root, minor);
  assert.equal(chart.notes.length, level === "stroll" ? 32 : 38);
  for (let index = 0; index < 8; index++) {
    const bar = melodyBar(chart, index * 4 * seconds);
    assert.equal(bar.index, index, "Notation must switch bars exactly on the bar line");
    assert.equal(bar.notes.reduce((sum, note) => sum + note.duration, 0), 4, "Every printed bar must contain four beats");
    assert.ok(bar.notes.every(note => [1, .5].includes(note.duration)));
    assert.equal(bar.notes.filter(note => note.current).length, 1);
  }
  const opening = melodyBar(chart, 0);
  assert.deepEqual(opening.notes.map(note => note.step), minor ? [3, 5, 7, 5] : root === 7 ? [2, 4, 6, 4] : [-2, 0, 2, 0], "Printed pitches must occupy the correct treble-staff lines/spaces");
  assert.equal(melodyBar(chart, chart.beats * seconds).index, 7, "The final score must stay on the last bar");
  if (level === "offbeats") {
    const eighths = melodyBar(chart, 6.5 * seconds);
    assert.equal(eighths.notes.find(note => note.current).beat, 6.5, "The notation must follow the eighth-note offbeat");
    assert.equal(eighths.notes.filter(note => note.duration === .5).length, 2, "An offbeat must be printed as a pair of eighth notes");
  }
  assert.ok(chart.notes.every((note, i) => note.id === i && note.beat < chart.beats && note.midi === chart.pitches[note.lane]));
  for (const note of chart.notes) {
    advance(origin + note.beat * seconds, .09);
    assert.equal(session.hit(note.lane)?.grade, "perfect", "Judging must use the audible clock, including output latency");
  }
  advance(origin + chart.beats * seconds + .5);
  const result = session.snapshot();
  assert.equal(result.phase, "complete"); assert.equal(result.hits, chart.notes.length);
  assert.equal(result.accuracy, 100); assert.equal(result.best, chart.notes.length); assert.equal(result.misses, 0);
}

for (const offset of [-HIT_WINDOW, -PERFECT_WINDOW, 0, PERFECT_WINDOW, HIT_WINDOW]) {
  const { session, advance, origin } = rig();
  advance(origin + offset);
  assert.equal(session.hit(0)?.grade, Math.abs(offset) <= PERFECT_WINDOW ? "perfect" : "good", "Early/late windows include their boundaries, including the first note");
}
{
  const { session, advance, origin } = rig();
  advance(origin); assert.equal(session.hit(3), null);
  assert.equal(session.snapshot().strays, 1); assert.equal(session.results[0], null, "A wrong arrow must not steal the correct note");
  assert.equal(session.hit(0)?.grade, "perfect");
  assert.equal(session.hit(0), null); assert.equal(session.snapshot().hits, 1, "A note may only be caught once");
  assert.equal(session.snapshot().combo, 0, "Spamming arrows must break a streak");
}
{
  const { session, audio, advance, origin, seconds } = rig();
  advance(origin + 8.3 * seconds);
  session.pause(); const frozen = session.snapshot(), stops = audio.stops;
  advance(audio.visualNow + 40);
  assert.equal(session.snapshot().elapsed, frozen.elapsed); assert.equal(session.snapshot().misses, frozen.misses);
  session.start(true);
  const lead = session.snapshot().lead;
  assert.ok(lead > 4 * seconds); assert.equal(session.snapshot().count, 4); assert.ok(audio.stops > stops);
  advance(audio.visualNow + lead / 2);
  assert.equal(session.snapshot().elapsed, frozen.elapsed, "A resume count-in must freeze the song at its saved position");
  assert.equal(session.snapshot().phase, "countin");
  advance(audio.visualNow + lead / 2 + .01);
  assert.equal(session.snapshot().phase, "playing");
  assert.ok(Math.abs(session.snapshot().elapsed - frozen.elapsed - .01) < 1e-7);
}
{
  const { session, advance, origin, seconds, chart } = rig("offbeats");
  advance(origin + chart.beats * seconds + .5);
  assert.equal(session.snapshot().misses, chart.notes.length); assert.equal(session.snapshot().phase, "complete");
  assert.equal(session.snapshot().accuracy, 0); assert.equal(session.hit(0), null);
  session.start(); assert.equal(session.snapshot().hits, 0); assert.equal(session.snapshot().misses, 0);
  assert.ok(session.results.every(result => result === null), "Replaying starts with a fresh score");
}
{
  const { session, audio, advance, plucks } = rig();
  advance(600);
  assert.ok(plucks.every(([, when]) => when >= audio.now - .025), "An inactive tab must never burst a backlog of guitar notes");
  assert.equal(session.snapshot().phase, "complete");
  session.pause(); assert.equal(session.snapshot().phase, "complete", "Pausing a completed song cannot revive it");
}
// Exercise the actual rig: shoulders stay embedded, both links keep their length, and hands clear the strings.
const THREE = await import("three");
const sceneSource = fs.readFileSync(new URL("../src/components/garden/guitarScene.ts", import.meta.url), "utf8");
const sceneCode = ts.transpileModule(sceneSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace('"three"', JSON.stringify(import.meta.resolve("three")));
const { addGuitar } = await import(`data:text/javascript;base64,${Buffer.from(sceneCode).toString("base64")}`);
const visitor = new THREE.Group(); visitor.rotation.y = -.15;
const material = new THREE.MeshBasicMaterial();
function makeArm(side) {
  const root = new THREE.Group(); root.position.set(side * .112, .735, .035); visitor.add(root);
  const arm = { root, upperLength: .19, foreLength: .205, upperArm: new THREE.Mesh(new THREE.CylinderGeometry(.046, .046, .19, 12), material), elbow: new THREE.Mesh(new THREE.SphereGeometry(.047), material), forearm: new THREE.Mesh(new THREE.CylinderGeometry(.038, .041, .205, 12), material), hand: new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), material) };
  arm.hand.scale.set(.035, .04, .028); root.add(arm.upperArm, arm.elbow, arm.forearm, arm.hand);
  const p = root.position;
  assert.ok((p.x / .155) ** 2 + ((p.y - .64) / .205) ** 2 + ((p.z - .005) / .115) ** 2 < 1, "Both shoulder anchors must sit inside the sweater");
  return arm;
}
const strumRig = makeArm(-1), fretRig = makeArm(1);
const anchors = [strumRig.root.position.clone(), fretRig.root.position.clone()];
const guitar = addGuitar(visitor, strumRig, fretRig);
guitar.strum(0);
let leftmost = Infinity, rightmost = -Infinity;
for (let time = 0; time <= 500; time += 5) {
  guitar.tick(time, false, Math.max(0, 1 - time / 180));
  visitor.updateMatrixWorld(true);
  const inverse = guitar.object.matrixWorld.clone().invert();
  const wrist = strumRig.hand.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse);
  leftmost = Math.min(leftmost, wrist.x); rightmost = Math.max(rightmost, wrist.x);
  for (const [i, arm] of [strumRig, fretRig].entries()) {
    assert.ok(arm.root.position.equals(anchors[i]), "Shoulder anchors must never move with the guitar");
    assert.ok(Math.abs(arm.elbow.position.length() - arm.upperLength) < 1e-8, "The upper arm must not stretch");
    assert.ok(Math.abs(arm.hand.position.distanceTo(arm.elbow.position) - arm.foreLength) < 1e-8, "The forearm must not stretch");
    const endpoint = (bone, end) => new THREE.Vector3(0, end * bone.geometry.parameters.height / 2, 0).applyMatrix4(bone.matrix);
    assert.ok(endpoint(arm.upperArm, -1).length() < 1e-8, "The upper arm must meet its shoulder");
    assert.ok(endpoint(arm.upperArm, 1).distanceTo(arm.elbow.position) < 1e-8, "The elbow must meet the upper arm");
    assert.ok(endpoint(arm.forearm, -1).distanceTo(arm.elbow.position) < 1e-8, "The forearm must meet the elbow");
    assert.ok(endpoint(arm.forearm, 1).distanceTo(arm.hand.position) < 1e-8, "The wrist must meet the forearm");
    const transform = inverse.clone().multiply(arm.hand.matrixWorld), vertices = arm.hand.geometry.getAttribute("position");
    for (let j = 0; j < vertices.count; j++) {
      const point = new THREE.Vector3().fromBufferAttribute(vertices, j).applyMatrix4(transform);
      assert.ok(point.z > .105, "Both hands must stay above the guitar face");
    }
  }
}
assert.ok(leftmost < -.05 && rightmost > .05, "The strum must cross all six strings");
guitar.tick(100, true, 1); const reducedWrist = strumRig.hand.position.clone();
guitar.tick(300, true, 0); assert.ok(strumRig.hand.position.equals(reducedWrist), "Reduced motion must keep the strumming hand still");
console.log("Guitar passed: musical timing, bar notation and pitch placement, quarter/eighth notes, pause/resume, fixed arm lengths, embedded shoulders, connected joints, and hand clearance across the stroke.");
