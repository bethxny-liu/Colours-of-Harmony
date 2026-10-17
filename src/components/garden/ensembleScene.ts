import * as THREE from "three";
import { BEATS, DEFAULT_ENSEMBLE, HOMES, QUIET_FRAME, center, homeFold, type Ensemble, type GardenMode, type PerformanceFrame } from "@/lib/garden/ensemble";
import { describe, position, type Fold, type Seed } from "@/lib/garden/music";

export type GardenAction = { kind: "melody" | "beat" | "pond" | "home" } | { kind: "flower"; seed: Seed } | { kind: "stone"; index: number };
export type GardenPerformance = { config: Ensemble; mode: GardenMode; readFrame: () => PerformanceFrame };

/** Scene objects are instruments, and every moving accent observes the same audio clock. */
export function addEnsembleScene(scene: THREE.Scene, visitor: THREE.Group, feet: THREE.Mesh[], pond: THREE.Mesh) {
  let performance: GardenPerformance = { config: DEFAULT_ENSEMBLE, mode: "chords", readFrame: () => QUIET_FRAME };
  const makeMaterial = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: .85 });
  const rose = makeMaterial("#d9a2a0"), cream = makeMaterial("#f4dfb1"), dark = makeMaterial("#807459");
  const moss = makeMaterial("#c5cbae"), gold = makeMaterial("#e2c584");
  const textures: THREE.Texture[] = [];
  function ellipsoid(parent: THREE.Object3D, mat: THREE.Material, p: number[], s: number[]) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mat);
    mesh.position.set(p[0], p[1], p[2]); mesh.scale.set(s[0], s[1], s[2]);
    mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  const butterfly = new THREE.Group(); scene.add(butterfly);
  butterfly.userData.action = { kind: "melody" };
  const wings: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Group(); butterfly.add(wing); wings.push(wing);
    ellipsoid(wing, rose, [side * .12, 0, -.035], [.155, .026, .13]);
    ellipsoid(wing, cream, [side * .085, -.008, .105], [.11, .022, .095]);
    ellipsoid(wing, gold, [side * .12, .022, -.05], [.05, .012, .05]);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, .11, 6), dark);
    antenna.position.set(side * .025, .035, -.14); antenna.rotation.x = -.6; antenna.rotation.z = -side * .35; butterfly.add(antenna);
  }
  ellipsoid(butterfly, dark, [0, 0, 0], [.022, .026, .13]);
  butterfly.position.set(-.95, .94, -3.45);

  const pondOrbits = new THREE.Group(); pondOrbits.position.set(2.92, .12, -1.9); pondOrbits.scale.z = .7;
  pondOrbits.userData.action = { kind: "pond" }; pond.userData.action = { kind: "pond" };
  scene.add(pondOrbits);
  const dots: THREE.Mesh[] = [], ripples: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(i ? .7 : .43, .012, 6, 64), i ? rose : cream);
    ring.rotation.x = Math.PI / 2; pondOrbits.add(ring);
    dots.push(ellipsoid(pondOrbits, i ? rose : gold, [0, .04, 0], [.065, .055, .065]));
    const ripple = new THREE.Mesh(new THREE.TorusGeometry(.13, .008, 6, 36), new THREE.MeshBasicMaterial({ color: i ? "#bd8586" : "#f1dfb3", transparent: true, opacity: .5 }));
    ripple.rotation.x = Math.PI / 2; pondOrbits.add(ripple); ripples.push(ripple);
  }

  const lantern = new THREE.Group(); lantern.userData.action = { kind: "home" }; scene.add(lantern);
  const metal = makeMaterial("#9b8259");
  const glow = new THREE.MeshStandardMaterial({ color: "#f8dda2", emissive: "#efb457", emissiveIntensity: .65, roughness: .55 });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(.17, .23, .17), glow); lamp.position.y = .25; lantern.add(lamp);
  for (const x of [-.105, .105]) for (const z of [-.105, .105]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, .29, 6), metal);
    post.position.set(x, .25, z); lantern.add(post);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(.2, .13, 4), metal);
  roof.position.y = .44; roof.rotation.y = Math.PI / 4; roof.castShadow = true; lantern.add(roof);
  const base = new THREE.Mesh(new THREE.BoxGeometry(.25, .05, .25), metal); base.position.y = .1; lantern.add(base);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.065, .012, 6, 20), metal); handle.position.y = .53; lantern.add(handle);
  const light = new THREE.PointLight("#f5c779", .8, 1.4); light.position.y = .3; lantern.add(light);
  const homeRings = new THREE.Group(); scene.add(homeRings);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.285, .012, 6, 36), gold);
    ring.rotation.x = Math.PI / 2; homeRings.add(ring);
  }

  const stones = new THREE.Group(); scene.add(stones);
  for (let i = 0; i < 8; i++) {
    const stone = new THREE.Group(); stone.position.set((i - 3.5) * .36, .08, 3.65);
    stone.userData.action = { kind: "stone", index: i }; stones.add(stone);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.145, .16, .075, 24), moss);
    body.castShadow = true; body.receiveShadow = true; stone.add(body);
    const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#5c6b4c"; ctx.font = "32px Georgia"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(BEATS[i], 32, 35);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(.2, .2), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
    label.rotation.x = -Math.PI / 2; label.position.y = .042; stone.add(label);
  }
  visitor.userData.action = { kind: "beat" };
  const interactive = [butterfly, visitor, pond, pondOrbits, lantern, stones];
  function action(ray: THREE.Raycaster): { action: GardenAction; distance: number } | null {
    for (const hit of ray.intersectObjects(interactive, true)) {
      let object: THREE.Object3D | null = hit.object;
      while (object && !object.userData.action) object = object.parent;
      if (object?.userData.action) return { action: object.userData.action, distance: hit.distance };
    }
    return null;
  }
  function update(next: GardenPerformance) {
    performance = next;
    const home = homeFold(next.config.home), p = center(home);
    lantern.position.set(p.x - .45, .035, p.z + .35);
    homeRings.children.forEach((ring, i) => { const p = position(home[i]); ring.position.set(p.x, .075, p.z); });
    stones.children.forEach((stone, i) => { ((stone.children[0] as THREE.Mesh).material) = next.config.rhythm[i] ? gold : moss; });
    stones.visible = next.mode === "beat" || next.config.beatOn;
  }
  function tick(frame: PerformanceFrame, now: number, reduced: boolean, fold: Fold) {
    const config = performance.config;
    const flying = frame.running && config.melodyOn;
    if (flying) {
      const fromSeed = frame.landing ?? frame.previous;
      const toSeed = frame.next ?? fromSeed;
      if (fromSeed && toSeed) {
        const from = position(fromSeed), to = position(toSeed);
        const t = reduced ? 0 : frame.flight * frame.flight * (3 - 2 * frame.flight);
        butterfly.position.set(THREE.MathUtils.lerp(from.x, to.x, t), .69 + (reduced ? 0 : Math.sin(Math.PI * t) * .45), THREE.MathUtils.lerp(from.z, to.z, t));
        if (!reduced && (from.x !== to.x || from.z !== to.z)) butterfly.rotation.y = Math.atan2(to.x - from.x, to.z - from.z) + Math.PI;
      }
    } else { butterfly.position.set(-.95, .94, -3.45); butterfly.rotation.y = .4; }
    wings.forEach((wing, i) => { wing.rotation.z = (i ? -1 : 1) * (flying && !reduced ? .35 + Math.sin(now * .035) * .65 : .45); });
    feet.forEach((foot, i) => { foot.rotation.x = reduced ? 0 : frame.beatPulse * .24 * (i ? .4 : 1); foot.position.y = .075 + (reduced ? 0 : frame.beatPulse * .035 * (i ? .4 : 1)); });
    dots.forEach((dot, i) => {
      const angle = reduced ? -Math.PI / 2 + i * Math.PI : frame.pondPhase[i] * Math.PI * 2 - Math.PI / 2;
      const radius = i ? .7 : .43;
      dot.position.set(Math.cos(angle) * radius, .04 + (reduced ? 0 : frame.pondPulse[i] * .045), Math.sin(angle) * radius);
      ripples[i].position.copy(dot.position); ripples[i].position.y = .015;
      ripples[i].scale.setScalar(reduced ? 1 : 1 + (1 - frame.pondPulse[i]) * 1.8);
      (ripples[i].material as THREE.MeshBasicMaterial).opacity = config.pondOn && frame.running ? frame.pondPulse[i] * .65 : 0;
    });
    const chord = describe(fold), home = HOMES[config.home];
    const returned = chord.root === home.root && chord.quality === (home.minor ? "minor" : "major");
    glow.emissiveIntensity = returned ? .9 : .25; light.intensity = returned ? 1 : .25;
    stones.children.forEach((stone, i) => { stone.position.y = .08 + (frame.running && frame.step === i && !reduced ? .025 : 0); });
  }
  update(performance);
  return { update, tick, action, get performance() { return performance; }, dispose() { textures.forEach(texture => texture.dispose()); } };
}
