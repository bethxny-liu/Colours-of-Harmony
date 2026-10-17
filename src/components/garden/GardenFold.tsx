"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GardenAudio } from "@/lib/garden/audio";
import { HOME, describe, neighbors, noteName, voice, type Fold } from "@/lib/garden/music";
import type { createGarden } from "./createGarden";
import styles from "./garden.module.css";
import { GardenActivities, GARDEN_MODES } from "./GardenActivities";
import { DEFAULT_ENSEMBLE, GardenTransport, QUIET_FRAME, cadence, homeFold, offsetForFlower, type Ensemble, type GardenMode, type PerformanceFrame, type Phrase } from "@/lib/garden/ensemble";
import type { GardenAction } from "./ensembleScene";

function Leaf() {
  return <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 27V15M16 20C5 21 3 13 4 7c8-1 13 3 12 13ZM16 16C15 7 21 3 28 4c1 8-4 13-12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function SoundIcon({ muted }: { muted: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m11 5-5 4H3v6h3l5 4V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />{muted?<path d="m16 9 6 6m0-6-6 6" stroke="currentColor" strokeWidth="1.5"/>:<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>}</svg>;
}

export function GardenFold() {
  const [config, setConfig] = useState<Ensemble>(DEFAULT_ENSEMBLE);
  const [mode, setMode] = useState<GardenMode>("chords");
  const [playing, setPlaying] = useState(false);
  const [bar, setBar] = useState(0);
  const [playhead, setPlayhead] = useState(-1);
  const [editSlot, setEditSlot] = useState(0);
  const [phrase, setPhrase] = useState<Phrase>(null);
  const transport = useRef<GardenTransport | null>(null);
  const gardenAction = useRef<(action: GardenAction) => void>(() => {});
  const performanceStep = useRef<(frame: PerformanceFrame, fold: Fold) => void>(() => {});
  const [fold, setFold] = useState<Fold>(HOME);
  const [trail, setTrail] = useState<Fold[]>([HOME]);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [sceneStatus, setSceneStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [audioError, setAudioError] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const instructions = useRef<HTMLDialogElement>(null);
  const [pulse, setPulse] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createGarden> | null>(null);
  const audio = useRef<GardenAudio | null>(null);
  const voicing = useRef([60, 67, 64]);
  const locked = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const generation = useRef(0);
  const replayFlag = useRef(false);
  const cursor = useRef(0);
  const foldAction = useRef<(index: number) => void>(() => {});
  const chord = describe(fold);
  const choices = neighbors(fold);
  const selectedChoice = highlighted === null ? null : choices[highlighted];

  const stop = useCallback(() => {
    generation.current++;
    timers.current.forEach(clearTimeout);
    timers.current=[];
    transport.current?.stop();
    audio.current?.stop();
    setPlaying(false);setPlayhead(-1);setPhrase(null);
    replayFlag.current=false;
    locked.current=false;
    setReplaying(false);
    setBusy(false);
  }, []);

  useEffect(() => {
    let cancelled=false;
    const invalidate = () => { generation.current++; };
    audio.current=new GardenAudio();
    transport.current=new GardenTransport(audio.current, (frame, nextFold) => performanceStep.current(frame, nextFold), () => {
      setPlaying(false);setReplaying(false);setPlayhead(-1);replayFlag.current=false;
    });
    import("./createGarden").then(({createGarden})=> {
      if(cancelled || !host.current)return;
      try {
        scene.current=createGarden(host.current,{
          onFold:index=>foldAction.current(index),
          onHover:setHighlighted,
          onAction:action=>gardenAction.current(action),
        });
        setSceneStatus("ready");
      } catch (error) {
        console.warn("The garden could not open its 3D view:",error);
        setSceneStatus("unavailable");
      }
    }).catch(()=>{if(!cancelled)setSceneStatus("unavailable");});
    return ()=> {
      cancelled=true;invalidate();
      timers.current.forEach(clearTimeout);
      scene.current?.dispose();scene.current=null;
      transport.current?.dispose();transport.current=null;
      audio.current?.dispose();audio.current=null;
    };
  },[]);

  useEffect(()=>{scene.current?.update({fold,trail:phrase ? cadence(config.home,phrase) : trail,highlighted,pulse});},[fold,trail,highlighted,pulse,sceneStatus,phrase,config.home]);
  useEffect(() => {
    scene.current?.setPerformance({config,mode,readFrame:()=>transport.current?.frame() ?? QUIET_FRAME});
  },[config,mode,playing,sceneStatus]);
  useEffect(() => {
    if (!playing) return;
    transport.current?.start(config,trail,phrase,replaying);
    return () => transport.current?.stop();
  },[playing,config,trail,phrase,replaying]);
  useEffect(() => {
    performanceStep.current=(frame,nextFold)=> {
      setBar(frame.bar);setPlayhead(frame.step);setFold(nextFold);voicing.current=voice(nextFold,voicing.current);
      if(!phrase)cursor.current=frame.bar%trail.length;
    };
  });
  useEffect(()=>{audio.current?.setMuted(muted);},[muted]);
  useEffect(()=> {
    const hide=()=>{if(document.hidden)stop();};
    document.addEventListener("visibilitychange",hide);
    return ()=>document.removeEventListener("visibilitychange",hide);
  },[stop]);

  useEffect(() => {
    let visited = false;
    try { visited = localStorage.getItem("garden-fold:visited") === "yes"; } catch { /* Instructions still work without storage. */ }
    if (!visited) instructions.current?.showModal();
  }, []);

  const rememberVisit = () => {
    try { localStorage.setItem("garden-fold:visited", "yes"); } catch { /* Storage is optional. */ }
  };

  const unlock = async () => {
    try { await audio.current?.unlock();setAudioError(false);return true; }
    catch {setAudioError(true);return false;}
  };

  const go = async (next: Fold, record: boolean) => {
    if(locked.current)return;
    locked.current=true;setBusy(true);
    const id=generation.current;
    const ready=await unlock();
    if(id!==generation.current)return;
    const notes=voice(next,voicing.current);
    voicing.current=notes;
    setFold(next);setHighlighted(null);
    if(record) {
      const same = trail[cursor.current]?.every((seed, i) => seed.a === fold[i].a && seed.b === fold[i].b);
      const nextTrail=[...(same ? trail.slice(0,cursor.current+1) : [fold]),next].slice(-32);
      cursor.current=nextTrail.length-1;
      setTrail(nextTrail);
    }
    const delay=window.matchMedia("(prefers-reduced-motion: reduce)").matches?30:760;
    timers.current.push(setTimeout(()=> {
      if(id!==generation.current)return;
      if(ready)audio.current?.chord(notes);
      setPulse(p=>p+1);locked.current=false;setBusy(false);
    },delay));
  };

  const choose = (index: number) => {
    const choice=choices[index];
    if(!choice?.allowed || replayFlag.current || locked.current)return;
    if (window.matchMedia("(max-width: 1100px)").matches) setPanelOpen(false);
    if (playing) stop();
    void go(choice.next,true);
  };
  useEffect(()=>{foldAction.current=choose;});

  const listen = async () => {
    if(locked.current || replayFlag.current)return;
    if (playing) stop();
    const id=generation.current;
    const ready=await unlock();
    if(id!==generation.current)return;
    if(ready)audio.current?.chord(voicing.current);
    setPulse(p=>p+1);
  };

  const startPerformance = async (nextConfig: Ensemble = config, nextPhrase: Phrase = null, walk = false) => {
    stop();
    const id=generation.current;
    if (!await unlock() || id!==generation.current) return;
    if (window.matchMedia("(max-width: 1100px)").matches) setPanelOpen(false);
    setBar(0);setConfig(nextConfig);setPhrase(nextPhrase);setPlaying(true);setReplaying(walk);replayFlag.current=walk;
  };

  const toggleFeature = (feature: "melodyOn" | "beatOn" | "pondOn") => {
    const next={...config,[feature]:!(config[feature] && playing)};
    if (next.melodyOn || next.beatOn || next.pondOn) void startPerformance(next);
    else {stop();setConfig(next);}
  };

  const changeConfig = (next: Ensemble) => {
    if (next.home !== config.home) {
      stop();const home=homeFold(next.home);setFold(home);setTrail([home]);cursor.current=0;voicing.current=voice(home);
    }
    setConfig(next);
  };

  const openMode = (next: GardenMode) => { if(phrase && next!=="home")stop();setMode(next);setPanelOpen(true); };
  useEffect(() => {
    gardenAction.current=action=> {
      if (action.kind === "flower") {
        const offset=offsetForFlower(action.seed,config);
        if(offset===null)return;
        setConfig({...config,melody:config.melody.map((note,i)=>i===editSlot?offset:note)});
        setEditSlot((editSlot+1)%8);
        const id=generation.current;
        void unlock().then(ready=>{if(ready && id===generation.current)audio.current?.noteAt(72+({C:0,G:7,Am:9}[config.home])+offset,audio.current.now,.7,.5);});
      } else if(action.kind === "stone") {
        setConfig({...config,rhythm:config.rhythm.map((hit,i)=>i===action.index?!hit:hit)});
      } else {
        openMode(action.kind);
        if(action.kind === "beat")toggleFeature("beatOn");
        if(action.kind === "pond")toggleFeature("pondOn");
      }
    };
  });

  const replay = async () => {
    if(replayFlag.current){stop();return;}
    if(locked.current || trail.length<2)return;
    await startPerformance({...config,beatOn:true},null,true);
  };

  const reset = () => {
    stop();cursor.current=0;voicing.current=[60,67,64];setFold(HOME);setTrail([HOME]);setHighlighted(null);
    setConfig(DEFAULT_ENSEMBLE);setEditSlot(0);
  };

  return (
    <main className={styles.garden} aria-label="Interactive musical garden">
      <a href="#fold-controls" className={styles.skip} onClick={event => {
        event.preventDefault();
        setPanelOpen(true);
        requestAnimationFrame(() => document.getElementById("fold-controls")?.focus());
      }}>Skip to chord controls</a>
      <section className={styles.stage} aria-label="Your garden">
        <div className={styles.canvas} ref={host} aria-hidden="true" />
        {sceneStatus === "loading" && <div className={styles.loading} role="status"><Leaf /><span>Finding a sunny spot…</span></div>}
        {sceneStatus === "unavailable" && <div className={styles.fallback} role="status"><Leaf /><p>The 3D garden couldn’t open on this device.<br />You can still explore every chord in the side panel.</p><button onClick={() => setPanelOpen(true)}>Open chord controls</button></div>}
      </section>

      <nav className={styles.tools} aria-label="Garden tools">
        <button aria-label={playing ? "Stop garden" : "Play garden"} aria-pressed={playing} title={playing ? "Stop garden" : "Play garden"} onClick={()=>playing?stop():void startPerformance(config.melodyOn||config.beatOn||config.pondOn?config:{...config,melodyOn:true})}>{playing ? "□" : "▷"}</button>
        <span className={styles.toolDivider} />
        <button aria-label={muted ? "Turn sound on" : "Turn sound off"} aria-pressed={!muted} onClick={() => setMuted(m => !m)} title={muted ? "Sound off" : "Sound on"}><SoundIcon muted={muted} /></button>
        <span className={styles.toolDivider} />
        <button onClick={() => scene.current?.resetView()} aria-label="Reset garden camera" title="Reset view"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        <span className={styles.toolDivider} />
        <button onClick={() => instructions.current?.showModal()} aria-label="How to play" title="How to play">?</button>
      </nav>

      <button className={styles.panelToggle} aria-expanded={panelOpen} aria-controls="fold-controls" aria-label={panelOpen ? "Close chord panel" : `Open chord panel. ${chord.name}`} onClick={() => setPanelOpen(open => !open)}>
        <span className={styles.toggleFlower} aria-hidden="true">✿</span><span>{chord.name}</span><span className={styles.toggleArrow} aria-hidden="true">{panelOpen ? "×" : "↗"}</span>
      </button>

      <aside className={styles.panel} id="fold-controls" data-open={panelOpen} aria-label="Chord info and controls" tabIndex={-1}>
        <nav className={styles.gardenTabs} aria-label="Garden instruments">{GARDEN_MODES.map(item=><button key={item.id} aria-label={item.label} aria-pressed={mode===item.id} title={item.label} onClick={()=>openMode(item.id)}>{item.icon}</button>)}</nav>
        {mode === "chords" ? <>
        <div className={styles.panelHeader}><span className={styles.smallLabel}>ON THIS LITTLE PATCH</span><span className={styles.panelSun} aria-hidden="true">☼</span></div>
        <div className={styles.currentChord} aria-live="polite">
          <div className={styles.chordFlower} aria-hidden="true"><svg width="65" height="65" viewBox="0 0 70 70" fill="none">{[0, 72, 144, 216, 288].map(angle => <ellipse key={angle} cx="35" cy="20" rx="10" ry="15" transform={`rotate(${angle} 35 35)`} fill="currentColor" />)}<circle cx="35" cy="35" r="8" fill="#faf7e9" /></svg></div>
          <h1>{chord.name}</h1>
          <div className={styles.notes} aria-label={`Notes: ${chord.notes.join(", ")}`}>{chord.notes.map(note => <span key={note}>{note}</span>)}</div>
        </div>
        <button className={styles.listen} disabled={busy || replaying} onClick={() => void listen()}><span aria-hidden="true">▷</span> Hear this chord</button>
        {audioError && <p className={styles.error} role="alert">Sound couldn’t start. Try “Hear this chord” again.</p>}
        <div className={styles.foldControls}>
          <span className={styles.smallLabel}>{replaying ? "LISTENING TO YOUR WALK…" : "TURN A NEW CHORD"}</span>
          <div className={styles.foldButtons}>
            {choices.map(choice => <button key={choice.index} disabled={busy || replaying || !choice.allowed || sceneStatus === "loading"} onClick={() => choose(choice.index)} onMouseEnter={() => setHighlighted(choice.index)} onMouseLeave={() => setHighlighted(null)} onFocus={() => setHighlighted(choice.index)} onBlur={() => setHighlighted(null)} aria-label={`Fold to ${choice.chord.name}. ${noteName(choice.moving)} becomes ${noteName(choice.planted)}.${!choice.allowed ? " At the garden edge." : ""}`}><span className={styles.foldGlyph} aria-hidden="true">◇</span><span><strong>{choice.chord.name}</strong><small>{choice.allowed ? `${noteName(choice.moving)} → ${noteName(choice.planted)}` : "garden edge"}</small></span><span className={styles.foldArrow} aria-hidden="true">↗</span></button>)}
          </div>
          <p className={styles.hint} aria-live="polite">{selectedChoice ? <><strong>{noteName(selectedChoice.moving)} becomes {noteName(selectedChoice.planted)}.</strong> Two notes stay rooted.</> : <>Two notes stay rooted.<br />One finds a new home.</>}</p>
        </div>
        <div className={styles.panelActions}>
          <button disabled={trail.length < 2 || (!replaying && busy)} onClick={() => void replay()}><span aria-hidden="true">{replaying ? "□" : "▷"}</span> {replaying ? "Stop walking" : "Play my walk"}</button>
          <button onClick={reset} aria-label="Start fresh" title="Start fresh"><span aria-hidden="true">↺</span> Reset</button>
        </div>
        </> : <GardenActivities mode={mode} config={config} onChange={changeConfig} bar={bar} currentChord={chord.name} playing={playing} step={playhead} editSlot={editSlot} onEditSlot={setEditSlot} onToggle={toggleFeature} onPhrase={ending=>void startPerformance({...config,beatOn:true},ending)} onStop={stop} phrase={phrase} />}
        {mode !== "chords" && audioError && <p className={styles.error} role="alert">Sound couldn’t start. Try playing again.</p>}
      </aside>

      <dialog className={styles.instructions} ref={instructions} onClose={rememberVisit} aria-labelledby="instructions-title" aria-describedby="instructions-description">
        <button className={styles.closeInstructions} onClick={() => instructions.current?.close()} aria-label="Close instructions">×</button>
        <div className={styles.instructionBloom} aria-hidden="true">✿</div>
        <h2 id="instructions-title">A little way to play.</h2>
        <p id="instructions-description">Three flowers make a chord.<br />Let’s see where it can grow.</p>
        <ol className={styles.steps}>
          <li><span>01</span><p><strong>Pick a pale triangle.</strong> It folds into a new chord. Two notes stay; one changes.</p></li>
          <li><span>02</span><p><strong>Give the butterfly a tune.</strong> Open ʚɞ, then choose eight notes or tap their flowers. A dash leaves a little rest.</p></li>
          <li><span>03</span><p><strong>Bring the garden to life.</strong> Tap the person for a beat, the pond for two rhythms, or the lantern to find a musical home.</p></li>
          <li><span>04</span><p><strong>Look around.</strong> Drag to turn, pinch or scroll to get closer. The ▷ button plays the garden; □ gives everyone a rest.</p></li>
        </ol>
        <button className={styles.startButton} onClick={() => { instructions.current?.close(); void listen(); }}>Let’s wander <span aria-hidden="true">↗</span></button>
        <p className={styles.instructionFootnote}>The ? button is here whenever you need it.</p>
      </dialog>
    </main>
  );
}
