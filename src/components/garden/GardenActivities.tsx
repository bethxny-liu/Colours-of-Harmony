"use client";

import { BEATS, HOMES, cadence, melodyName, normalizeMelody, scale, type Ensemble, type GardenMode, type HomeKey, type Phrase } from "@/lib/garden/ensemble";
import { describe } from "@/lib/garden/music";
import styles from "./garden.module.css";

export const GARDEN_MODES: { id: GardenMode; icon: string; label: string }[] = [
  { id: "chords", icon: "◇", label: "Chords" },
  { id: "melody", icon: "ʚɞ", label: "Butterfly melody" },
  { id: "beat", icon: "♩", label: "Bench rhythm" },
  { id: "pond", icon: "◎", label: "Pond polyrhythms" },
  { id: "home", icon: "⌂", label: "Musical home" },
];

type Props = {
  mode: Exclude<GardenMode, "chords">;
  config: Ensemble;
  onChange: (config: Ensemble) => void;
  playing: boolean;
  step: number;
  editSlot: number;
  onEditSlot: (slot: number) => void;
  onToggle: (feature: "melodyOn" | "beatOn" | "pondOn") => void;
  onPhrase: (phrase: Exclude<Phrase, null>) => void;
  onStop: () => void;
  phrase: Phrase;
  bar: number;
  currentChord: string;
};

