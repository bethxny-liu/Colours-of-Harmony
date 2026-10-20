# Garden Fold

A cozy 3D instrument for wandering between chords. Three notes grow in a miniature garden. Fold their triangle over an edge: two notes stay rooted, and one finds a new home.

## Play

```bash
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Choose a pale neighboring triangle, or use one of the three chord buttons. Drag to look around, hear the current chord, and play back the path you have made. Sound begins on your first musical interaction; the sound toggle also supports quiet exploration. Reset returns to C major.

The garden is centered in the full viewport, with chord information and controls in a compact floating side panel. On smaller screens, tap the chord button to open the panel; choosing a fold closes it so you can watch the garden change. A short introduction appears on your first visit, and the ? button reopens it anytime.

The garden has 22 reachable triangles. Its boundary is deliberate: unavailable folds say “garden edge,” and the other directions remain available. All folds can be reversed. A walk retains the latest 32 chords.

## Four little instruments

The five small buttons at the top of the panel open chords, butterfly melody, bench rhythm, pond polyrhythms, and musical home. The garden objects themselves are clickable too.

- **Butterfly:** edit eight half-beat landings, including rests. Start with the home key’s pentatonic scale or open its full major/natural-minor scale. Focus a landing and tap a note flower to fill it; the next landing is then selected. The butterfly lands when its note sounds and travels toward the next note between onsets.
- **Bench rhythm:** open ♩ to start or stop the four-beat foot-tap. Eight stepping stones choose the chord’s eighth-note onsets. The onbeat and offbeat presets make syncopation easy to compare.
- **Pond:** choose two counts from 2 through 7. Each ripple completes that many revolutions and sounds that many notes during the same four-beat bar. Presets include 2:3, 3:4, and 5:4. Equal counts demonstrate unison.
- **Musical home:** choose C major, G major, or A minor. Golden rings mark the home chord. Compare a four-bar I–IV–V–I phrase with a three-bar version that stops on V. The minor phrase uses i–iv–V–i, including the raised seventh in its major dominant. These guided comparisons stop at their chosen ending.

Melody, foot-tap, and pond can play together at a shared tempo. A recorded chord walk supplies the accompaniment, one chord per bar. The main play control loops the garden; “Play my walk” plays the recorded progression once. Editing a sequence, ratio, or tempo restarts the loop for a repeatable comparison. Switching away from a guided home comparison stops that comparison.

All sound uses scheduled Web Audio events. Animation observes the audible audio timeline instead of firing notes from animation frames. Stopping, resetting, or hiding the page cancels the transport and scheduled voices. Reduced motion keeps the butterfly and pond markers at their note/beat positions with no continuous flight, orbiting, or foot movement.

## A bench session

Hover over the guitarist to find a small **Benchside ballad** game card; click the card, the person, or the guitar button in the toolbar to move in. The game uses a wooden music stand with tune cards, colored guitar-pick notes, matching targets, and four flowers that bloom as you catch notes. A single bar of melody notation follows the tune above the strings, highlighting the current note; “Hide music” folds it away before playing. The staff uses the actual concert pitches and quarter/eighth-note rhythms, including G major’s key signature. The garden rests while you play an original eight-bar tune: press the four arrow keys, or tap their circles, as the notes arrive. Each direction keeps the same pitch in your chosen musical home. Successful hits pluck the melody over a picked guitar accompaniment and move the visitor’s strumming hand. The smaller guitar rests close to the lap; both arms have fixed lengths and shoulder anchors embedded in the sweater.

**Sunlit stroll** introduces quarter notes at 84 BPM; **Little offbeats** adds eighth-note offbeats at 96 BPM. A four-beat count-in precedes each attempt. Timing feedback distinguishes close hits (within 75 ms) from good hits (within 180 ms), and the result shows notes caught, best streak, and a timing score. Wrong or extra presses break the streak. Holding a key never catches additional notes.

Pause, switching tabs, or losing window focus freezes the song and cancels its scheduled audio. Resuming gives another four-beat count-in. Escape or “Back to the garden” closes the session, stops its sound, and restores the previous garden camera. Reduced motion skips the camera sweep and keeps note cues still, lighting their targets on time. Guitar tones are synthesized locally with no samples or additional dependencies.

## The musical rule

Notes sit on an equilateral Tonnetz lattice. Its two coordinate directions move by a perfect fifth and a major third. Every triangular face contains a major or minor triad. Reflecting across an edge performs a parallel, relative, or leading-tone transformation. Exactly two pitch classes stay unchanged, and their sounding pitches stay in the same register. The changed voice takes its nearest available pitch.

This is an equal-tempered instrument. Colors and flowers identify visual elements; they do not claim that a chord has a universal emotional meaning. The short felt-bell voice is synthesized locally with the Web Audio API, with no downloaded samples.

## Art direction and references

The scene is a fixed, hand-arranged diorama made with Three.js geometry: clay note stones, a grassy island, flowering plants, a bench with a seated visitor, and a small pond. The triangle folds around its actual shared 3D edge. Rendering settles when the garden is idle; device pixel ratio is capped, and reduced-motion preferences remove the folding sweep while preserving the musical interaction. All essential actions are available through ordinary keyboard-accessible buttons, including when WebGL is unavailable.

References informed the interaction and material direction; their source code and assets are not included:

- [Chrome Music Lab](https://musiclab.chromeexperiments.com/): hands-on melody and rhythm experiments.
- [Web Audio scheduling and visualization clock](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime): timing reference for the shared transport.
- [Musical Garden — Elias Jarzombek](https://github.com/ejarzo/musical-garden): gardening gestures shape a musical space.
- [The Endless Glass Xylophone — Sujen Phea](https://github.com/Sujenphea/xylophone), and its [August 2026 process article](https://tympanus.net/codrops/2026/08/04/building-an-endless-interactive-glass-xylophone-with-three-js/): tactile materials, a visible response coupled to a musical event, idle rendering, and device-aware rendering costs.
- [Garden Anomaly — Frank Reitberger, August 2026](https://tympanus.net/codrops/2026/08/06/garden-anomaly-a-tiny-webgpu-and-tsl-experiment/): a small self-contained 3D scene with direct relationships between interaction, motion, and sound.
- [From Schritte and Wechsel to Coxeter Groups](https://arxiv.org/abs/1901.05106): PLR transformations as reflections across Tonnetz triangle edges.

## Development

The active experience is in `src/components/garden/`; its independent music and audio modules are in `src/lib/garden/`. The entry point is `src/app/page.tsx`.

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

The garden check exhaustively visits the reachable lattice and verifies common notes, reversible folds, reflection geometry, and voice leading. The ensemble check covers all three homes, scales and rests, all 36 supported pond ratios, offbeat chord onsets, audio-clock frames, and finite cadence endings. The guitar check covers both tunes in all three homes, timing windows, notation pitches and durations, output latency, pause/resume, replay, fixed arm lengths, shoulder/elbow/wrist connections, and hand clearance across the full strum. The production build fetches Google Fonts.
