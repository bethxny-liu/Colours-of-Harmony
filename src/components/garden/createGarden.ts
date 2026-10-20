import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HOME, gardenSeeds, neighbors, noteName, position, seedKey, type Fold } from "@/lib/garden/music";
import { offsetForFlower } from "@/lib/garden/ensemble";
import { addEnsembleScene, type GardenAction, type GardenPerformance } from "./ensembleScene";
import { addGuitar, type ArmRig } from "./guitarScene";

type Options = {
  onFold: (index: number) => void;
  onHover: (index: number | null) => void;
  onGuitarHover: (anchor: { x: number; y: number } | null) => void;
  onAction: (action: GardenAction) => void;
};
type GardenUpdate = { fold: Fold; trail: Fold[]; highlighted: number | null; pulse: number };

/** Hand-arranged clay diorama; only the musical lattice follows an algorithm. */
export function createGarden(host: HTMLElement, options: Options) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.setAttribute("aria-label", "A miniature 3D garden. Choose a neighboring triangle to fold your chord, or the visitor’s guitar for a rhythm game.");
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 80);
  camera.position.set(7.5, 10, 12);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = 1.05;
  controls.minAzimuthAngle = -0.8;
  controls.maxAzimuthAngle = 0.9;
  controls.minZoom = 0.85;
  controls.maxZoom = 1.65;
  controls.zoomSpeed = 0.4;
  controls.rotateSpeed = 0.45;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  scene.add(new THREE.HemisphereLight(0xfff5dc, 0x66836e, 2.2));
  const sun = new THREE.DirectionalLight(0xffe6bb, 3.1);
  sun.position.set(-5, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 25 });
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.00015;
  sun.shadow.blurSamples = 12;
  sun.shadow.radius = 3;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdde8ed, 1.8);
  fill.position.set(6, 4, -5);
  scene.add(fill);

  const material = (color: THREE.ColorRepresentation, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
  const moss = material("#a7b98b"), soil = material("#b8906e"), stemMaterial = material("#5c8056");
  const pale = material("#f8e9bd"), pink = material("#d7928b"), lavender = material("#a6a1c4");
  const leaves = [material("#6f9366"), material("#8aa66c"), material("#b0ba7c")];
  function mesh<T extends THREE.BufferGeometry>(geometry: T, mat: THREE.Material, parent: THREE.Object3D = scene) {
    const item = new THREE.Mesh(geometry, mat);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  function ellipsoid(parent: THREE.Object3D, mat: THREE.Material, p: number[], scale: number[]) {
    const item = mesh(new THREE.SphereGeometry(1, 16, 12), mat, parent);
    item.position.set(p[0], p[1], p[2]);
    item.scale.set(scale[0], scale[1], scale[2]);
    return item;
  }
  function rod(parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number, mat: THREE.Material) {
    const delta = to.clone().sub(from);
    const item = mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 10), mat, parent);
    item.position.copy(from).add(to).multiplyScalar(0.5);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return item;
  }
  const ground = mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: "#766a4b", opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.76;
  ground.castShadow = false;
  const island = new THREE.Group();
  scene.add(island);
  const base = mesh(new THREE.CylinderGeometry(4.72, 4.35, 0.55, 80), soil, island);
  base.position.y = -0.36;
  const rim = mesh(new THREE.TorusGeometry(4.57, 0.16, 12, 80), soil, island);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.1;
  const lawn = mesh(new THREE.CylinderGeometry(4.64, 4.67, 0.16, 80), moss, island);
  lawn.position.y = -0.05;
  // A little pond at the back, bordered by hand-placed smooth stones.
  const water = material("#92bbc0", 0.3);
  const pond = mesh(new THREE.CylinderGeometry(0.91, 0.91, 0.045, 48), water);
  pond.position.set(2.92, 0.055, -1.9);
  pond.scale.z = 0.7;
  const stoneMaterial = material("#d1c3a8");
  for (const [x, z, s] of [[2.15,-2.15,.22],[2.43,-2.48,.21],[2.96,-2.55,.25],[3.52,-2.2,.23],[3.77,-1.78,.21],[3.4,-1.35,.25],[2.88,-1.24,.19],[2.38,-1.45,.23]]) {
    ellipsoid(scene, stoneMaterial, [x, 0.12, z], [s, s * 0.65, s * 0.85]);
  }
  const lily = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.018, 24), leaves[0]);
  lily.position.set(3.05, 0.09, -1.85);
  const lilyBloom = ellipsoid(scene, pink, [3.05, 0.13, -1.85], [0.09, 0.06, 0.09]);
  lilyBloom.rotation.y = 0.4;

  // All scenery positions are authored, so every visitor sees the same composition.
  const trees = [[-3.2,-1.75,1.2],[-2.25,-3.0,0.95],[-3.55,-0.4,0.7],[0.75,-3.75,0.68]];
  for (const [x, z, scale] of trees) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    scene.add(tree);
    rod(tree, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 1.05, 0), 0.095, material("#957c55"));
    const crowns = [[0,1.35,0,.56,.7,.48],[-.32,1.12,.04,.39,.47,.4],[.31,1.45,.05,.4,.51,.38],[.05,1.72,-.04,.35,.4,.33]];
    crowns.forEach(([a,b,c,d,e,f], i) => ellipsoid(tree, leaves[i % 3], [a,b,c], [d,e,f]));
  }
  function flower(parent: THREE.Object3D, color: THREE.Material, height: number) {
    rod(parent, new THREE.Vector3(), new THREE.Vector3(0, height, 0), 0.025, stemMaterial);
    const leaf = ellipsoid(parent, leaves[0], [0.09, height * .4, 0], [.15,.04,.07]);
    leaf.rotation.z = 0.4;
    const bloom = new THREE.Group();
    bloom.position.y = height;
    parent.add(bloom);
    for (let p = 0; p < 5; p++) {
      const angle = p * Math.PI * 2 / 5;
      const petal = ellipsoid(bloom, color, [Math.cos(angle) * .09, .005, Math.sin(angle) * .09], [.1,.045,.065]);
      petal.rotation.y = -angle;
    }
    ellipsoid(bloom, material("#d9af57"), [0,.04,0], [.055,.045,.055]);
    return bloom;
  }
  const flowerBeds = [[-2.8,2.65,0],[-3.25,2.05,1],[-3.6,1.5,0],[2.25,3.05,1],[2.7,2.6,0],[3.35,.95,2],[-1.35,-3.75,2]];
  for (const [x,z,c] of flowerBeds) {
    for (let i=0; i<3; i++) {
      const plant = new THREE.Group();
      plant.position.set(x + Math.sin(i*2.4) * .22, .05, z + Math.cos(i*2.4) * .19);
      scene.add(plant);
      flower(plant, [pale,pink,lavender][c], .22 + i * .08);
    }
  }
  // A bench and a terracotta pot give the garden a human scale.
  const wood = material("#bf936c");
  const bench = new THREE.Group();
  bench.position.set(0.0, .05, -3.65);
  bench.rotation.y = -0.15;
  scene.add(bench);
  for (let i=0; i<3; i++) {
    const slat = mesh(new THREE.BoxGeometry(.95,.07,.12), wood, bench);
    slat.position.set(0,.35,(i-1)*.145);
  }
  for (const x of [-.34,.34]) for (const z of [-.14,.14]) {
    const leg = mesh(new THREE.CylinderGeometry(.035,.035,.33,8), wood, bench);
    leg.position.set(x,.16,z);
  }
  // A clay-sized guitarist, with one hand on the frets and one over the sound hole.
  const visitor = new THREE.Group();
  visitor.position.x = -.05;
  bench.add(visitor);
  const skin = material("#d6aa87");
  const sweater = material("#c78269");
  const trousers = material("#748b8d");
  const shoes = material("#75644f");
  const hair = material("#655044");
  ellipsoid(visitor, trousers, [0,.43,.025], [.145,.09,.12]);
  const torso = ellipsoid(visitor, sweater, [0,.64,.005], [.155,.205,.115]);
  torso.rotation.x = .08;
  rod(visitor, new THREE.Vector3(0,.78,.02), new THREE.Vector3(0,.85,.025), .045, skin);
  ellipsoid(visitor, skin, [0,.94,.025], [.12,.135,.115]);
  const haircut = mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * .43), hair, visitor);
  haircut.scale.set(.128,.145,.124);
  haircut.position.set(0,.94,.025);
  haircut.castShadow = false;
  haircut.receiveShadow = false;
  const fringe = ellipsoid(visitor, hair, [-.05,1.035,.095], [.065,.035,.035]);
  fringe.castShadow = false;
  fringe.receiveShadow = false;
  const eyes = material("#4d473a");
  const visitorFeet: THREE.Mesh[] = [];
  const arms: ArmRig[] = [];
  for (const side of [-1,1]) {
    const hip = new THREE.Vector3(side*.075,.43,.06);
    const knee = new THREE.Vector3(side*.085,.35,.25);
    const ankle = new THREE.Vector3(side*.085,.11,.28);
    rod(visitor, hip, knee, .064, trousers);
    ellipsoid(visitor, trousers, knee.toArray(), [.064,.064,.064]);
    rod(visitor, knee, ankle, .052, trousers);
    visitorFeet.push(ellipsoid(visitor, shoes, [side*.085,.075,.32], [.07,.047,.11]));
    const root = new THREE.Group(); root.position.set(side * .112, .735, .035); visitor.add(root);
    ellipsoid(root, sweater, [0, 0, 0], [.062, .065, .059]);
    const upperArm = mesh(new THREE.CylinderGeometry(.046, .046, .19, 12), sweater, root);
    const elbowMesh = ellipsoid(root, sweater, [0, -.19, 0], [.047, .047, .047]);
    const forearm = mesh(new THREE.CylinderGeometry(.038, .041, .205, 12), sweater, root);
    const handMesh = ellipsoid(root, skin, [0, -.3, .05], [.035, .04, .028]);
    arms.push({ root, upperLength: .19, foreLength: .205, upperArm, elbow: elbowMesh, forearm, hand: handMesh });
    ellipsoid(visitor, eyes, [side*.041,.96,.134], [.011,.014,.007]);
  }
  const guitar = addGuitar(visitor, arms[0], arms[1]);
  guitar.tick(0, true, 0);
  const pot = new THREE.Group();
  pot.position.set(-.95,.04,-3.45);
  scene.add(pot);
  mesh(new THREE.CylinderGeometry(.21,.15,.3,20), material("#c98b70"), pot).position.y = .15;
  const potPlant = new THREE.Group();
  potPlant.position.y = .3;
  pot.add(potPlant);
  flower(potPlant,pale,.3);
  // Small grasses: a finite pattern placed along the outer border.
  for (let i=0; i<45; i++) {
    const angle = i * Math.PI * 2 / 45;
    const radius = 3.95 + Math.sin(i*1.7) * .18;
    const clump = new THREE.Group();
    clump.position.set(Math.cos(angle)*radius,.02,Math.sin(angle)*radius);
    scene.add(clump);
    for (let blade=0; blade<3; blade++) {
      const grass = mesh(new THREE.ConeGeometry(.035,.17 + blade*.04,4), leaves[(i+blade)%3],clump);
      grass.position.set((blade-1)*.06,.09,0);
      grass.rotation.z = (blade-1)*.3;
    }
  }

  const noteStones = new Map<string, { group: THREE.Group; bloom: THREE.Group; mat: THREE.MeshStandardMaterial }>();
  const textures: THREE.Texture[] = [];
  const seeds = gardenSeeds();
  const latticeMaterial = new THREE.LineBasicMaterial({ color: "#647d59", transparent: true, opacity: .21 });
  seeds.forEach((seed, index) => {
    const {x,z} = position(seed);
    const group = new THREE.Group();
    group.userData.seed = seed;
    group.position.set(x,.08,z);
    scene.add(group);
    const mat = material("#d8d5b0");
    mesh(new THREE.CylinderGeometry(.22,.25,.1,32),mat,group);
    const canvas = document.createElement("canvas");
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#465b42";
    ctx.font = "500 66px Georgia";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(noteName(seed),64,68);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    const text = mesh(new THREE.PlaneGeometry(.3,.3),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}),group);
    text.rotation.x = -Math.PI/2;
    text.position.y = .056;
    text.castShadow = false;
    const plant = new THREE.Group();
    plant.position.set(0,0,-.1);
    group.add(plant);
    const bloom = flower(plant,[pale,pink,lavender][index%3],.42);
    plant.scale.setScalar(.01);
    noteStones.set(seedKey(seed),{group,bloom:plant,mat});
    seeds.slice(index+1).forEach(other => {
      const p = position(other);
      if (Math.abs(Math.hypot(x-p.x,z-p.z)-1.55) < .01) {
        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,.045,z),new THREE.Vector3(p.x,.045,p.z)]);
        scene.add(new THREE.Line(geometry,latticeMaterial));
      }
    });
    // Keep the flower head as part of the plant's authored geometry.
    bloom.rotation.y = index*.8;
  });
  function face(fold: Fold, color: string, opacity: number, height: number) {
    const vertices = fold.flatMap(seed => { const p=position(seed); return [p.x,height,p.z]; });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
    geometry.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({color,roughness:.85,side:THREE.DoubleSide,transparent:opacity<1,opacity,depthWrite:opacity===1});
    const result = mesh(geometry,mat);
    result.castShadow = opacity === 1;
    result.receiveShadow = false;
    return result;
  }
  const active = face(HOME,"#efd798",1,.11);
  const outlineGeometry = new THREE.BufferGeometry();
  outlineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(9), 3));
  const outlines = new THREE.LineLoop(outlineGeometry,new THREE.LineBasicMaterial({color:"#fff3cf"}));
  scene.add(outlines);
  const choices = new THREE.Group();
  scene.add(choices);
  const history = new THREE.Group();
  scene.add(history);
  const ensemble = addEnsembleScene(scene, visitor, visitorFeet, pond);
  let state: GardenUpdate = {fold:HOME,trail:[HOME],highlighted:null,pulse:0};
  let needsRender = true;
  let animateUntil = performance.now() + 1500;
  let animation: {from:Fold;to:Fold;index:number;start:number} | null = null;
  let pulseStart = -100;
  const activeKeys = new Set(HOME.map(seedKey));
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerDown = {x:0,y:0};
  let hovered: number | null = null;
  type CameraPose = { position: THREE.Vector3; target: THREE.Vector3; zoom: number };
  let guitarFocused = false;
  let savedView: CameraPose | null = null;
  let cameraTween: { from: CameraPose; to: CameraPose; start: number } | null = null;
  let guitaristHovered = false;
  const hintPoint = new THREE.Vector3();
  const updateGuitarHint = () => {
    if (!guitaristHovered || guitarFocused) return;
    visitor.localToWorld(hintPoint.set(0, 1.15, .05)).project(camera);
    options.onGuitarHover({
      x: Math.max(122, Math.min(host.clientWidth - 122, (hintPoint.x + 1) * host.clientWidth / 2)),
      y: Math.max(170, (1 - hintPoint.y) * host.clientHeight / 2 - 12),
    });
  };
  const hideGuitarHint = () => { guitaristHovered = false; options.onGuitarHover(null); };
  const pose = (): CameraPose => ({ position: camera.position.clone(), target: controls.target.clone(), zoom: camera.zoom });
  const guitarPose = (): CameraPose => {
    const mobile = host.clientWidth <= 760;
    const direction = new THREE.Vector3(.7, 1.35, 4.5).normalize();
    const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right).normalize();
    const target = guitar.object.getWorldPosition(new THREE.Vector3());
    // Leave room for the score on the right, or below the guitar on a phone.
    target.addScaledVector(right, mobile ? 0 : .57);
    target.addScaledVector(up, mobile ? -1.38 : -.38);
    return { position: target.clone().addScaledVector(direction, 4.6), target, zoom: (camera.top - camera.bottom) / (2 * (mobile ? 1.7 : .94)) };
  };
  const setGuitarFocus = (enabled: boolean) => {
    if (enabled === guitarFocused) return;
    if (enabled) savedView = pose();
    guitarFocused = enabled;
    hideGuitarHint();
    controls.enabled = false;
    cameraTween = { from: pose(), to: enabled ? guitarPose() : savedView ?? pose(), start: performance.now() };
    needsRender = true;
    animateUntil = performance.now() + 1200;
    renderer.domElement.style.cursor = enabled ? "default" : "grab";
  };

  function clearGroup(group: THREE.Group) {
    for (const object of [...group.children]) {
      if (object instanceof THREE.Mesh) { object.geometry.dispose(); (object.material as THREE.Material).dispose(); }
      group.remove(object);
    }
  }
  function updateChoices() {
    clearGroup(choices);
    neighbors(state.fold).forEach(choice => {
      if (!choice.allowed) return;
      const tile = face(choice.next,"#fff2ce",state.highlighted === choice.index ? .62 : .22,.07);
      scene.remove(tile);
      choices.add(tile);
      tile.userData.foldIndex=choice.index;
    });
  }
  function update(next: GardenUpdate) {
    needsRender = true;
    animateUntil = performance.now() + 1500;
    const changed = next.fold.map(seedKey).join("|") !== state.fold.map(seedKey).join("|");
    if (changed) {
      const index = state.fold.findIndex((seed,i)=>seedKey(seed)!==seedKey(next.fold[i]));
      const count = state.fold.filter((seed,i)=>seedKey(seed)!==seedKey(next.fold[i])).length;
      const adjacent = neighbors(state.fold).some(move => move.next.every((seed, i) => seedKey(seed) === seedKey(next.fold[i])));
      animation = count===1 && adjacent ? {from:state.fold,to:next.fold,index,start:performance.now()} : null;
    }
    if (next.pulse!==state.pulse) pulseStart=performance.now();
    state=next;
    activeKeys.clear(); next.fold.forEach(seed=>activeKeys.add(seedKey(seed)));
    updateChoices();
    clearGroup(history);
    next.trail.slice(-16,-1).forEach((fold,i,all)=> {
      const tile=face(fold,"#d3b182",.13 + i/all.length*.14,.05+i*.0002);
      scene.remove(tile); history.add(tile);
    });
  }
  updateChoices();
  const pick = (event: PointerEvent): GardenAction | { kind: "fold"; index: number } | null => {
    if (guitarFocused || cameraTween) return null;
    const bounds=renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const objectAction = ensemble.action(raycaster);
    if (ensemble.performance.mode === "melody") {
      const hits = raycaster.intersectObjects([...noteStones.values()].map(stone => stone.group), true);
      if (objectAction && (!hits.length || objectAction.distance < hits[0].distance)) return objectAction.action;
      if (hits.length) {
        let object: THREE.Object3D | null = hits[0].object;
        while (object && !object.userData.seed) object = object.parent;
        const seed = object?.userData.seed;
        if (seed && offsetForFlower(seed, ensemble.performance.config) !== null) return { kind: "flower", seed };
      }
      return objectAction?.action ?? null;
    }
    if (objectAction) return objectAction.action;
    const index = raycaster.intersectObjects(choices.children,false)[0]?.object.userData.foldIndex as number | undefined;
    return index === undefined ? null : { kind: "fold", index };
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    if (event.buttons) { hideGuitarHint(); return; }
    const action=pick(event);
    const index=action?.kind === "fold" ? action.index : null;
    if (index!==hovered) {hovered=index;options.onHover(index);}
    renderer.domElement.style.cursor=action===null?"grab":"pointer";
    if (action?.kind === "guitar") { guitaristHovered = true; updateGuitarHint(); }
    else if (guitaristHovered) hideGuitarHint();
  };
  const down = (event: PointerEvent) => {pointerDown={x:event.clientX,y:event.clientY}; hideGuitarHint();};
  const up = (event: PointerEvent) => {
    if (Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)>6) return;
    const action=pick(event);
    if (action?.kind === "fold") { if (!animation) options.onFold(action.index); }
    else if (action) options.onAction(action);
  };
  const leave = () => {hovered=null;options.onHover(null);hideGuitarHint();};
  renderer.domElement.addEventListener("pointermove",move);
  renderer.domElement.addEventListener("pointerdown",down);
  renderer.domElement.addEventListener("pointerup",up);
  renderer.domElement.addEventListener("pointerleave",leave);
  const resize = () => {
    const w=host.clientWidth,h=host.clientHeight;
    if (!w || !h) return;
    const aspect=w/h;
    // Keep the island centered in the viewport; the floating panel takes no layout space.
    const panelClearance = w > 1100 ? 2 * (220 + 24 + 20) : 0;
    const half=Math.max(4.9,5.6/aspect,panelClearance ? 4.9*h/(w-panelClearance) : 0);
    // Balance the taller tree canopy so the whole diorama sits at the screen center.
    camera.left=-half*aspect;camera.right=half*aspect;camera.top=half+.45;camera.bottom=-half+.45;
    camera.updateProjectionMatrix();renderer.setSize(w,h);
    if (guitarFocused) {
      const next = guitarPose(); camera.position.copy(next.position); controls.target.copy(next.target); camera.zoom = next.zoom;
      camera.lookAt(next.target); camera.updateProjectionMatrix(); cameraTween = null;
    }
    needsRender = true;
  };
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  let frame=0;
  let disposed=false;
  function render(now:number) {
    if(disposed)return;
    let cameraMoved = false;
    if (cameraTween) {
      const t = reducedMotion.matches ? 1 : Math.min(1, (now - cameraTween.start) / 950);
      const eased = t * t * (3 - 2 * t);
      camera.position.lerpVectors(cameraTween.from.position, cameraTween.to.position, eased);
      controls.target.lerpVectors(cameraTween.from.target, cameraTween.to.target, eased);
      camera.zoom = THREE.MathUtils.lerp(cameraTween.from.zoom, cameraTween.to.zoom, eased);
      camera.lookAt(controls.target); camera.updateProjectionMatrix(); cameraMoved = true;
      if (t === 1) { cameraTween = null; controls.enabled = !guitarFocused; }
    } else if (!guitarFocused) cameraMoved = controls.update();
    if (cameraMoved && guitaristHovered) updateGuitarHint();
    const performanceFrame = ensemble.performance.readFrame();
    if(document.hidden || (!cameraMoved && !needsRender && !animation && !performanceFrame.running && now > animateUntil)) {
      frame = requestAnimationFrame(render);
      return;
    }
    const points=state.fold.map(seed=>{const p=position(seed);return new THREE.Vector3(p.x,.11,p.z);});
    if(animation) {
      const t=reducedMotion.matches?1:Math.min(1,(now-animation.start)/750);
      const eased=t*t*(3-2*t);
      const fixed=animation.from.filter((_,i)=>i!==animation!.index).map(seed=>{const p=position(seed);return new THREE.Vector3(p.x,.11,p.z);});
      const origin=fixed[0],axis=fixed[1].clone().sub(origin).normalize();
      const p=position(animation.from[animation.index]);
      const relative=new THREE.Vector3(p.x,.11,p.z).sub(origin);
      const sign=new THREE.Vector3().crossVectors(axis,relative).y>0?1:-1;
      points[animation.index]=relative.applyAxisAngle(axis,sign*Math.PI*eased).add(origin);
      if(t===1)animation=null;
    }
    const attribute=active.geometry.getAttribute("position");
    points.forEach((p,i)=>attribute.setXYZ(i,p.x,p.y,p.z));
    attribute.needsUpdate=true;active.geometry.computeVertexNormals();active.geometry.computeBoundingSphere();
    const outlineAttribute = outlines.geometry.getAttribute("position");
    points.forEach((p, i) => outlineAttribute.setXYZ(i, p.x, p.y + .008, p.z));
    outlineAttribute.needsUpdate = true;
    outlines.geometry.computeBoundingSphere();
    const pulse=reducedMotion.matches?0:Math.max(0,1-(now-pulseStart)/1000)*Math.sin((now-pulseStart)/110)*.09;
    noteStones.forEach((stone,key)=> {
      const selected=activeKeys.has(key);
      const seed = stone.group.userData.seed;
      const landing = performanceFrame.running && performanceFrame.landing && seedKey(performanceFrame.landing) === key;
      const melodic = (ensemble.performance.mode === "melody" || ensemble.performance.config.melodyOn) && offsetForFlower(seed, ensemble.performance.config) !== null;
      const target=selected || melodic ? 1 : 0.01;
      stone.bloom.scale.lerp(new THREE.Vector3(target,target,target),reducedMotion.matches?1:.12);
      stone.mat.color.lerp(new THREE.Color(landing && performanceFrame.flight < .4 ? "#e8bd9d" : selected ? "#f4e6b8" : "#c5cca8"),.15);
      stone.group.position.y=.08+(selected?pulse:0)+(landing && !reducedMotion.matches ? Math.max(0,1-performanceFrame.flight*3)*.04 : 0);
    });
    ensemble.tick(performanceFrame, now, reducedMotion.matches);
    guitar.tick(now, reducedMotion.matches, performanceFrame.beatPulse);
    renderer.render(scene,camera);
    needsRender = false;
    frame=requestAnimationFrame(render);
  }
  frame=requestAnimationFrame(render);
  return {
    update,
    setGuitarFocus,
    strum() { guitar.strum(performance.now()); needsRender = true; animateUntil = performance.now() + 500; },
    setPerformance(next: GardenPerformance) { ensemble.update(next); needsRender=true; animateUntil=performance.now()+1500; },
    resetView(){camera.position.set(7.5,10,12);camera.zoom=1;controls.target.set(0,0,0);camera.updateProjectionMatrix();controls.update();needsRender=true;},
    dispose(){
      disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();ensemble.dispose();
      renderer.domElement.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("pointerdown",down);
      renderer.domElement.removeEventListener("pointerup",up);renderer.domElement.removeEventListener("pointerleave",leave);
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
      scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Line){geometries.add(object.geometry);const mats=Array.isArray(object.material)?object.material:[object.material];mats.forEach((m:THREE.Material)=>materials.add(m));}});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
      sun.shadow.map?.dispose();renderer.dispose();renderer.domElement.remove();
    },
  };
}
