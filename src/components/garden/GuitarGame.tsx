"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GardenAudio } from "@/lib/garden/audio";
import { HOMES, melodyName, type HomeKey } from "@/lib/garden/ensemble";
import { EMPTY_GUITAR, GUITAR_LANES, GUITAR_LEVELS, HIT_WINDOW, GuitarSession, guitarChart, type GuitarLevel, type GuitarSnapshot } from "@/lib/garden/guitar";
import { GuitarIcon } from "./GuitarIcon";
import { GuitarStaff } from "./GuitarStaff";
import styles from "./guitar.module.css";

type Props = { home: HomeKey; muted: boolean; onMute: () => void; onStrum: () => void; onClose: () => void };

export function GuitarGame({ home, muted, onMute, onStrum, onClose }: Props) {
  const [level, setLevel] = useState<GuitarLevel>("stroll");
  const [snapshot, setSnapshot] = useState<GuitarSnapshot>(EMPTY_GUITAR);
  const [starting, setStarting] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [showMusic, setShowMusic] = useState(true);
  const chart = useMemo(() => guitarChart(level, HOMES[home].root, HOMES[home].minor), [level, home]);
  const dialog = useRef<HTMLDialogElement>(null);
  const runway = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const noteElements = useRef<(HTMLSpanElement | null)[]>([]);
  const keyElements = useRef<(HTMLButtonElement | null)[]>([]);
  const flashes = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audio = useRef<GardenAudio | null>(null);
  const session = useRef<GuitarSession | null>(null);
  const generation = useRef(0);
  const startingRef = useRef(false);
  const replayButton = useRef<HTMLButtonElement>(null);
  const resumeButton = useRef<HTMLButtonElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const active = snapshot.phase === "playing" || snapshot.phase === "countin";
  const seconds = 60 / chart.bpm;
  const noteOffsets = HOMES[home].minor ? [0, 3, 7, 10] : [0, 4, 7, 9];

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    startButton.current?.focus();
    return () => { element?.close(); };
  }, []);

  useEffect(() => {
    const sound = new GardenAudio(), game = new GuitarSession(chart, sound);
    const flashTimers = flashes.current;
    const keyButtons = keyElements.current;
    const invalidate = () => { generation.current++; };
    audio.current = sound; session.current = game;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduced(preference.matches);
    // Run outside the effect's synchronous setup, including for the initial preference.
    const preferenceFrame = requestAnimationFrame(updatePreference);
    preference.addEventListener("change", updatePreference);
    const shortestGap = chart.notes.reduce((gap, note, i) => i ? Math.min(gap, note.beat - chart.notes[i - 1].beat) : gap, 1) * seconds;
    let frame = 0, lastUI = "", lastBeat = -1;
    const draw = () => {
      game.tick();
      const next = game.snapshot();
      const key = `${next.revision}:${next.count}:${Math.floor(next.elapsed / seconds * 2)}`;
      if (key !== lastUI) { setSnapshot(next); lastUI = key; }
      const strike = (runway.current?.clientHeight ?? 260) - 54;
      const elapsed = next.elapsed - next.lead;
      // Keep consecutive eighth notes far enough apart to read on short screens.
      const travel = preference.matches ? 2.6 : Math.min(2.6, strike * shortestGap / 48);
      const nextInLane = preference.matches ? GUITAR_LANES.map((_, lane) => chart.notes.find(note => note.lane === lane && game.results[note.id] === null)?.id) : [];
      chart.notes.forEach(note => {
        const element = noteElements.current[note.id];
        if (!element) return;
        const delta = note.beat * seconds - elapsed;
        const visible = next.phase !== "ready" && next.phase !== "complete" && game.results[note.id] === null && delta >= -HIT_WINDOW && delta < travel && (!preference.matches || nextInLane[note.lane] === note.id);
        element.style.visibility = visible ? "visible" : "hidden";
        // In reduced motion the next note stays still; its target lights up on time.
        const y = preference.matches ? strike - 74 : (1 - delta / travel) * strike;
        element.style.transform = `translateY(${y}px)`;
        element.dataset.due = String(Math.abs(delta) <= HIT_WINDOW);
      });
      keyElements.current.forEach((element, lane) => {
        if (element) element.dataset.due = String(next.phase === "playing" && chart.notes.some(note => note.lane === lane && game.results[note.id] === null && Math.abs(note.beat * seconds - elapsed) <= HIT_WINDOW));
      });
      if (progress.current) progress.current.style.transform = `scaleX(${Math.min(1, next.elapsed / (chart.beats * seconds))})`;
      const beat = Math.floor(next.elapsed / seconds);
      if (next.phase === "countin") lastBeat = -1;
      if (next.phase === "playing" && beat !== lastBeat) { onStrum(); lastBeat = beat; }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const timer = setInterval(() => game.tick(), 25);
    const pause = () => { generation.current++; startingRef.current = false; setStarting(false); game.pause(); setSnapshot(game.snapshot()); };
    const hide = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", pause);
    return () => {
      invalidate(); clearInterval(timer); cancelAnimationFrame(frame); cancelAnimationFrame(preferenceFrame);
      preference.removeEventListener("change", updatePreference);
      document.removeEventListener("visibilitychange", hide); window.removeEventListener("blur", pause);
      flashTimers.forEach(clearTimeout); keyButtons.forEach(element => { if (element) element.dataset.pressed = "false"; });
      sound.dispose(); session.current = null; audio.current = null;
    };
  }, [chart, seconds, onStrum]);

  useEffect(() => { audio.current?.setMuted(muted); }, [muted, chart]);
  useEffect(() => { if (snapshot.phase === "complete") replayButton.current?.focus(); }, [snapshot.phase]);
  useEffect(() => { if (snapshot.phase === "paused") resumeButton.current?.focus(); }, [snapshot.phase]);

  const start = useCallback(async (resume = false) => {
    const sound = audio.current, game = session.current, id = generation.current;
    if (!sound || !game || startingRef.current) return;
    startingRef.current = true; setStarting(true);
    try {
      await sound.unlock();
      if (id !== generation.current) return;
      game.start(resume); setSnapshot(game.snapshot()); setAudioError(false);
    } catch { if (id === generation.current) setAudioError(true); }
    finally { if (id === generation.current) { startingRef.current = false; setStarting(false); } }
  }, []);

  const press = useCallback((lane: number) => {
    const game = session.current;
    if (!game) return;
    const result = game.hit(lane);
    const element = keyElements.current[lane];
    if (element) {
      clearTimeout(flashes.current[lane]); element.dataset.pressed = "true"; element.dataset.grade = result?.grade ?? "stray";
      flashes.current[lane] = setTimeout(() => { element.dataset.pressed = "false"; }, 130);
    }
    if (result) onStrum();
    setSnapshot(game.snapshot());
  }, [onStrum]);

  const pause = useCallback(() => { session.current?.pause(); if (session.current) setSnapshot(session.current.snapshot()); }, []);
  useEffect(() => {
    const held = new Set<string>();
    const down = (event: KeyboardEvent) => {
      if (event.altKey || event.metaKey || event.ctrlKey || (event.target instanceof HTMLInputElement && event.target.type === "radio")) return;
      const lane = GUITAR_LANES.findIndex(item => item.key === event.key);
      if (lane < 0) return;
      event.preventDefault();
      if (event.repeat || held.has(event.key)) return;
      held.add(event.key); press(lane);
    };
    const up = (event: KeyboardEvent) => { held.delete(event.key); };
    const clear = () => held.clear();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", clear);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", clear); };
  }, [press]);

  return <dialog ref={dialog} className={styles.session} data-music={showMusic} aria-labelledby="guitar-title" aria-describedby="guitar-description" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className={styles.topbar}>
      <button className={styles.back} onClick={onClose}><span aria-hidden="true">↙</span> Back to the garden</button>
      <div className={styles.sessionLabel}><GuitarIcon size={17} /><span>A BENCH SESSION</span></div>
      <button className={styles.sound} onClick={onMute} aria-label={muted ? "Turn guitar sound on" : "Turn guitar sound off"} aria-pressed={!muted}>{muted ? "Sound off" : "Sound on"}<span aria-hidden="true">{muted ? "◌" : "♪"}</span></button>
    </div>
    <div className={styles.layout}>
      <div className={styles.sceneSpace} aria-hidden="true" />
      <section className={styles.sheet} aria-label="Guitar rhythm game">
        <header className={styles.heading}>
          <div><span className={styles.kicker}>A GARDEN RHYTHM GAME</span><h1 id="guitar-title">Benchside ballad</h1></div>
          <span className={styles.stamp} aria-hidden="true"><GuitarIcon size={29} /></span>
        </header>
        <p id="guitar-description" className={styles.description}>{Math.round((chart.beats + 4) * seconds)} seconds of music. Four beats to count you in.</p>
        <fieldset className={styles.tunes} disabled={active || starting}>
          <legend className={styles.srOnly}>Choose a guitar tune</legend>
          {Object.entries(GUITAR_LEVELS).map(([key, value]) => <label key={key} className={styles.tune} data-selected={level === key}>
            <input type="radio" name="guitar-tune" aria-label={value.name} value={key} checked={level === key} onChange={() => setLevel(key as GuitarLevel)} />
            <span className={styles.tuneTitle}>{value.name}<span aria-hidden="true">{level === key ? "●" : "○"}</span></span>
            <span className={styles.tuneDetail}>{key === "stroll" ? "Steady beats" : "Between the beats"}<span>{value.bpm} bpm</span></span>
            <svg viewBox="0 0 120 20" aria-hidden="true"><path d="M4 16h112" stroke="currentColor" strokeOpacity=".2" />{(key === "stroll" ? [12, 40, 68, 96] : [12, 40, 68, 82, 96]).map(x => <g key={x}><ellipse cx={x} cy="13" rx="3" ry="2.4" fill="currentColor" /><path d={`M${x + 2.5} 13V4`} stroke="currentColor" strokeWidth="1.2" /></g>)}</svg>
          </label>)}
        </fieldset>
        <div className={styles.score} aria-label="Session score">
          <span><strong>{snapshot.hits}<small> / {chart.notes.length}</small></strong> notes caught</span>
          <span><strong>{snapshot.combo}<small> in a row</small></strong> your little streak</span>
          <div className={styles.miniGarden} aria-hidden="true">{[1, 2, 3, 4].map(flower => <i key={flower} data-grown={snapshot.hits >= Math.ceil(chart.notes.length * flower / 4)}><span>✿</span></i>)}</div>
        </div>
        <div className={styles.notation}>
          <div className={styles.notationHeader}><span>{showMusic ? `MELODY · BAR ${Math.min(8, Math.floor(snapshot.elapsed / seconds / 4) + 1)} / 8` : "YOUR LITTLE MELODY"}</span><button aria-expanded={showMusic} aria-controls="guitar-staff" disabled={active} onClick={() => setShowMusic(value => !value)}>{showMusic ? "Hide music" : "Show music"}</button></div>
          {showMusic && <GuitarStaff chart={chart} home={home} elapsed={snapshot.elapsed} phase={snapshot.phase} />}
        </div>
        <div className={styles.runway} ref={runway} data-phase={snapshot.phase} data-reduced={reduced}>
          <div className={styles.strings} aria-hidden="true">{GUITAR_LANES.map(lane => <i key={lane.key} />)}</div>
          <div className={styles.frets} aria-hidden="true"><i /><i /><i /></div>
          <div className={styles.targetLine} aria-hidden="true" />
          {snapshot.phase === "ready" && <div className={styles.preview} aria-hidden="true">{GUITAR_LANES.map((lane, i) => <span key={lane.key} className={styles.ghostPick} data-lane={i} style={{ left: `calc(${i * 25 + 12.5}% - 21px)`, top: [12, 33, 4, 23][i] }}>{lane.arrow}</span>)}</div>}
          <div className={styles.notes} aria-hidden="true">{chart.notes.map(note => <span key={note.id} ref={element => { noteElements.current[note.id] = element; }} className={styles.note} data-lane={note.lane} style={{ left: `calc(${note.lane * 25 + 12.5}% - 21px)` }}>{GUITAR_LANES[note.lane].arrow}</span>)}</div>
          <div className={styles.keys} aria-label="Guitar note controls">{GUITAR_LANES.map((lane, i) => <div key={lane.key}><button ref={element => { keyElements.current[i] = element; }} data-lane={i} aria-label={`Play ${melodyName(noteOffsets[i], home)}, ${lane.name} arrow`} onPointerDown={event => { event.preventDefault(); press(i); }} onClick={event => { if (event.detail === 0) press(i); }}>{lane.arrow}</button><span>{melodyName(noteOffsets[i], home)}</span></div>)}</div>
          {(snapshot.phase === "ready" || snapshot.phase === "paused" || snapshot.phase === "complete") && <div className={styles.interlude}>
            {snapshot.phase === "ready" && <>
              <h2>Your turn to strum.</h2>
              <p>Press <strong>← ↓ ↑ →</strong> as each pick meets its circle. Or tap the circles below.</p>
              <button ref={startButton} className={styles.primary} disabled={starting} onClick={() => void start()}>{starting ? "Tuning up…" : "Let’s play"}<span aria-hidden="true">↗</span></button>
            </>}
            {snapshot.phase === "paused" && <>
              <div className={styles.pauseMark} aria-hidden="true">Ⅱ</div><h2>A little breather.</h2><p>Your place is saved. We’ll count you back in.</p>
              <button ref={resumeButton} className={styles.primary} disabled={starting} onClick={() => void start(true)}>{starting ? "Tuning up…" : "Keep playing"}<span aria-hidden="true">▷</span></button>
              <button className={styles.textButton} onClick={() => void start()}>Start the tune again</button>
            </>}
            {snapshot.phase === "complete" && <>
              <div className={styles.bloom} aria-hidden="true">✿</div><h2>{snapshot.accuracy >= 95 ? "In full bloom." : snapshot.accuracy >= 65 ? "Finding your groove." : "Every song starts somewhere."}</h2>
              <div className={styles.results}><span><strong>{snapshot.hits}/{chart.notes.length}</strong>landed</span><span><strong>{snapshot.best}</strong>best streak</span><span><strong>{snapshot.accuracy}%</strong>timing score</span></div>
              <p>{level === "stroll" ? "One note on each beat. Try Little offbeats to explore the spaces between." : "Those little “&” notes between the beats? That’s syncopation."}</p>
              <button ref={replayButton} className={styles.primary} disabled={starting} onClick={() => void start()}>Play it again<span aria-hidden="true">↺</span></button>
            </>}
          </div>}
          {snapshot.phase === "countin" && <div className={styles.countin} aria-live="polite"><span>HERE WE GO</span><strong key={snapshot.count}>{snapshot.count}</strong><small>listen for the beat</small></div>}
        </div>
        <div className={styles.bottom}>
          <div className={styles.pulse} aria-label={`Beat ${snapshot.beat + 1} of 4`}>{[0, 1, 2, 3].map(beat => <i key={beat} data-on={snapshot.phase === "playing" && snapshot.beat === beat}>{beat + 1}</i>)}</div>
          <div className={styles.feedback} role="status" data-kind={active ? snapshot.feedbackKind : "quiet"}><span key={snapshot.revision}>{active ? (snapshot.feedbackKind === "miss" ? "Catch the next one." : snapshot.feedback) : reduced ? "Tap when a circle lights up" : HOMES[home].name}</span></div>
          {active ? <button onClick={pause}>Ⅱ Pause</button> : <span aria-hidden="true">✳</span>}
        </div>
        <div className={styles.progress} role="progressbar" aria-label="Song progress" aria-valuemin={0} aria-valuemax={chart.beats} aria-valuenow={Math.min(chart.beats, Math.floor(snapshot.elapsed / seconds))}><span ref={progress} /></div>
        {audioError && <p className={styles.error} role="alert">Sound couldn’t start. Try the play button again.</p>}
      </section>
    </div>
  </dialog>;
}
