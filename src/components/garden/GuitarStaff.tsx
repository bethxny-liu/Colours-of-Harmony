import { melodyBar, type GuitarChart, type GuitarPhase } from "@/lib/garden/guitar";
import { HOMES, melodyName, type HomeKey } from "@/lib/garden/ensemble";
import styles from "./guitar.module.css";

type Props = { chart: GuitarChart; home: HomeKey; elapsed: number; phase: GuitarPhase };

/** A single readable melody bar, following the same timeline as the arrow lanes. */
export function GuitarStaff({ chart, home, elapsed, phase }: Props) {
  const bar = melodyBar(chart, elapsed);
  const following = phase === "playing" || phase === "paused";
  const noteX = (beat: number) => 83 + (beat - bar.index * 4) * 65;
  const noteY = (step: number) => 56 - step * 4;
  const names = bar.notes.map(note => melodyName((note.midi - 60 - HOMES[home].root + 12) % 12, home));
  return <svg id="guitar-staff" className={styles.staff} viewBox="0 0 360 82" role="img" aria-label={`Melody in ${HOMES[home].name}, bar ${bar.index + 1} of 8: ${names.join(", ")}`}>
    <g className={styles.staffLines}>{[24, 32, 40, 48, 56].map(y => <line key={y} x1="15" y1={y} x2="345" y2={y} />)}<line x1="345" y1="24" x2="345" y2="56" /></g>
    <text x="17" y="61" className={styles.clef}>𝄞</text>
    {home === "G" && <text x="43" y="30" className={styles.keySignature}>♯</text>}
    <g className={styles.meter}><text x="60" y="37">4</text><text x="60" y="53">4</text></g>
    {bar.notes.map((note, i) => {
      const x = noteX(note.beat), y = noteY(note.step), down = note.step >= 4;
      const active = following && note.current;
      const stemX = x + (down ? -5 : 5), stemY = y + (down ? 24 : -24);
      const ledger: number[] = [];
      for (let line = 64; line <= y; line += 8) ledger.push(line);
      for (let line = 16; line >= y; line -= 8) ledger.push(line);
      const next = bar.notes[i + 1], previous = bar.notes[i - 1];
      const pairedBefore = note.duration === .5 && previous?.duration === .5;
      const pairedAfter = note.duration === .5 && next?.duration === .5;
      return <g key={note.id} className={styles.staffNote} data-current={active} data-note={note.id} data-lane={note.lane}>
        {active && <rect className={styles.staffCursor} x={x - 12} y="12" width="24" height="62" rx="10" />}
        {ledger.map(line => <line className={styles.ledger} key={line} x1={x - 9} y1={line} x2={x + 9} y2={line} />)}
        <ellipse cx={x} cy={y} rx="5.5" ry="3.9" transform={`rotate(-18 ${x} ${y})`} fill="currentColor" />
        <line x1={stemX} y1={y} x2={stemX} y2={stemY} stroke="currentColor" strokeWidth="1.3" />
        {pairedAfter && <path d={`M${stemX} ${stemY}H${noteX(next.beat) + (down ? -5 : 5)}`} stroke="currentColor" strokeWidth="3.5" />}
        {note.duration === .5 && !pairedBefore && !pairedAfter && <path d={`M${stemX} ${stemY}q${down ? -11 : 11} ${down ? -6 : 6} 4 ${down ? -14 : 14}`} fill="none" stroke="currentColor" strokeWidth="2" />}
      </g>;
    })}
  </svg>;
}
