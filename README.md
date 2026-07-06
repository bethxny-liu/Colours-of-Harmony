# Colours of Harmony

An interactive tool for exploring chords, not by memorizing rules, but by **adding notes and hearing what changes**.

Built around a simple idea: most harmony isn't just triads. Songs stack extensions, passing tones, and chromatic colour on top of a base chord. This app lets you start from a chord (or a moment in a song), add almost any note, and see how it feels across sound, notation, and geometry.

> **Work in progress.** I'm building this in public and will keep adding songs, theory, and polish over time. Expect rough edges :)



Just for funsies cause visualizing sound is cool. 

## Try it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) and click **Enable piano** so the sampler can load.

## What you can do

### Explore mode

- Click notes on the **Tonnetz lattice** (a 3D harmonic network) or the **piano keyboard**
- Hear chords as **block voicings** on a sampled piano
- Read plain-language **insights**: what each note does, interval clashes inside the chord, mood, and voice-leading motion
- Get **key guesses** and suggested **diatonic chords** to try next (I, IV, V, vi, ii…)

### Learn a Song mode

- Walk through song **parts** step by step (currently: *Amazing Grace*)
- Listen to a plain version vs. a "coloured" version with extra notes
- Load the base chord onto the staff and piano, then experiment with adding the highlighted colour tones yourself

### Three views, one chord


| View        | What it shows                                            |
| ----------- | -------------------------------------------------------- |
| **Staff**   | Notes stacked as a chord, coloured by harmonic role      |
| **Piano**   | Playable keyboard with active and suggested keys         |
| **Tonnetz** | How pitch classes relate in tonal space — drag to rotate |


## How mood & tension work

The app scores harmony using **semitone-based consonance** (not just chord names). A single minor 2nd or tritone inside a chord dominates the mood — because that's what your ear hears first. Labels like *calm*, *uneasy*, and *harsh clash* map to that score.

Hover a note before adding it to preview how much friction it introduces.

## Stack

- **Next.js 16** + React 19 + TypeScript
- **Tonal** for chord detection and theory
- **Tone.js** + Salamander piano samples for audio
- **Zustand** for state
- **Framer Motion** for UI transitions
- **SVG** for the Tonnetz (no WebGL — kept it lightweight on purpose)

## Project layout

```
src/
├── app/              # Next.js entry
├── components/       # UI — lattice, staff, piano, panels
├── lib/
│   ├── audio/        # Tone.js sampler & playback
│   ├── music/        # Theory, scoring, insights, songs, progressions
│   └── visual/       # Tonnetz layout, staff geometry, colours
└── store/            # Zustand harmony state
```

## Roadmap (loose)

- [ ] More songs and guided moments
- [ ] Better slash-chord / inversion handling
- [ ] Export or share a chord voicing
- [ ] Mobile layout pass
- [ ] Deeper "why does this note work here?" copy