export function GardenActivities({ mode, config, onChange, playing, step, editSlot, onEditSlot, onToggle, onPhrase, onStop, phrase, bar, currentChord }: Props) {
  const tempo = <label className={styles.tempo}>Tempo <input type="range" min="55" max="132" step="1" value={config.bpm} onChange={event => onChange({ ...config, bpm: Number(event.target.value) })} /><span>{config.bpm}</span></label>;
  const updateNote = (slot: number, value: string) => onChange({ ...config, melody: config.melody.map((note, i) => i === slot ? (value === "rest" ? null : Number(value)) : note) });
  const enabled = mode === "melody" ? config.melodyOn : mode === "beat" ? config.beatOn : config.pondOn;
  return <div className={styles.activity}>
    {mode === "melody" && <>
      <h1>Butterfly melody</h1>
      <p className={styles.activityIntro}>Eight landings, one little tune. Choose a landing, then a note flower.</p>
      <div className={styles.melodyGrid} aria-label="Eight melody landings">{config.melody.map((note, i) => <label key={i} data-active={playing && step === i} data-editing={editSlot === i}><span>{BEATS[i]}</span><select aria-label={`Melody landing ${i + 1}`} value={note === null ? "rest" : note} onFocus={() => onEditSlot(i)} onChange={event => { onEditSlot(i); updateNote(i, event.target.value); }}><option value="rest">—</option>{scale(config).map(offset => <option key={offset} value={offset}>{melodyName(offset, config.home)}</option>)}</select></label>)}</div>
      <label className={styles.check}><input type="checkbox" checked={config.fullScale} onChange={event => onChange(normalizeMelody({ ...config, fullScale: event.target.checked }))} /> Open the full seven-note scale</label>
      <button className={styles.listen} onClick={() => onToggle("melodyOn")}>{config.melodyOn && playing ? "Pause the butterfly" : "Fly my melody"} <span aria-hidden="true">ʚɞ</span></button>
      <details className={styles.lesson}><summary>What am I hearing?</summary><p>Each box lasts half a beat. A dash is a rest. Five-note pentatonic scales leave room between the notes; the full scale adds more ways to move.</p></details>
    </>}
    {mode === "beat" && <>
      <h1>A little foot-tap</h1>
      <p className={styles.activityIntro}>The person keeps four steady beats. Choose the stones where your chord joins in.</p>
      <div className={styles.beatGrid} aria-label="Chord rhythm stepping stones">{config.rhythm.map((on, i) => <button key={i} aria-label={`Chord on ${BEATS[i] === "&" ? `the offbeat after ${(i + 1) / 2}` : `beat ${BEATS[i]}`}`} aria-pressed={on} data-active={playing && step === i} onClick={() => onChange({ ...config, rhythm: config.rhythm.map((hit, j) => i === j ? !hit : hit) })}>{BEATS[i]}</button>)}</div>
      <div className={styles.patterns}><button onClick={() => onChange({ ...config, rhythm: [true, false, true, false, true, false, true, false] })}>On the beat</button><button onClick={() => onChange({ ...config, rhythm: [false, true, false, true, false, true, false, true] })}>Off the beat</button></div>
      <button className={styles.listen} onClick={() => onToggle("beatOn")}>{config.beatOn && playing ? "Let the person rest" : "Keep time with me"} <span aria-hidden="true">♩</span></button>
      <details className={styles.lesson}><summary>What am I hearing?</summary><p>Numbers mark the main pulse. The & spaces sit halfway between them. Accenting these offbeats creates syncopation: hear how the chord leans against the steady foot-tap.</p></details>
    </>}
    {mode === "pond" && <>
      <h1>Ripples in time</h1>
      <p className={styles.activityIntro}>Two ripples share one four-beat loop, taking a different number of trips around the pond.</p>
      <div className={styles.pondRatio}>{config.pond.map((count, i) => <label key={i}><span>{i ? "Rose ripple" : "Gold ripple"}</span><input aria-label={`${i ? "Rose" : "Gold"} ripple count`} type="number" min="2" max="7" value={count} onChange={event => { const n = Number(event.target.value); if (Number.isInteger(n) && n >= 2 && n <= 7) onChange({ ...config, pond: i ? [config.pond[0], n] : [n, config.pond[1]] }); }} /></label>)}<span className={styles.ratioColon}>:</span></div>
      <div className={styles.patterns}>{[[2, 3], [3, 4], [5, 4]].map(([a, b]) => <button key={a} aria-pressed={config.pond[0] === a && config.pond[1] === b} onClick={() => onChange({ ...config, pond: [a, b] })}>{a} : {b}</button>)}</div>
      <button className={styles.listen} onClick={() => onToggle("pondOn")}>{config.pondOn && playing ? "Still the pond" : "Let the ripples play"} <span aria-hidden="true">◎</span></button>
      <details className={styles.lesson}><summary>What am I hearing?</summary><p>{config.pond[0] === config.pond[1] ? "Equal counts move in unison. Try different counts to hear two rhythms share a loop." : `Listen for ${config.pond[0]} evenly spaced notes against ${config.pond[1]}. Both rhythms start together at the loop boundary. Some ratios meet inside the loop too.`}</p></details>
    </>}
    {mode === "home" && <>
      <h1>A place to return</h1>
      <p className={styles.activityIntro}>Golden rings mark your home chord. Hear a phrase wander away, then choose its ending.</p>
      <label className={styles.homeSelect}>Your musical home<select value={config.home} onChange={event => onChange(normalizeMelody({ ...config, home: event.target.value as HomeKey }))}>{Object.entries(HOMES).map(([key, home]) => <option key={key} value={key}>{home.name}</option>)}</select></label>
      <ol className={styles.cadencePath} aria-label="Guided phrase">{cadence(config.home, "return").map((chord, i) => <li key={i} aria-current={playing && phrase && bar === i ? "step" : undefined}><span>{config.home === "Am" ? ["i", "iv", "V", "i"][i] : ["I", "IV", "V", "I"][i]}</span>{describe(chord).short}</li>)}</ol>
      <p className={styles.soundingChord} aria-live="polite">Now: {currentChord}</p>
      <div className={styles.phraseButtons}><button onClick={() => onPhrase("return")} aria-pressed={playing && phrase === "return"}>Come home <span>↩</span></button><button onClick={() => onPhrase("away")} aria-pressed={playing && phrase === "away"}>Stop away <span>↗</span></button></div>
      {playing && phrase && <button className={styles.stopPhrase} onClick={onStop}>□ Stop the phrase</button>}
      <details className={styles.lesson}><summary>What am I hearing?</summary><p>Compare ending on V with returning to {config.home === "Am" ? "i" : "I"}. The same chord has a different role depending on the home you hear around it.{config.home === "Am" ? " E major uses G♯, the raised seventh of A minor, to lead back to A. G♯ shares a piano key with the stone labeled A♭." : ""}</p></details>
    </>}
    {tempo}
    {mode !== "home" && <div className={styles.activePlayers} aria-label="Playing together"><span data-on={config.melodyOn && playing}>ʚɞ</span><span data-on={config.beatOn && playing}>♩</span><span data-on={config.pondOn && playing}>◎</span><span>{playing ? "Playing together" : enabled ? "Ready to play" : "A quiet garden"}</span></div>}
  </div>;
}
