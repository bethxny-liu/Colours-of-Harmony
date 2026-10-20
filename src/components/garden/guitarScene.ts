import * as THREE from "three";

/** An acoustic guitar, built in the same clay proportions as its player. */
export type ArmRig = {
  root: THREE.Group;
  upperLength: number;
  foreLength: number;
  upperArm: THREE.Mesh<THREE.CylinderGeometry>;
  elbow: THREE.Mesh;
  forearm: THREE.Mesh<THREE.CylinderGeometry>;
  hand: THREE.Mesh;
};

export function addGuitar(visitor: THREE.Group, strummingArm: ArmRig, frettingArm: ArmRig) {
  const guitar = new THREE.Group();
  guitar.position.set(-.025, .60, .15);
  guitar.rotation.set(-.08, 0, -.95);
  guitar.scale.setScalar(.8);
  guitar.userData.action = { kind: "guitar" };
  visitor.add(guitar);
  const material = (color: string, roughness = .8) => new THREE.MeshStandardMaterial({ color, roughness });
  const cedar = material("#c58c53"), spruce = material("#efd09a"), walnut = material("#71503d");
  const cream = material("#f8e7bc"), strings = material("#d4c29b", .4), hole = material("#493d2c");
  function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
    const item = new THREE.Mesh(geometry, mat);
    item.position.set(x, y, z); item.castShadow = true; item.receiveShadow = true;
    guitar.add(item); return item;
  }
  const shape = new THREE.Shape();
  shape.moveTo(0, .16);
  shape.bezierCurveTo(.13, .18, .19, .09, .135, .015);
  shape.bezierCurveTo(.105, -.045, .225, -.085, .21, -.22);
  shape.bezierCurveTo(.195, -.405, -.195, -.405, -.21, -.22);
  shape.bezierCurveTo(-.225, -.085, -.105, -.045, -.135, .015);
  shape.bezierCurveTo(-.19, .09, -.13, .18, 0, .16);
  const body = mesh(new THREE.ExtrudeGeometry(shape, { depth: .065, bevelEnabled: true, bevelThickness: .014, bevelSize: .012, bevelSegments: 3, steps: 1, curveSegments: 20 }), cedar, 0, 0, 0);
  const face = mesh(new THREE.ShapeGeometry(shape, 32), spruce, 0, 0, .081);
  face.castShadow = false;
  // The dark sound hole sits in a raised cream rosette.
  mesh(new THREE.CircleGeometry(.063, 40), hole, 0, -.015, .084);
  mesh(new THREE.TorusGeometry(.073, .007, 6, 48), cream, 0, -.015, .087);
  mesh(new THREE.TorusGeometry(.087, .002, 5, 48), walnut, 0, -.015, .086);
  mesh(new THREE.BoxGeometry(.077, .38, .035), walnut, 0, .31, .062);
  mesh(new THREE.BoxGeometry(.107, .16, .045), cedar, 0, .575, .058).rotation.z = -.035;
  mesh(new THREE.BoxGeometry(.145, .035, .016), walnut, 0, -.235, .092);
  mesh(new THREE.BoxGeometry(.07, .009, .008), cream, 0, -.23, .104);
  mesh(new THREE.BoxGeometry(.077, .009, .008), cream, 0, .5, .088);
  for (let fret = 0; fret < 8; fret++) mesh(new THREE.BoxGeometry(.076, .003, .003), strings, 0, .14 + fret * .044, .084);
  for (let i = 0; i < 6; i++) {
    mesh(new THREE.CylinderGeometry(.0014, .0014, .84, 5), strings, (i - 2.5) * .009, .19, .109);
    const peg = mesh(new THREE.SphereGeometry(1, 8, 6), cream, i % 2 ? .071 : -.071, .53 + Math.floor(i / 2) * .044, .06);
    peg.scale.set(.022, .013, .015);
  }
  for (const y of [.228, .36, .448]) mesh(new THREE.CircleGeometry(.008, 10), cream, 0, y, .085);
  const pickguard = mesh(new THREE.SphereGeometry(1, 16, 10), walnut, .095, -.1, .084);
  pickguard.scale.set(.05, .078, .003);
  // A tiny painted flower on the lower bout.
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 2 / 5;
    mesh(new THREE.CircleGeometry(.012, 12), cream, -.087 + Math.cos(angle) * .017, -.255 + Math.sin(angle) * .017, .084);
  }
  mesh(new THREE.CircleGeometry(.008, 12), cedar, -.087, -.255, .085);
  body.name = "Acoustic guitar";
  const wrist = new THREE.Vector3(), elbow = new THREE.Vector3(), direction = new THREE.Vector3();
  const target = new THREE.Vector3(), bend = new THREE.Vector3(), zero = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const strumBend = new THREE.Vector3(-1, -.3, .6), fretBend = new THREE.Vector3(1, -.6, .15);
  function placeBone(bone: THREE.Mesh<THREE.CylinderGeometry>, from: THREE.Vector3, to: THREE.Vector3) {
    direction.subVectors(to, from);
    bone.position.copy(from).add(to).multiplyScalar(.5);
    bone.quaternion.setFromUnitVectors(up, direction.normalize());
  }
  for (const arm of [strummingArm, frettingArm]) {
    arm.upperArm.scale.y = arm.upperLength / arm.upperArm.geometry.parameters.height;
    arm.forearm.scale.y = arm.foreLength / arm.forearm.geometry.parameters.height;
  }
  function poseArm(arm: ArmRig, point: THREE.Vector3, preferredBend: THREE.Vector3) {
    target.copy(point).sub(arm.root.position);
    const distance = Math.min(target.length(), arm.upperLength + arm.foreLength - .0001);
    direction.copy(target).normalize(); target.copy(direction).multiplyScalar(distance);
    const along = (arm.upperLength ** 2 - arm.foreLength ** 2 + distance ** 2) / (2 * distance);
    const height = Math.sqrt(Math.max(0, arm.upperLength ** 2 - along ** 2));
    bend.copy(preferredBend).addScaledVector(direction, -preferredBend.dot(direction)).normalize();
    elbow.copy(direction).multiplyScalar(along).addScaledVector(bend, height);
    arm.elbow.position.copy(elbow); arm.hand.position.copy(target);
    arm.hand.quaternion.copy(guitar.quaternion);
    placeBone(arm.upperArm, zero, elbow);
    placeBone(arm.forearm, elbow, target);
  }
  let lastStrum = -1000;
  return {
    object: guitar,
    strum(now: number) { lastStrum = now; },
    tick(now: number, reduced: boolean, beatPulse: number) {
      const elapsed = now - lastStrum;
      const pulse = elapsed < 420 ? Math.sin(Math.max(0, elapsed) / 420 * Math.PI) : 0;
      guitar.rotation.z = -.95;
      guitar.updateMatrix();
      // Shoulders stay attached to the sweater; two fixed-length links bend to reach each hand.
      // The smaller guitar rests close to the lap, so neither arm needs to stretch forward.
      const stroke = reduced ? 0 : Math.max(pulse, beatPulse * .45);
      wrist.set(.06 - stroke * .12, -.025, .17).applyMatrix4(guitar.matrix);
      poseArm(strummingArm, wrist, strumBend);
      wrist.set(0, .34, .145).applyMatrix4(guitar.matrix);
      poseArm(frettingArm, wrist, fretBend);
    },
  };
}
