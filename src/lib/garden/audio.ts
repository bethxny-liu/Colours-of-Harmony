/** A small, sample-free felt-bell voice. No network requests or autoplay. */
export class GardenAudio {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private voices = new Set<OscillatorNode>();
  private muted = false;

  async unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      const output = this.context.createGain();
      output.gain.value = this.muted ? 0 : 0.65;
      const compressor = this.context.createDynamicsCompressor();
      output.connect(compressor).connect(this.context.destination);
      this.output = output;
    }
    await this.context.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.context && this.output) this.output.gain.setTargetAtTime(muted ? 0 : 0.65, this.context.currentTime, 0.04);
  }

  get now() { return this.context?.currentTime ?? 0; }

  get visualNow() {
    if (!this.context) return 0;
    const stamp = this.context.getOutputTimestamp?.();
    if (typeof stamp?.contextTime !== "number" || typeof stamp.performanceTime !== "number" || stamp.contextTime <= 0) return this.context.currentTime;
    return Math.min(this.context.currentTime, stamp.contextTime + (performance.now() - stamp.performanceTime) / 1000);
  }

  noteAt(midi: number, when: number, strength = 1, duration = 1.8) {
    if (!this.context || !this.output) return;
    const context = this.context;
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    const start = Math.max(when, context.currentTime);
    for (const [ratio, level, decay] of [[1, .19, duration], [2, .045, duration * .48], [3, .012, duration * .22]]) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = frequency * ratio;
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(level * strength, start + .009);
      envelope.gain.exponentialRampToValueAtTime(.0001, start + decay);
      oscillator.connect(envelope).connect(this.output);
      this.voices.add(oscillator);
      oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
      oscillator.start(start); oscillator.stop(start + decay + .04);
    }
  }

  chordAt(midis: number[], when: number, strength = 1) {
    midis.forEach((midi, index) => this.noteAt(midi, when + index * .035, strength, 1.8));
  }

  chord(midis: number[], offset = 0) { this.chordAt(midis, this.now + offset); }

  tapAt(when: number, strong: boolean) {
    if (!this.context || !this.output) return;
    const context = this.context;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const start = Math.max(when, context.currentTime);
    oscillator.frequency.setValueAtTime(strong ? 420 : 610, start);
    oscillator.frequency.exponentialRampToValueAtTime(180, start + .035);
    envelope.gain.setValueAtTime(.12, start);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + .065);
    oscillator.connect(envelope).connect(this.output);
    this.voices.add(oscillator);
    oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(start); oscillator.stop(start + .08);
  }

  stop() {
    for (const oscillator of this.voices) { try { oscillator.stop(); } catch { /* Already ended. */ } }
    this.voices.clear();
  }

  dispose() {
    this.stop();
    void this.context?.close();
    this.context = null;
    this.output = null;
  }
}
