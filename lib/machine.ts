import * as T from 'three';
import type { ModelTools } from './hardware.ts';
import type { Vec3 } from './layout.ts';
import {
  buildBlockSink,
  buildLightStrip,
  buildCapacitor,
  buildChoke,
  buildFan,
  buildFinStack,
  buildHoneycomb,
  buildMainsInlet,
  buildModularPanel,
  buildScrew,
  glowMaterial,
} from './parts.ts';
import { buildChassis, plateWithHoles, type CaseShell } from './chassis.ts';
import { buildCardCooler, CARD, cardStack } from './graphics-card.ts';
import { finishes, type Finish } from './materials.ts';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * The assembled desktop machine.
 *
 * Scale: 1 unit ≈ 35 mm, chosen so the ATX board and the graphics card come out
 * the same size here as the card does at its own scale.
 *
 * Orientation, looking through the open side of the tower:
 *   +X → the front of the case      −X → the rear panel
 *   +Y → up                         −Y → the floor of the case
 *   +Z → toward the viewer          −Z → the motherboard tray
 *
 * Board outline, the rear aperture and expansion-slot pitch follow the ATX
 * specification. Everything else (panel thicknesses, cooler size, drive
 * placement, cable routing) is an illustrative build, not a specific product.
 */

/** Millimetres to scene units. */
const mm = (v: number) => v / 35;

// ── ATX geometry, in units ────────────────────────────────────────────────
const BOARD_H = mm(305); //  8.71  vertical, along the rear panel
const BOARD_D = mm(244); //  6.97  front-to-back
const SLOT_PITCH = mm(20.32); // expansion slot spacing
const APERTURE_W = mm(158.75); // rear I/O aperture, along the board edge
const APERTURE_H = mm(44.45); // rear I/O aperture, off the board surface

// Case interior.
const REAR = -6.6;
const FRONT = 6.6;
const FLOOR = -6.5;
const ROOF = 6.5;
const TRAY = -2.95; // motherboard tray plane
const BOARD_Z = TRAY + 0.2; // board sits on standoffs
const GLASS = 3.15; // window panel plane
// Behind the tray: the cable chamber, closed by the solid side panel. A tower
// of this shape is two rooms, and the run that feeds the processor only has
// anywhere to hide because this one exists.
const BACK = -3.95;

// Board placement: rear edge against the rear panel, top edge near the roof.
const BOARD_X0 = REAR + 0.42;
const BOARD_X = BOARD_X0 + BOARD_D / 2;
const BOARD_Y0 = -2.95;
const BOARD_Y = BOARD_Y0 + BOARD_H / 2;

/** The primary ×16 slot, and the card installed in it. */
const SLOT1_Y = BOARD_Y0 + mm(120);

/**
 * Lighting colours, swept front to back rather than scattered. Addressable
 * fans are usually run as one gradient across the build, and a gradient also
 * keeps the machine readable. A true rainbow flattens every surface it
 * touches into noise.
 */
const RGB = ['#2f6bff', '#7a3cff', '#c62ce0', '#ff3aa0'] as const;
const ACCENT = '#37d6ff';

/**
 * The board as one object, for the scale where the whole machine is on screen.
 * Parts stand off the surface properly so it reads in relief through the glass
 * rather than as a flat green rectangle. The motherboard scale rebuilds all of
 * this separately, at its own detail.
 */
/** Shared with the machine below so the board's accent matches the build. */
const BOARD_ACCENT = '#37d6ff';

