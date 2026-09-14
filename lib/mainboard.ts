import * as T from 'three';
import type { ModelTools } from './hardware.ts';
import type { Vec3 } from './layout.ts';
import {
  buildCapacitor,
  buildChip,
  buildChoke,
  buildHeader,
  buildPort,
  buildScrew,
  buildSlot,
} from './parts.ts';

/**
 * The motherboard at its own scale.
 *
 * The board is laid flat here, X across, Z front-to-back, Y off the board,
 * because that is how you look at a board on a bench, and it matches how the
 * graphics card presents its own PCB one level down.
 *
 * Outline, slot pitch and the rear aperture follow ATX. The component zones
 * follow the attached X670E reference: rear I/O and VRM armour down the left
 * and top, AM5 high on the board, four DIMMs at the right edge, then M.2,
 * PCIe and chipset shields below. Electrical routing remains explanatory.
 */

/** Millimetres to scene units. 1 unit ≈ 22 mm, so the board fills the stage. */
const mm = (v: number) => v / 22;

const W = mm(244); // left to right when the board is viewed flat
const D = mm(305); // rear-I/O/top edge to front-panel/bottom edge

export function buildMotherboard(tools: ModelTools, _root: T.Group) {
  const { instances, box, pcb, material, label } = tools;
  // A motherboard is already populated at 0%. Every registered piece exists
  // from the assembled frame and only moves during dissection; ignoring old
  // per-piece reveal delays prevents sockets and controllers popping in later.
  const add: ModelTools['add'] = (concept, object, pos, delta) =>
    tools.add(concept, object, pos, delta, 0);
  const place = (group: T.Group, obj: T.Object3D, pos: Vec3) => {
    obj.position.set(...pos);
    group.add(obj);
    return obj;
  };

  // ── The board ───────────────────────────────────────────────────────────
  const board = new T.Group();
  place(board, pcb([W, mm(1.6), D], 'motherboard'), [0, 0, 0]);
  const mountingPoints: Vec3[] = [
    [-mm(105), mm(1.1), -mm(135)],
    [0, mm(1.1), -mm(135)],
    [mm(105), mm(1.1), -mm(135)],
    [-mm(105), mm(1.1), -mm(8)],
    [0, mm(1.1), -mm(8)],
    [mm(105), mm(1.1), -mm(8)],
    [-mm(105), mm(1.1), mm(135)],
    [0, mm(1.1), mm(135)],
    [mm(105), mm(1.1), mm(135)],
  ];
  for (const [x, y, z] of mountingPoints) {
    const ring = new T.Mesh(
      new T.TorusGeometry(mm(4), mm(1.1), 6, 16),
      material('#c6cdd1', 0.92, 0.28),
    );
    ring.rotation.x = Math.PI / 2;
    place(board, ring, [x, y, z]);
  }
  // Gold/orange edge marks echo the reference board without using an image
  // texture: these stay crisp while the procedural PCB keeps real depth.
  for (let i = 0; i < 6; i++)
    place(
      board,
      box([mm(2.2), mm(0.5), mm(11)], i < 3 ? '#d2a442' : '#c95a2d', 0.72),
      [W / 2 - mm(2.5), mm(1.1), mm(95 + i * 10)],
    );
  label(
    board,
    'ATX · 305 × 244 mm',
    [mm(66), mm(1.2), D / 2 - mm(9)],
    mm(78),
    '#74846f',
  );
  label(
    board,
    'AM5 · X670E-CLASS LAYOUT',
    [-mm(55), mm(1.2), D / 2 - mm(9)],
    mm(112),
    '#63735f',
  );
  add('moboboard', board, [0, 0, 0], [0, -1.6, 0]);

  // ── Processor socket and CPU ────────────────────────────────────────────
  // The reference puts AM5 just right of the board centreline. Keeping these
  // dimensions in millimetres makes the socket, DIMM and VRM clearances easy
  // to audit against the fixed 244 × 305 mm ATX outline.
  const socketX = mm(8),
    socketZ = -mm(64);
  const socket = new T.Group();
  place(socket, box([mm(56), mm(3), mm(56)], '#383e43', 0.6), [0, 0, 0]);
  const contact = new T.BoxGeometry(mm(0.9), mm(0.6), mm(0.9));
  const contactMaterial = material('#cbae60', 0.94, 0.22);
  for (let i = 0; i < 34; i++)
    for (let j = 0; j < 34; j++) {
      if ((i > 12 && i < 21 && j > 12 && j < 21) || (i + j) % 2) continue;
      const pin = new T.Mesh(contact, contactMaterial);
      pin.position.set(mm(-24.75 + i * 1.5), mm(1.8), mm(-24.75 + j * 1.5));
      socket.add(pin);
    }
  // Retention frame, load plate and the cam lever that holds it shut.
  for (const s of [-1, 1]) {
    place(socket, box([mm(64), mm(5), mm(5)], '#99a1a6', 0.9), [
      0,
      mm(3.4),
      s * mm(30),
    ]);
    place(socket, box([mm(5), mm(5), mm(64)], '#99a1a6', 0.9), [
      s * mm(30),
      mm(3.4),
      0,
    ]);
  }
  place(socket, box([mm(58), mm(1.6), mm(16)], '#aeb6bb', 0.92), [
    0,
    mm(5.2),
    mm(24),
  ]);
  const lever = new T.Mesh(
    new T.CylinderGeometry(mm(1.8), mm(1.8), mm(52), 12),
    material('#b9c1c5', 0.92, 0.24),
  );
  lever.rotation.x = Math.PI / 2;
  place(socket, lever, [-mm(35), mm(4), mm(6)]);
  const hook = new T.Mesh(
    new T.CylinderGeometry(mm(1.6), mm(1.6), mm(14), 10),
    material('#b9c1c5', 0.92, 0.24),
  );
  hook.rotation.z = Math.PI / 2;
  place(socket, hook, [-mm(29), mm(4), mm(31)]);
  add('socket', socket, [socketX, mm(1.6), socketZ], [0, 1.4, 0], 0.18);

  const cpu = new T.Group();
  place(cpu, box([mm(45), mm(2.2), mm(38)], '#31363b', 0.5), [0, 0, 0]);
  place(cpu, box([mm(39), mm(3.2), mm(32)], '#ccd3d7', 0.95, 0.006), [
    0,
    mm(2.4),
    0,
  ]);
  // The two notches that key the package into the socket.
  for (const s of [-1, 1])
    place(cpu, box([mm(3), mm(2.4), mm(2)], '#2a2e32', 0.4), [
      s * mm(16),
      0,
      -mm(19),
    ]);
  label(cpu, 'AMD RYZEN', [0, mm(4.1), -mm(5)], mm(30), '#767e83');
  label(cpu, 'AM5', [0, mm(4.1), mm(7)], mm(15), '#8b9398');
  add('cpu', cpu, [socketX, mm(6.4), socketZ], [0, 2.6, 0]);

  // ── Memory ──────────────────────────────────────────────────────────────
  const slotZ = socketZ + mm(8);
  const dimmX = [mm(64), mm(76), mm(88), mm(100)];
  for (let i = 0; i < 4; i++) {
    const slot = buildSlot(material, mm(133), i % 2 ? '#2f3439' : '#464e54', {
      width: mm(7),
      height: mm(8),
      notch: 0.56,
      latch: true,
    });
    slot.rotation.y = Math.PI / 2;
    add('dimmslot', slot, [dimmX[i], mm(5), slotZ], [0, 1.0, 0], 0.12);
  }
  for (let i = 0; i < 2; i++) {
    const stick = new T.Group();
    place(stick, pcb([mm(3), mm(31), mm(133)], 'memory'), [0, 0, 0]);
    for (const s of [-1, 1])
      for (let j = 0; j < 8; j++)
        place(stick, box([mm(1.2), mm(11), mm(12)], '#1d2124', 0.12), [
          s * mm(2),
          mm(2),
          mm(-52 + j * 15),
        ]);
    place(stick, box([mm(4.6), mm(9), mm(11)], '#2f3336', 0.22), [
      0,
      mm(4),
      mm(58),
    ]);
    // Gold edge contacts, split by the DDR5 key.
    for (const s of [-1, 1])
      for (const half of [-1, 1])
        place(stick, box([mm(0.5), mm(4), mm(58)], '#c2a457', 0.93, 0.006), [
          s * mm(1.6),
          -mm(13),
          half * mm(33),
        ]);
    // Brushed aluminium heatspreader over both faces.
    place(stick, box([mm(5.4), mm(26), mm(131)], '#59626a', 0.9, 0.004), [
      0,
      mm(6),
      0,
    ]);
    for (let j = 0; j < 9; j++)
      place(stick, box([mm(5.8), mm(1.2), mm(5)], '#6f7a82', 0.92), [
        0,
        mm(14),
        mm(-56 + j * 14),
      ]);
    add('ram', stick, [dimmX[i * 2 + 1], mm(22), slotZ], [0, 2.2, 0]);
  }

  // ── Voltage regulator ───────────────────────────────────────────────────
  const vrm = new T.Group();
  const stageZ = socketZ - mm(50);
  for (let i = 0; i < 10; i++) {
    const x = mm(-38 + i * 10);
    const stage = buildChip(
      material,
      [mm(7), mm(2), mm(7)],
      5,
      false,
      '#1a1d20',
    );
    place(vrm, stage, [x, mm(1.2), stageZ - mm(9)]);
    place(vrm, buildChoke(material, mm(11), mm(6.5), '#2b3033'), [
      x,
      mm(3.4),
      stageZ,
    ]);
    place(vrm, buildCapacitor(material, mm(3.4), mm(9), '#23282c'), [
      x,
      mm(4.6),
      stageZ + mm(10),
    ]);
  }
  for (let i = 0; i < 4; i++)
    place(vrm, buildChoke(material, mm(11), mm(6.5), '#2b3033'), [
      socketX - mm(46),
      mm(3.4),
      socketZ - mm(24) + i * mm(15),
    ]);
  label(
    vrm,
    '14 PHASE · ILLUSTRATIVE',
    [-mm(30), mm(7.4), stageZ - mm(20)],
    mm(110),
    '#a58f68',
  );
  add('cpuvrm', vrm, [0, mm(1.6), 0], [0, 1.2, -0.6], 0.08);

  // Two low-profile, dark anodised VRM blocks. The old rotated fin stacks
  // expanded to 152 mm and 112 mm, touching the socket and reading as bright
  // tower coolers. These footprints follow the two separate blocks in the
  // supplied board: one above AM5 and one between AM5 and the rear-I/O armour.
  const topVrmSink = new T.Group();
  place(topVrmSink, box([mm(100), mm(8), mm(38)], '#202428', 0.82, mm(1.2)), [
    0,
    mm(5),
    0,
  ]);
  for (let i = 0; i < 8; i++)
    place(topVrmSink, box([mm(8), mm(2), mm(36)], '#32383d', 0.86, mm(0.5)), [
      mm(-42 + i * 12),
      mm(10),
      0,
    ]);
  add(
    'vrmheatsink',
    topVrmSink,
    [mm(8), mm(1.6), socketZ - mm(57)],
    [0.4, 2.4, -0.8],
  );

  const sideVrmSink = new T.Group();
  place(sideVrmSink, box([mm(26), mm(9), mm(104)], '#202428', 0.82, mm(1.2)), [
    0,
    mm(5.5),
    0,
  ]);
  for (let i = 0; i < 7; i++)
    place(sideVrmSink, box([mm(24), mm(2), mm(10)], '#32383d', 0.86, mm(0.5)), [
      0,
      mm(11),
      mm(-45 + i * 15),
    ]);
  add(
    'vrmheatsink',
    sideVrmSink,
    [socketX - mm(52), mm(1.6), socketZ + mm(5)],
    [-0.7, 2.4, -0.2],
  );

  // ── Chipset, firmware, battery, controllers ─────────────────────────────
  const chipset = new T.Group();
  place(chipset, box([mm(34), mm(2), mm(32)], '#15181a', 0.18), [0, 0, 0]);
  place(chipset, box([mm(92), mm(5), mm(44)], '#202428', 0.82, mm(1.4)), [
    0,
    mm(4),
    0,
  ]);
  place(chipset, box([mm(68), mm(2), mm(31)], '#30363a', 0.8, mm(0.8)), [
    mm(8),
    mm(7.5),
    0,
  ]);
  for (let i = 0; i < 6; i++)
    place(chipset, box([mm(4), mm(0.8), mm(27)], '#171a1c', 0.62, mm(0.2)), [
      mm(-16 + i * 10),
      mm(8.8),
      0,
    ]);
  label(chipset, 'TUF GAMING', [mm(9), mm(9.5), -mm(4)], mm(58), '#8b9499');
  label(chipset, 'X670E', [mm(9), mm(9.5), mm(10)], mm(25), '#697278');
  add('chipset', chipset, [mm(47), mm(2.6), mm(61)], [0.6, 1.4, 0.6]);

  const flash = new T.Group();
  place(
    flash,
    buildChip(material, [mm(10), mm(2.4), mm(7)], 4, false, '#16191b'),
    [0, 0, 0],
  );
  label(flash, 'UEFI', [0, mm(1.5), 0], mm(9), '#8a9297');
  add('uefi', flash, [mm(99), mm(2.8), mm(36)], [1.0, 1.2, 0.4]);

  const battery = new T.Group();
  const cell = new T.Mesh(
    new T.CylinderGeometry(mm(10), mm(10), mm(3.2), 26),
    material('#c3cace', 0.93, 0.2),
  );
  place(battery, cell, [0, 0, 0]);
  // The retaining clip around the cell.
  const clip = new T.Mesh(
    new T.TorusGeometry(mm(11), mm(1.2), 6, 22, Math.PI * 1.4),
    material('#9aa2a7', 0.9, 0.3),
  );
  clip.rotation.x = Math.PI / 2;
  place(battery, clip, [0, -mm(0.6), 0]);
  label(battery, 'CR', [0, mm(1.8), 0], mm(9), '#666d71');
  add('cmos', battery, [-mm(98), mm(3.4), mm(88)], [-1.2, 1.0, 0.6]);

  const lan = new T.Group();
  place(
    lan,
    buildChip(material, [mm(12), mm(2.2), mm(12)], 6, true, '#1a1d20'),
    [0, 0, 0],
  );
  place(lan, box([mm(16), mm(7), mm(14)], '#282c30', 0.25), [
    0,
    mm(3),
    -mm(18),
  ]);
  label(lan, 'LAN', [0, mm(1.5), 0], mm(10), '#8a9297');
  add('lan', lan, [-mm(112), mm(2.8), mm(36)], [-1.0, 1.2, -0.4]);

  const codec = new T.Group();
  place(
    codec,
    buildChip(material, [mm(14), mm(2.2), mm(14)], 7, true, '#1a1d20'),
    [0, 0, 0],
  );
  for (let i = 0; i < 4; i++)
    place(codec, buildCapacitor(material, mm(4), mm(10), '#2b3f4a'), [
      mm(-12 + i * 8),
      mm(5),
      mm(16),
    ]);
  label(codec, 'AUDIO', [0, mm(1.5), -mm(12)], mm(22), '#8a9297');
  add('audiocodec', codec, [-mm(106), mm(2.8), mm(108)], [-1.0, 1.2, 0.6]);

  const sensor = new T.Group();
  place(
    sensor,
    buildChip(material, [mm(11), mm(2.2), mm(11)], 6, true, '#1a1d20'),
    [0, 0, 0],
  );
  label(sensor, 'IO', [0, mm(1.5), 0], mm(8), '#8a9297');
  add('superio', sensor, [mm(104), mm(2.8), mm(128)], [0.9, 1.2, 0.8]);

  // ── Expansion slots ─────────────────────────────────────────────────────
  const pcieZ = mm(26),
    lowerPcieZ = mm(128);
  for (let i = 0; i < 2; i++) {
    const slot = buildSlot(material, mm(89), i ? '#2f3439' : '#54454e', {
      width: mm(9),
      height: mm(11),
      notch: 0.14,
      latch: true,
      armour: i === 0, // the primary slot carries a steel shroud
    });
    add(
      'pcie16',
      slot,
      [i ? -mm(40) : -mm(42), mm(6), i ? lowerPcieZ : pcieZ],
      [0, 1.1, 0],
      0.12,
    );
  }
  for (let i = 0; i < 2; i++)
    add(
      'pcie1',
      buildSlot(material, mm(25), '#2f3439', {
        width: mm(9),
        height: mm(11),
        notch: 0.2,
        latch: true,
      }),
      [-mm(104), mm(6), i ? mm(109) : mm(70)],
      [0, 1.1, 0],
      0.12,
    );

  // ── M.2 storage ─────────────────────────────────────────────────────────
  const m2Layouts = [
    { z: -mm(2), coverX: -mm(8), coverWidth: mm(104), coverDepth: mm(22) },
    { z: mm(101), coverX: mm(2), coverWidth: mm(174), coverDepth: mm(24) },
  ];
  for (const layout of m2Layouts) {
    const { z } = layout;
    const socketM2 = new T.Group();
    place(socketM2, box([mm(22), mm(3.4), mm(4)], '#333940', 0.24), [
      -mm(40),
      0,
      0,
    ]);
    place(socketM2, box([mm(20), mm(1), mm(2)], '#c2a457', 0.92), [
      -mm(40),
      mm(1.4),
      0,
    ]);
    place(socketM2, box([mm(6), mm(2), mm(8)], '#525a60', 0.66), [
      mm(40),
      0,
      0,
    ]);
    add('m2slot', socketM2, [-mm(6), mm(3), z], [0, 0.9, 0], 0.16);

    const drive = new T.Group();
    place(drive, pcb([mm(80), mm(1.4), mm(22)], 'storage'), [0, 0, 0]);
    for (let j = 0; j < 2; j++)
      place(drive, box([mm(14), mm(1.4), mm(16)], '#1d2124', 0.12), [
        mm(-14 + j * 26),
        mm(1.4),
        0,
      ]);
    place(drive, box([mm(11), mm(1.4), mm(11)], '#252a2e', 0.16), [
      mm(22),
      mm(1.4),
      0,
    ]);
    label(drive, 'NVMe', [-mm(30), mm(1.2), 0], mm(20), '#8fa397');
    add('nvme', drive, [-mm(4), mm(5), z], [0, 1.8, 0], 0.2);

    const cover = new T.Group();
    place(
      cover,
      box(
        [layout.coverWidth, mm(3), layout.coverDepth],
        '#202428',
        0.84,
        mm(0.8),
      ),
      [0, mm(1.5), 0],
    );
    for (let j = 0; j < 4; j++) {
      const slash = box([mm(10), mm(0.8), mm(1.4)], '#41484d', 0.8, mm(0.2));
      slash.rotation.y = -0.55;
      place(cover, slash, [
        -layout.coverWidth / 2 + mm(22 + j * 8),
        mm(3.4),
        mm(3),
      ]);
    }
    if (layout === m2Layouts[0])
      label(cover, 'M.2 PCIe 5.0', [mm(16), mm(3.5), 0], mm(48), '#899196');
    add('m2heatsink', cover, [layout.coverX, mm(5.8), z], [0, 2.6, 0]);
  }

  // ── Power connectors ────────────────────────────────────────────────────
  const atx24 = buildHeader(material, 12, 2, mm(4.2), '#22262a', mm(13));
  atx24.rotation.y = Math.PI / 2;
  add('atx24', atx24, [W / 2 - mm(7), mm(7), -mm(18)], [1.4, 1.0, 0]);
  for (let i = 0; i < 2; i++)
    add(
      'eps8',
      buildHeader(material, 4, 2, mm(4.2), '#22262a', mm(12)),
      [mm(-82 + i * 27), mm(6.5), -D / 2 + mm(8)],
      [0, 1.0, -1.2],
    );

  // ── Storage and front-panel connectors ──────────────────────────────────
  for (let i = 0; i < 4; i++) {
    const port = new T.Group();
    place(port, box([mm(15), mm(10), mm(7)], '#1e2226', 0.14), [0, 0, 0]);
    place(port, box([mm(11), mm(5), mm(2)], '#0d0f10', 0.3), [0, 0, mm(3.6)]);
    place(port, box([mm(9), mm(1), mm(2)], '#c2a457', 0.9), [
      0,
      -mm(2),
      mm(3.4),
    ]);
    add(
      'sataport',
      port,
      [W / 2 - mm(7), mm(6.5), mm(28) + i * mm(9)],
      [1.4, 0.8, 0],
    );
  }
  const frontHeaderX = [-mm(78), -mm(25), mm(30), mm(84)];
  for (let i = 0; i < 4; i++)
    add(
      'frontheader',
      buildHeader(material, i < 2 ? 5 : 4, 2, mm(4.2), '#22262a', mm(10)),
      [frontHeaderX[i], mm(5.5), D / 2 - mm(10)],
      [0.3, 0.8, 1.3],
    );
  const fanHeaders: Vec3[] = [
    [mm(72), mm(5), -D / 2 + mm(12)],
    [mm(93), mm(5), -D / 2 + mm(12)],
    [W / 2 - mm(9), mm(5), -mm(67)],
    [W / 2 - mm(9), mm(5), mm(94)],
    [-mm(51), mm(5), D / 2 - mm(12)],
    [mm(57), mm(5), D / 2 - mm(12)],
  ];
  for (const position of fanHeaders)
    add(
      'mobofanheader',
      buildHeader(material, 4, 1, mm(4.2), '#2c3136', mm(9)),
      position,
      [0, 0.9, 0],
    );

  // ── Rear I/O stack ──────────────────────────────────────────────────────
  const io = new T.Group();
  place(io, box([mm(158), mm(44), mm(18)], '#1d2124', 0.66), [0, mm(20), 0]);
  // The reference integrates the rear ports under a broad armour panel rather
  // than exposing them as a thin silver rail. It stops short of the side VRM
  // block so the two assemblies meet with a visible clearance seam.
  place(io, box([mm(136), mm(10), mm(44)], '#202428', 0.82, mm(1.4)), [
    0,
    mm(18),
    mm(22),
  ]);
  place(io, box([mm(112), mm(2), mm(37)], '#30363a', 0.78, mm(0.8)), [
    mm(4),
    mm(24),
    mm(22),
  ]);
  label(io, 'TUF GAMING', [0, mm(25.2), mm(22)], mm(88), '#899196');
  // USB, display and network, as stacked shells with real openings.
  const ports: [Vec3, Vec3, string][] = [
    [[-mm(62), mm(10), mm(10)], [mm(15), mm(7), mm(14)], '#33455f'],
    [[-mm(62), mm(20), mm(10)], [mm(15), mm(7), mm(14)], '#33455f'],
    [[-mm(42), mm(10), mm(10)], [mm(15), mm(7), mm(14)], '#4a3434'],
    [[-mm(42), mm(20), mm(10)], [mm(15), mm(7), mm(14)], '#4a3434'],
    [[-mm(18), mm(15), mm(10)], [mm(12), mm(12), mm(14)], '#242a2e'],
    [[mm(6), mm(16), mm(10)], [mm(17), mm(15), mm(14)], '#2a3035'],
    [[mm(34), mm(14), mm(10)], [mm(22), mm(10), mm(14)], '#1e2226'],
  ];
  for (const [position, size, color] of ports)
    place(io, buildPort(material, size, color), position);
  for (let i = 0; i < 5; i++) {
    const jack = new T.Mesh(
      new T.CylinderGeometry(mm(3.4), mm(3.4), mm(14), 16),
      material(
        ['#4a7d57', '#7d6f4a', '#7d4a57', '#4a6a7d', '#565b5f'][i],
        0.74,
        0.32,
      ),
    );
    jack.rotation.x = Math.PI / 2;
    place(io, jack, [mm(58), mm(8) + (i % 3) * mm(12), mm(8)]);
  }
  label(
    io,
    'REAR I/O · 158.75 × 44.45 mm',
    [0, mm(41), mm(2)],
    mm(120),
    '#868e93',
  );
  io.rotation.y = Math.PI / 2;
  add('reario', io, [-W / 2 + mm(9), mm(1.6), -mm(70)], [-2.2, 1.2, 0]);

  // Mounting screws around the outside.
  for (const [x, , z] of mountingPoints)
    add(
      'moboboard',
      buildScrew(material, mm(3.6)),
      [x, mm(3), z],
      [0, 2.0, 0],
      0.3,
    );

  // Small passives fill genuinely open board regions. The previous scatter
  // ignored sockets, slots and thermal covers, so gold pads visibly poked
  // through the larger assemblies in the assembled view.
  const keepouts: [number, number, number, number][] = [
    [socketX, socketZ, mm(42), mm(42)],
    [-mm(92), -mm(70), mm(31), mm(76)],
    [mm(8), socketZ - mm(57), mm(53), mm(23)],
    [socketX - mm(52), socketZ + mm(5), mm(18), mm(58)],
    [mm(78), slotZ, mm(25), mm(72)],
    [-mm(8), -mm(2), mm(56), mm(15)],
    [mm(47), mm(61), mm(49), mm(25)],
    [mm(2), mm(101), mm(90), mm(15)],
    [-mm(58), pcieZ, mm(50), mm(8)],
    [-mm(58), lowerPcieZ, mm(50), mm(8)],
  ];
  const reserved = (x: number, z: number) =>
    keepouts.some(
      ([cx, cz, halfX, halfZ]) =>
        Math.abs(x - cx) < halfX && Math.abs(z - cz) < halfZ,
    );
  const passives: Vec3[] = [];
  for (let i = 0; i < 120; i++) {
    const a = i * 2.399;
    const x = Math.cos(a) * (mm(20) + (i % 11) * mm(12)) + mm(20);
    const z = Math.sin(a * 1.31) * (mm(18) + (i % 9) * mm(11)) + mm(14);
    if (reserved(x, z)) continue;
    if (Math.abs(x) > W / 2 - mm(14) || Math.abs(z) > D / 2 - mm(14)) continue;
    passives.push([x, mm(1.9), z]);
  }
  instances('moboboard', passives, [mm(3.2), mm(1.5), mm(1.8)], 0, '#6e7a69');
  // A handful of taller electrolytics, so the board has vertical relief.
  const capacitorPositions: [number, number][] = [
    [94, 78],
    [106, 78],
    [96, 90],
    [108, 90],
    [94, 119],
    [106, 119],
    [82, 126],
  ];
  for (const [x, z] of capacitorPositions) {
    add(
      'moboboard',
      buildCapacitor(material, mm(4.5), mm(11), '#23282c'),
      [mm(x), mm(7), mm(z)],
      [0.8, 1.4, 0.4],
      0.34,
    );
  }
}