export function buildMotherboardAssembly(tools: ModelTools) {
  const { box, pcb, material, label } = tools;
  const group = new T.Group();
  const put = (obj: T.Object3D, pos: Vec3) => {
    obj.position.set(...pos);
    group.add(obj);
    return obj;
  };

  put(pcb([BOARD_D, BOARD_H, 0.055], 'motherboard'), [0, 0, 0]);

  // Rear I/O cover and the port stack showing through the case.
  put(box([0.5, APERTURE_W, APERTURE_H * 0.92], '#40474d', 0.66), [
    -BOARD_D / 2 + 0.25,
    BOARD_H / 2 - APERTURE_W / 2 - 0.2,
    APERTURE_H * 0.46 + 0.03,
  ]);
  const ioGlow = new T.Mesh(
    new T.PlaneGeometry(APERTURE_W * 0.82, 0.1),
    glowMaterial(BOARD_ACCENT, 1.7),
  );
  ioGlow.rotation.y = Math.PI / 2;
  ioGlow.rotation.z = Math.PI / 2;
  put(ioGlow, [
    -BOARD_D / 2 + 0.51,
    BOARD_H / 2 - APERTURE_W / 2 - 0.2,
    APERTURE_H * 0.46 + 0.03,
  ]);
  for (let i = 0; i < 9; i++)
    put(box([0.1, 0.3, 0.22], '#0e1112', 0.35), [
      -BOARD_D / 2 + 0.02,
      BOARD_H / 2 - 0.55 - i * 0.44,
      0.28 + (i % 2) * 0.46,
    ]);

  const socketX = -0.55,
    socketY = 1.55;
  put(box([mm(56), mm(56), 0.06], '#2b3035', 0.4), [socketX, socketY, 0.05]);
  for (const side of [-1, 1]) {
    put(box([mm(60), 0.1, 0.2], '#a2aaae', 0.9), [
      socketX,
      socketY + side * mm(30),
      0.13,
    ]);
    put(box([0.1, mm(60), 0.2], '#a2aaae', 0.9), [
      socketX + side * mm(30),
      socketY,
      0.13,
    ]);
  }

  // Memory: four slots, two populated, standing off the board.
  //
  // `memY` is a clearance, not a styling choice. A 133 mm module hung level
  // with the socket reaches down past the primary ×16 slot and straight
  // through the graphics card in it, which is what used to happen here. Real
  // boards put the slots high, close to the top edge, for exactly this reason,
  // so the modules are seated to leave the card its own air.
  const memY = socketY + mm(32);
  for (let i = 0; i < 4; i++) {
    const x = socketX + mm(62) + i * mm(11);
    put(box([mm(7.4), mm(133), 0.2], i % 2 ? '#33383d' : '#4c545a', 0.14), [
      x,
      memY,
      0.11,
    ]);
    if (i % 2 === 1) {
      put(box([mm(6.6), mm(131), 0.86], '#33393e', 0.72, 0.01), [
        x,
        memY,
        0.58,
      ]);
      put(box([mm(7), mm(40), 0.08], '#7f888e', 0.92), [x, memY, 1.0]);
      // Frosted diffuser along the top of the heatspreader.
      const bar = new T.Mesh(
        new T.BoxGeometry(mm(5), mm(124), 0.07),
        glowMaterial(BOARD_ACCENT, 1.6),
      );
      put(bar, [x, memY, 1.02]);
    }
  }

  for (let i = 0; i < 4; i++) {
    const long = i === 0 || i === 2;
    put(
      box(
        [long ? mm(89) : mm(25), mm(7.5), 0.2],
        i === 0 ? '#7d6a74' : '#3a4146',
        0.14,
      ),
      [
        -BOARD_D / 2 + (long ? mm(58) : mm(26)),
        SLOT1_Y - BOARD_Y - i * SLOT_PITCH * 1.6,
        0.11,
      ],
    );
  }

  /**
   * The rear I/O cover.
   *
   * Every current desktop board has one: a moulded shroud over the port stack
   * and the regulator, carrying the board's own branding. Without it the top
   * corner of the board is bare laminate with a few blocks on it, which is
   * what a board looks like in a catalogue photograph of a bare PCB and not
   * what one looks like installed.
   */
  const armour = new T.Group();
  const onArmour = (obj: T.Object3D, pos: Vec3) => {
    obj.position.set(...pos);
    armour.add(obj);
  };
  onArmour(box([mm(96), mm(122), 0.7], '#1b1f23', 0.32, 0.03), [0, 0, 0]);
  onArmour(box([mm(86), mm(112), 0.06], '#2d343a', 0.68), [0, 0, 0.38]);
  const armourBar = new T.Mesh(
    new T.PlaneGeometry(mm(62), mm(7)),
    glowMaterial(BOARD_ACCENT, 1.5),
  );
  armourBar.position.set(0, -mm(34), 0.42);
  armour.add(armourBar);
  put(armour, [-BOARD_D / 2 + mm(58), BOARD_H / 2 - mm(74), 0.34]);
  label(
    group,
    'ATX',
    [-BOARD_D / 2 + mm(58), BOARD_H / 2 - mm(96), 0.44],
    mm(40),
    '#8e979d',
  );

  // Chipset block and the M.2 thermal covers.
  const chipset = buildBlockSink(material, mm(48), mm(48), 0.38, '#3a4147');
  chipset.rotation.x = Math.PI / 2;
  put(chipset, [mm(34), -mm(92), 0.22]);
  label(group, 'PCH', [mm(34), -mm(92), 0.46], mm(34), '#8d959b');
  // M.2 covers: a thermal pad under a milled plate, the way they actually sit.
  for (let i = 0; i < 2; i++) {
    put(box([mm(88), mm(26), 0.16], '#242a2e', 0.55), [
      -mm(18),
      -mm(30) - i * mm(64),
      0.1,
    ]);
    put(box([mm(80), mm(19), 0.05], '#4d565c', 0.86), [
      -mm(18),
      -mm(30) - i * mm(64),
      0.2,
    ]);
    for (let g = 0; g < 5; g++)
      put(box([mm(11), mm(15), 0.02], '#1a1f22', 0.5), [
        -mm(52) + g * mm(17),
        -mm(30) - i * mm(64),
        0.23,
      ]);
  }

  // Regulator heatsinks: the finned blocks above and beside the socket.
  //
  // `buildBlockSink` grows its fins along +Y, so `rotation.x = π/2` is the one
  // turn that lifts them off the board. A second turn on Z used to stand the
  // left sink on end, and it did not: composed in XYZ order the pair sends the
  // block's 120 mm length along Z and its fins along −X, so that sink ran
  // backwards through the board, through the tray and out of the rear panel.
  // Passing the dimensions the right way round needs only the one turn.
  for (const [w, h, x, y] of [
    [mm(150), mm(30), socketX + mm(12), socketY + mm(78)],
    [mm(28), mm(120), socketX - mm(70), socketY + mm(10)],
  ] as const) {
    const sink = buildBlockSink(material, w, h, 0.56, '#434b51');
    sink.rotation.x = Math.PI / 2;
    put(sink, [x, y, 0.3]);
  }

  const ramGlow = new T.PointLight(BOARD_ACCENT, 4.5, 4.5, 2);
  ramGlow.position.set(socketX + mm(74), memY, 1.5);
  group.add(ramGlow);

  // Power connectors. The 24-pin sits high on the front edge and the 8-pin in
  // the top corner clear of the regulator heatsink, which is where the cable
  // runs below can actually reach them: down at the old positions both blocks
  // stood inside the graphics card, and the 8-pin was buried in the sink.
  put(box([mm(20), mm(52), 0.34], '#26292c', 0.1), [
    BOARD_D / 2 - mm(18),
    mm(48),
    0.19,
  ]);
  put(box([mm(38), mm(16), 0.3], '#26292c', 0.1), [
    -mm(101),
    BOARD_H / 2 - mm(16),
    0.17,
  ]);

  // Scattered small parts, so the empty board area is not a flat plane.
  for (let i = 0; i < 16; i++) {
    const a = i * 2.39;
    const x = Math.cos(a) * (0.5 + (i % 7) * 0.36) + mm(10),
      y = Math.sin(a * 1.7) * (0.9 + (i % 5) * 0.52) - mm(20);
    if (i % 3 === 0) {
      const cap = buildCapacitor(material, mm(4), mm(11), '#232a2e');
      cap.rotation.x = Math.PI / 2;
      put(cap, [x, y, 0.18]);
    } else {
      const choke = buildChoke(material, mm(9), mm(7), '#2b2f33');
      choke.rotation.x = Math.PI / 2;
      put(choke, [x, y, 0.13]);
    }
  }
  return group;
}

export function buildMachine(tools: ModelTools, root: T.Group) {
  const { add, instances, box, pcb, material, label } = tools;
  const place = (group: T.Group, obj: T.Object3D, pos: Vec3) => {
    obj.position.set(...pos);
    group.add(obj);
    return obj;
  };
  /**
   * The surface the tower stands on.
   *
   * A machine drawn against nothing floats, and floating is most of why the
   * old render read as a model rather than as a photograph of a machine. This
   * catches the key light's shadow and nothing else, so the background stays
   * transparent and all that appears under the case is the contact shadow its
   * own feet cast. It is scenery rather than a part, which is what
   * `contextFrame` marks: it is never selected, named or laid out.
   */
  const ground = new T.Mesh(
    new T.PlaneGeometry(60, 60),
    new T.ShadowMaterial({ opacity: 0.42 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = FLOOR - 0.41;
  ground.receiveShadow = true;
  ground.userData.contextFrame = true;
  root.add(ground);

  const finish = finishes();
  /**
   * A part made in a named finish rather than in a colour.
   *
   * `box` takes a colour and a metalness and gives everything the same grain
   * and the same roughness, which is why the shroud, the supply, the cage and
   * the card all used to look moulded from one grey polymer. Asking for the
   * finish instead - powder-coated steel, anodised aluminium, moulded ABS -
   * carries the grain and the highlight that tell those materials apart.
   */
  const slab = (size: Vec3, kind: Finish, color?: string, radius = 0.014) =>
    new T.Mesh(
      new RoundedBoxGeometry(
        ...size,
        2,
        Math.min(radius, Math.min(...size) * 0.45),
      ),
      finish(kind, color),
    );

  // ── Chassis ─────────────────────────────────────────────────────────────
  //
  // The shell, its panels and its cut-outs are built in `chassis.ts`, from the
  // openings the parts below actually need. Everything it is given here is a
  // measurement taken from a component, not a styling number: the I/O window
  // is where the board's port stack is, the slot cut-outs are on the ATX slot
  // pitch, and the supply's opening is the size of the supply.
  const shell: CaseShell = {
    REAR,
    FRONT,
    FLOOR,
    ROOF,
    TRAY,
    GLASS,
    BACK,
    io: {
      y: BOARD_Y + BOARD_H / 2 - APERTURE_W / 2 - 0.2,
      z: BOARD_Z + APERTURE_H * 0.46,
      up: APERTURE_W,
      across: APERTURE_H,
    },
    slotY: SLOT1_Y,
    slotZ: BOARD_Z + 1.55,
    slotPitch: SLOT_PITCH,
    slots: 7,
    psu: {
      y: FLOOR + mm(46),
      z: -0.4,
      up: mm(86) + 0.1,
      across: mm(150) + 0.1,
    },
    accent: ACCENT,
  };
  buildChassis(tools, finish, shell);

  // Rear I/O shield: the stamped plate the board's port stack sits behind.
  const aperture = new T.Group();
  const apY = shell.io.y;
  place(aperture, box([0.05, APERTURE_W, APERTURE_H], '#575f65', 0.9), [
    0,
    apY,
    shell.io.z,
  ]);
  for (let i = 0; i < 9; i++)
    place(aperture, box([0.09, 0.34, 0.26], '#0b0d0e', 0.3), [
      0.04,
      apY + APERTURE_W / 2 - 0.5 - i * 0.44,
      shell.io.z + ((i % 2) - 0.5) * 0.46,
    ]);
  for (const s of [-1, 1])
    place(aperture, box([0.07, 0.14, APERTURE_H + 0.24], '#79828a', 0.9), [
      0,
      apY + s * (APERTURE_W / 2 + 0.07),
      shell.io.z,
    ]);
  for (const s of [-1, 1])
    place(aperture, box([0.07, APERTURE_W + 0.24, 0.14], '#79828a', 0.9), [
      0,
      apY,
      shell.io.z + s * (APERTURE_H / 2 + 0.07),
    ]);
  add('ioshield', aperture, [REAR + 0.14, 0, 0], [-1.8, 0, 0]);

  const standoffs: Vec3[] = [];
  for (const gx of [-mm(100), mm(6), mm(112)])
    for (const gy of [-mm(130), mm(0), mm(132)])
      standoffs.push([BOARD_X + gx, BOARD_Y + gy, TRAY + 0.1]);
  instances('boardstandoff', standoffs, [0.14, 0.14, 0.2], 0, '#9ba3a7');

  // A light column down the inner face of the front corner post.
  const pillar = buildLightStrip(ROOF - FLOOR - 1.6, 0.11, RGB[0], 1.9);
  pillar.rotation.z = Math.PI / 2;
  const pillarGroup = new T.Group();
  pillarGroup.add(pillar);
  const pillarGlow = new T.PointLight(RGB[0], 8, 9, 2);
  pillarGlow.position.set(-1.0, 1.2, -0.6);
  pillarGroup.add(pillarGlow);
  add('chassis', pillarGroup, [FRONT - 0.62, 0.2, GLASS - 0.62], [2.2, 0, 2.2]);

  // Power supply shroud.
  // Ends at the intake fan wall, not through it: the deck used to reach past
  // the front fans, so the lit ring of the bottom one came out of its top face.
  const SHROUD_W = FRONT - REAR - 1.6;
  const SHROUD_D = 5.9;
  const shroud = new T.Group();

  /**
   * The deck, cut rather than plain.
   *
   * One unbroken sheet eleven units across was the largest flat surface in the
   * machine and had nothing on it, so it read as a moulded tray and dragged
   * everything standing on it down with it. A real deck is cut: a long vent
   * under the card, because the card's fans face down into it and would
   * otherwise be breathing against a closed lid, and a grommeted pass-through
   * where the supply's leads come up. Both are holes the build actually needs,
   * and between them they break the plane into something with structure.
   */
  const deckHoles: [number, number, number, number][] = [
    [5.0, 2.0, -1.4, -0.2], // vent under the graphics card
    [1.1, 1.5, 3.9, 1.4], // cable pass-through
  ];
  for (const [w, h, cx, cz] of plateWithHoles(SHROUD_W, SHROUD_D, deckHoles))
    place(shroud, slab([w, 0.12, h], 'steel'), [cx, 0, cz]);
  // A grommet round the cable hole and a returned lip round the vent, so both
  // openings have an edge instead of stopping dead in the sheet.
  for (const [index, [w, h, cx, cz]] of deckHoles.entries()) {
    const trim: Finish = index ? 'rubber' : 'steel';
    for (const sx of [-1, 1])
      place(
        shroud,
        slab([0.11, 0.16, h + 0.18], trim, index ? undefined : '#2e353a'),
        [cx + (sx * (w + 0.09)) / 2, 0.02, cz],
      );
    for (const sz of [-1, 1])
      place(
        shroud,
        slab([w + 0.18, 0.16, 0.11], trim, index ? undefined : '#2e353a'),
        [cx, 0.02, cz + (sz * (h + 0.09)) / 2],
      );
  }
  // A honeycomb screen across the vent: the card breathes through it, and it
  // is the one place in the lower half of this machine with any fine detail.
  const deckVent = buildHoneycomb(material, 4.9, 1.9, 0.03, 0.14, '#1b1f22');
  deckVent.rotation.x = -Math.PI / 2;
  place(shroud, deckVent, [-1.4, 0.01, -0.2]);

  // The front wall of the deck, and the louvres over the supply's own air.
  place(shroud, slab([0.12, 1.4, 5.3], 'steel'), [SHROUD_W / 2, -0.7, 0.1]);
  for (let i = 0; i < 7; i++)
    place(shroud, slab([0.28, 0.07, 1.5], 'plastic', '#0c0e0f'), [
      -4.6 + i * 0.42,
      0.06,
      2.05,
    ]);
  // A brushed inlay along the window edge and a chamfered lip carrying the
  // light strip, so the deck has a front face and not just a cut edge.
  place(
    shroud,
    slab([SHROUD_W - 1.0, 0.05, 0.9], 'anodized', '#2a3136'),
    [0, 0.1, 2.28],
  );
  place(
    shroud,
    slab([SHROUD_W, 0.17, 0.2], 'anodizedLight', '#7d868c'),
    [0, 0.02, 2.92],
  );
  const shroudStrip = buildLightStrip(SHROUD_W - 0.8, 0.12, ACCENT, 2.3);
  place(shroud, shroudStrip, [0, 0.02, 2.78]);
  const shroudGlow = new T.PointLight(ACCENT, 7, 7.5, 2);
  shroudGlow.position.set(0.4, 0.6, 2.2);
  shroud.add(shroudGlow);
  // Sits high enough that a loom fits between it and the top of the supply.
  add(
    'psushroud',
    shroud,
    [(FRONT + REAR) / 2 - 0.2, FLOOR + 3.0, -0.2],
    [0, 2.6, 0],
  );

  // Compact 2.5-inch SSD tray, stood back from the intake fans with its keyed
  // data and power edge facing the cable channel.
  const CAGE_X = 3.3,
    CAGE_W = mm(112),
    CAGE_D = mm(82);
  const cage = new T.Group();
  place(cage, slab([CAGE_W, 0.07, CAGE_D], 'steel', '#262b2f'), [0, -0.1, 0]);
  for (const sz of [-1, 1])
    place(cage, slab([CAGE_W, 0.4, 0.07], 'steel', '#262b2f'), [
      0,
      0.1,
      (sz * CAGE_D) / 2,
    ]);
  for (const sx of [-1, 1])
    place(cage, slab([0.08, 0.4, CAGE_D], 'steel', '#262b2f'), [
      (sx * CAGE_W) / 2,
      0.1,
      0,
    ]);
  // Folded legs and mounting feet tie the tray to the case floor.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      place(cage, slab([0.16, 0.65, 0.16], 'steel', '#262b2f'), [
        (sx * (CAGE_W - 0.4)) / 2,
        -0.42,
        (sz * (CAGE_D - 0.3)) / 2,
      ]);
      place(cage, slab([0.42, 0.08, 0.42], 'steel', '#262b2f'), [
        (sx * (CAGE_W - 0.4)) / 2,
        -0.75,
        (sz * (CAGE_D - 0.3)) / 2,
      ]);
    }
  add('drivecage', cage, [CAGE_X, FLOOR + 0.8, -0.3], [1.6, 0, 0]);

  // ── Storage ─────────────────────────────────────────────────────────────
  const ssd = new T.Group();
  place(
    ssd,
    slab([mm(100), mm(7), mm(70)], 'anodized', '#32383d', 0.01),
    [0, 0, 0],
  );
  place(ssd, slab([mm(88), mm(1), mm(58)], 'anodizedLight', '#6f777d'), [
    0,
    mm(3.8),
    0,
  ]);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      place(ssd, buildScrew(material, mm(1.4)), [
        sx * mm(43),
        mm(4.1),
        sz * mm(28),
      ]);
  // Separate 7-pin data and 15-pin power sockets on the cable-facing edge.
  place(ssd, slab([mm(16), mm(4), mm(6)], 'plasticGloss', '#111416'), [
    mm(30),
    0,
    mm(36),
  ]);
  place(ssd, slab([mm(28), mm(4), mm(6)], 'plasticGloss', '#111416'), [
    mm(6),
    0,
    mm(36),
  ]);
  label(ssd, 'SATA SSD', [0, mm(4.6), 0], 0.9, '#aeb6bb');
  add('ssd', ssd, [CAGE_X, FLOOR + 1.0, -0.3], [1.9, 0.4, 0]);

  // ── Power supply ────────────────────────────────────────────────────────
  const psu = new T.Group();
  const pw = mm(160),
    ph = mm(86),
    pd = mm(150);
  place(psu, slab([pw, ph, pd], 'steel', '#1c2023', 0.012), [0, 0, 0]);
  // The fold line down each side of the wrap, which is how the sheet is made.
  for (const sz of [-1, 1])
    place(psu, slab([pw + 0.005, mm(3), mm(3)], 'steel', '#2b3134'), [
      0,
      ph / 2 - mm(3),
      (sz * pd) / 2,
    ]);

  // Bottom intake: fan behind a wire guard, drawing through the floor filter.
  const psuFan = buildFan(material, {
    size: mm(135),
    phase: 0.4,
    blades: 11,
    frameColor: '#15181a',
    guard: true,
  });
  psuFan.rotation.x = Math.PI;
  place(psu, psuFan, [0, -ph / 2 + mm(24), 0]);

  // Rear face: hex exhaust grille, mains inlet and switch.
  const grille = buildHoneycomb(
    material,
    ph * 0.82,
    pd * 0.62,
    0.04,
    mm(5),
    '#23282b',
  );
  grille.rotation.y = Math.PI / 2;
  grille.rotation.z = Math.PI / 2;
  place(psu, grille, [-pw / 2 - 0.01, mm(4), -mm(28)]);
  const inlet = buildMainsInlet(material, mm(26));
  inlet.rotation.y = -Math.PI / 2;
  place(psu, inlet, [-pw / 2 - 0.04, -mm(20), mm(38)]);
  place(psu, slab([0.08, mm(16), mm(22)], 'plasticGloss', '#1a1d1f'), [
    -pw / 2 - 0.04,
    mm(10),
    mm(38),
  ]);

  // Front face: the modular connector panel, facing into the case.
  const panel = buildModularPanel(material, ph * 0.86, pd * 0.5, 0.09);
  panel.rotation.y = Math.PI / 2;
  panel.rotation.z = Math.PI / 2;
  place(psu, panel, [pw / 2 + 0.02, 0, 0]);

  for (const sy of [-1, 1])
    for (const sz of [-1, 1])
      place(psu, buildScrew(material, mm(3)), [
        -pw / 2 - 0.02,
        sy * (ph / 2 - mm(9)),
        sz * (pd / 2 - mm(9)),
      ]);
  label(psu, 'ATX POWER SUPPLY', [0, ph / 2 + 0.01, -mm(20)], 2.2, '#6d757a');
  add('psu', psu, [REAR + mm(100), FLOOR + mm(46), -0.4], [-1.2, -2.4, 0]);

  // Cable looms from the supply up to the board and the card.
  //
  // Three runs, one per connector the supply actually feeds, each ending on
  // the connector it plugs into rather than somewhere inside the part. There
  // used to be five: two pairs went to the same two connectors, and both of
  // the spares terminated inside the graphics card.
  const cables = new T.Group();
  const loom = (points: Vec3[], radius: number, color: string) => {
    const curve = new T.CatmullRomCurve3(
      points.map((p) => new T.Vector3(...p)),
    );
    cables.add(
      new T.Mesh(
        new T.TubeGeometry(curve, 30, radius, 7, false),
        material(color, 0.16, 0.7),
      ),
    );
  };
  // 24-pin: up through the shroud and along the front edge of the board, in
  // plain sight through the window, passing in front of the card rather than
  // through it.
  loom(
    [
      [2.6, FLOOR + 3.1, 1.4],
      [1.7, FLOOR + 3.65, 1.9],
      [1.0, 0.2, 1.95],
      [0.72, BOARD_Y + mm(22), 1.6],
      [0.52, BOARD_Y + mm(44), 0.1],
      [0.42, BOARD_Y + mm(48), -2.36],
    ],
    0.16,
    '#16191b',
  );
  // 8-pin EPS: up the narrow gap behind the rear edge of the board, over the
  // top edge and down onto the connector in the corner. This is the run a
  // build hides, so it is routed where a builder would hide it.
  loom(
    [
      [REAR + 5.19, FLOOR + 1.75, -0.55],
      [REAR + 5.32, FLOOR + 2.45, -0.75],
      [REAR + 5.28, FLOOR + 2.72, -1.25],
      [REAR + 3.3, FLOOR + 2.72, -2.1],
      [REAR + 1.1, FLOOR + 2.73, -2.5],
      [REAR + 0.45, FLOOR + 3.15, -2.6],
      [REAR + 0.3, FLOOR + 3.7, -2.64],
      [REAR + 0.28, -2.0, -2.66],
      [REAR + 0.26, 1.0, -2.66],
      [REAR + 0.26, 3.6, -2.66],
      [REAR + 0.28, ROOF - 0.6, -2.62],
      [REAR + 0.46, ROOF - 0.42, -2.58],
      [BOARD_X - mm(101) + 0.6, BOARD_Y + BOARD_H / 2 + 0.3, -2.54],
      [BOARD_X - mm(101), BOARD_Y + BOARD_H / 2 - mm(8), -2.48],
      [BOARD_X - mm(101), BOARD_Y + BOARD_H / 2 - mm(26), -2.44],
    ],
    0.1,
    '#1f2325',
  );
  // 12V-2x6 to the card: out of the shroud, forward of everything, and down
  // onto the socket on the card's top face.
  loom(
    [
      [3.4, FLOOR + 3.1, 0.4],
      [2.3, FLOOR + 3.65, 1.5],
      [0.6, SLOT1_Y + 0.6, 1.9],
      [-0.55, SLOT1_Y + 1.5, 0.7],
      [-0.874, SLOT1_Y + 1.72, 0.12],
    ],
    0.13,
    '#1d2124',
  );
  add('psucable', cables, [0, 0, 0], [0, -1.4, 1.2], 0.02);

  // ── Motherboard ─────────────────────────────────────────────────────────
  add(
    'motherboard',
    buildMotherboardAssembly(tools),
    [BOARD_X, BOARD_Y, BOARD_Z],
    [0, 0, -3.2],
  );

  // ── Processor cooler ────────────────────────────────────────────────────
  // A tower air cooler, bolted to the socket, which is the build this machine
  // actually runs. Heat leaves the lid through the coldplate, rises through
  // four pipes and is shed by a fin stack standing in the path of the front to
  // rear airflow, so the cooler is the one part that ties the board and the
  // case fans together.
  //
  // Three clearances fix every number below, and all three are the reasons a
  // liquid loop exists at all: the fin stack has to sit clear of the regulator
  // heatsinks along the top of the board, its fan has to clear the memory
  // beside the socket, and the whole tower has to fit under the roof. The loop
  // is modelled at its own scale rather than fitted here.
  //
  // Local frame: +Y up the tower, +X toward the front of the case (the way the
  // fan faces), +Z off the board. The coldplate is therefore thin in Z, lying
  // flat on the lid, and the fins are stacked along Y.
  const SOCK_X = BOARD_X - 0.55,
    SOCK_Y = BOARD_Y + 1.55,
    SOCK_Z = BOARD_Z + 0.25; // on top of the socket retention frame
  const STACK_NEAR = mm(28), // clears the regulator heatsinks below it
    STACK_W = mm(120), // how far the stack reaches off the board
    STACK_D = mm(52), // depth along the airflow
    STACK_Z = STACK_NEAR + STACK_W / 2,
    STACK_Y = mm(56);
  const PIPE_X = [-1.5, -0.5, 0.5, 1.5];

  const tower = new T.Group();

  // Coldplate, and the crossbar whose two sprung screws pull it onto the lid.
  place(tower, slab([mm(54), mm(54), mm(8)], 'nickel', undefined, 0.004), [
    0,
    0,
    mm(4),
  ]);
  place(tower, slab([mm(78), mm(11), mm(6)], 'brushed', '#8d959a'), [
    0,
    0,
    mm(11),
  ]);
  for (const sx of [-1, 1])
    place(tower, buildScrew(material, mm(5)), [sx * mm(38), 0, mm(15)]);

  // Four pipes out of the plate, bending away from the board as they rise so
  // the stack can stand clear of everything mounted along the top of it.
  for (const px of PIPE_X) {
    const path = new T.CatmullRomCurve3([
      new T.Vector3(px * mm(11), mm(2), mm(6)),
      new T.Vector3(px * mm(12), mm(22), mm(12)),
      new T.Vector3(px * mm(13), mm(40), STACK_NEAR + mm(16)),
      new T.Vector3(px * mm(14), mm(62), STACK_Z - mm(10)),
      new T.Vector3(px * mm(14), STACK_Y + mm(44), STACK_Z - mm(10)),
    ]);
    place(
      tower,
      new T.Mesh(
        new T.TubeGeometry(path, 32, mm(3.2), 12, false),
        finish('copper'),
      ),
      [0, 0, 0],
    );
  }

  // Fin stack: horizontal plates stacked up the tower, air passing between
  // them front to rear.
  // Forty-odd fins on a 2 mm pitch, not thirty on a 3 mm one. A fin stack is
  // mostly shadow: it is the density of the gaps, and the dark between them,
  // that makes it read as a heatsink rather than as a white plastic block.
  // Seen end-on, a fin stack is mostly the shadow between the fins, not the
  // fins. Rendered at a bright aluminium value the forty of them merge into
  // one white block, which is what the tower used to look like, so the fin
  // colour here is the *average* of a lit fin and the dark gap beside it.
  const stack = buildFinStack(
    material,
    42,
    [STACK_D, mm(0.42), STACK_W],
    mm(2.05),
    '#6d757b',
  );
  place(tower, stack, [0, STACK_Y, STACK_Z]);
  place(tower, slab([STACK_D + mm(4), mm(3.5), STACK_W + mm(4)], 'anodized'), [
    0,
    STACK_Y + mm(46),
    STACK_Z,
  ]);
  const towerCap = new T.Mesh(
    new T.PlaneGeometry(STACK_D - mm(10), STACK_W - mm(12)),
    glowMaterial(RGB[1], 1.25, 0.9),
  );
  towerCap.rotation.x = -Math.PI / 2;
  place(tower, towerCap, [0, STACK_Y + mm(48), STACK_Z]);

  // The fan hangs on the front face of the stack and blows toward the rear
  // exhaust, which is the direction the case is already moving air.
  const towerFan = buildFan(material, {
    size: mm(104),
    phase: 1.1,
    pads: true,
    cable: true,
    frameColor: '#131618',
    rgb: RGB[1],
  });
  towerFan.rotation.z = Math.PI / 2; // axis along −X: front to rear
  place(tower, towerFan, [STACK_D / 2 + mm(13), STACK_Y, STACK_Z]);
  const towerGlow = new T.PointLight(RGB[1], 6, 6.5, 2);
  towerGlow.position.set(STACK_D / 2 + mm(32), STACK_Y, STACK_Z);
  tower.add(towerGlow);

  add('cpucooler', tower, [SOCK_X, SOCK_Y, SOCK_Z], [0, 2.4, 1.6]);

  // ── Case fans ───────────────────────────────────────────────────────────
  for (let i = 0; i < 3; i++) {
    // No cable tail on these three. `buildFan` sweeps it out past the frame
    // corner, which on a stacked wall of fans means through the front panel
    // and into the neighbour above. A real build routes them behind the tray,
    // where nothing here would show them anyway.
    const fan = buildFan(material, {
      size: mm(120),
      phase: i * 0.7,
      pads: true,
      rgb: RGB[i],
    });
    fan.rotation.z = Math.PI / 2;
    const spill = new T.PointLight(RGB[i], 12, 9, 2);
    spill.position.set(0, -0.5, 0); // just inside the case, past the frame
    fan.add(spill);
    add('casefan', fan, [FRONT - 0.55, -3.0 + i * mm(125), 0], [3.4, 0, 0]);
  }
  // Rear exhaust. It sits beside the I/O aperture in the depth of the rear
  // panel, above the graphics card, so the front intakes and tower cooler all
  // share one straight front-to-back path.
  const exhaust = buildFan(material, {
    size: mm(120),
    phase: 2.2,
    pads: true,
    guard: true,
    rgb: RGB[3],
  });
  const exhaustSpill = new T.PointLight(RGB[3], 6, 6, 2);
  exhaustSpill.position.set(0, -0.5, 0);
  exhaust.add(exhaustSpill);
  exhaust.rotation.z = Math.PI / 2;
  add('casefan', exhaust, [REAR + 0.32, 4.0, 0.75], [-3.4, 0, 0]);

  // ── Graphics card, in the primary slot ──────────────────────────────────
  //
  // The card itself is `graphics-card.ts`, the same module its own scale
  // builds from, so what is installed here and what you open up are one
  // object rather than two drawings of one. Only the level of detail differs:
  // inside the tower the card is a hundred pixels across, so it gets coarser
  // fin banks and no blade rims, and it is added as one selectable part
  // instead of the dozen the card's own scale breaks out.
  //
  // A card in a tower hangs cooler-downward, which is the half turn about X
  // below. The turn also swaps the card's two long edges, so the lit wordmark
  // is asked for on the far edge in order to end up facing the window.
  const CARD_L = mm(350);
  const parts = buildCardCooler(tools, finish, CARD_L, {
    logoEdge: -1,
    accent: ACCENT,
    detail: 'plain',
  });
  const seat = cardStack(CARD_L);
  const card = new T.Group();
  const cardWide = CARD.width * CARD_L;
  place(
    card,
    pcb(
      [CARD.pcb.length * CARD_L, mm(1.6), CARD.pcb.width * CARD_L],
      'graphics',
    ),
    [CARD_L * 0.08, seat.pcb, 0],
  );
  place(card, parts.shroud, [0, seat.shroud, 0]);
  place(card, parts.fins, [0, seat.fins, 0]);
  for (const fan of parts.fans) place(card, fan.object, [fan.x, seat.fan, 0]);
  place(card, parts.backplate, [0, seat.backplate, 0]);
  place(card, parts.bracket, [-CARD_L / 2 - mm(2), seat.bracket, 0]);
  const cardSpill = new T.PointLight(ACCENT, 5.5, 5.5, 2);
  cardSpill.position.set(CARD_L * 0.02, seat.shroud * 0.4, -cardWide * 0.6);
  card.add(cardSpill);
  // Cooler-downward, and seated on the slot rather than hovering over it: the
  // board inside the card lands on the connector, and the card's height then
  // reaches out from the tray toward the window.
  card.rotation.x = Math.PI;
  add(
    'graphicscard',
    card,
    [REAR + 0.16 + CARD_L / 2, SLOT1_Y - mm(2), BOARD_Z + cardWide / 2 + 0.3],
    [0, 0, 3.0],
  );
}
