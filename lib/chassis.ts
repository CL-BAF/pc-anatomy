import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { ModelTools } from './hardware.ts';
import type { Vec3 } from './layout.ts';
import type { Finisher } from './materials.ts';
import { temperedGlass } from './materials.ts';
import { buildPerforation, buildScrew, glowMaterial } from './parts.ts';

/**
 * The case.
 *
 * What was here before was a skeleton: a dozen thin plates with air between
 * them, so the machine had no outside. You could see the background through
 * the rear panel, through the tray and through the floor at the same time, and
 * a tower you can see straight through does not read as one manufactured
 * object however good the parts inside it are. Everything below exists to fix
 * that: the shell is continuous, every opening in it is a deliberate cut-out
 * with an edge, and the panels meet their frame instead of floating near it.
 *
 * The exterior follows a dual-glass aluminium tower of the Lian Li O11 Dynamic
 * kind, because that layout is the one that answers both problems at once: the
 * body is genuinely solid steel and aluminium, and the two faces you look
 * through are deliberate glass panels rather than missing walls.
 *
 *   · four extruded aluminium corner columns carry the whole frame
 *   · tempered glass across the front and the left side, meeting at a column
 *   · folded steel everywhere else: rear panel, tray, floor, roof, back side
 *   · a recessed mesh lid, a floor intake with a filter, and four feet
 *
 * Axes match `machine.ts`: +X front, −X rear, +Y up, +Z toward the viewer.
 */

export type CaseShell = {
  REAR: number;
  FRONT: number;
  FLOOR: number;
  ROOF: number;
  TRAY: number;
  GLASS: number;
  BACK: number;
  /**
   * The rear I/O aperture, given in world coordinates as it is cut in the rear
   * panel: the panel's plane is Y-Z, so the window is `up` tall along the board
   * edge and `across` deep off the board surface.
   */
  io: { y: number; z: number; up: number; across: number };
  /** Expansion slots: the top slot's centre, the pitch below it, and how many. */
  slotY: number;
  slotZ: number;
  slotPitch: number;
  slots: number;
  /** The supply's rear face, which shows through its own opening. */
  psu: { y: number; z: number; up: number; across: number };
  /** Accent colour for the lit trim. */
  accent: string;
};

/** A rectangle in a panel's own plane: width, height, centre. */
type Rect = [w: number, h: number, cx: number, cy: number];

/**
 * A solid panel with rectangular openings cut in it.
 *
 * Three.js has no solid modelling, and a panel drawn as one box with parts
 * laid over the holes is exactly the fake that made the old rear panel read as
 * cardboard. This subtracts properly: the plate is split into horizontal bands
 * at every hole edge, and each band is split again across, so what comes back
 * is the real remaining material and every opening has a genuine edge with
 * thickness. Three ports and eight slots cost eleven boxes, not eleven decals.
 */
export function plateWithHoles(
  width: number,
  height: number,
  holes: Rect[],
): Rect[] {
  const ys = new Set([-height / 2, height / 2]);
  for (const [, h, , cy] of holes) {
    ys.add(Math.max(-height / 2, cy - h / 2));
    ys.add(Math.min(height / 2, cy + h / 2));
  }
  const rows = [...ys].sort((a, b) => a - b);
  const out: Rect[] = [];
  for (let r = 0; r < rows.length - 1; r++) {
    const y0 = rows[r],
      y1 = rows[r + 1];
    if (y1 - y0 < 1e-6) continue;
    const mid = (y0 + y1) / 2;
    // Which openings this band actually runs through.
    const spans = holes
      .filter(([, h, , cy]) => cy - h / 2 < mid && cy + h / 2 > mid)
      .map(([w, , cx]) => [cx - w / 2, cx + w / 2] as const)
      .sort((a, b) => a[0] - b[0]);
    let x = -width / 2;
    for (const [x0, x1] of spans) {
      if (x0 > x) out.push([x0 - x, y1 - y0, (x + x0) / 2, mid]);
      x = Math.max(x, x1);
    }
    if (x < width / 2)
      out.push([width / 2 - x, y1 - y0, (x + width / 2) / 2, mid]);
  }
  return out;
}

export function buildChassis(
  tools: ModelTools,
  finish: Finisher,
  s: CaseShell,
) {
  const { add, material, label } = tools;
  const { REAR, FRONT, FLOOR, ROOF, TRAY, GLASS, BACK } = s;
  const DEPTH = FRONT - REAR,
    HEIGHT = ROOF - FLOOR,
    WIDTH = GLASS - BACK,
    MIDX = (FRONT + REAR) / 2,
    MIDZ = (GLASS + BACK) / 2;

  /** A panel. Rounded, because a folded steel edge is never a knife edge. */
  const slab = (size: Vec3, mat: T.Material, radius = 0.012) =>
    new T.Mesh(
      new RoundedBoxGeometry(
        ...size,
        2,
        Math.min(radius, Math.min(...size) * 0.45),
      ),
      mat,
    );
  const put = (parent: T.Group, obj: T.Object3D, pos: Vec3) => {
    obj.position.set(...pos);
    parent.add(obj);
    return obj;
  };

  const steel = finish('steel');
  const steelInner = finish('steel', '#272c30');
  const alu = finish('anodized');
  // The columns and rails are the line the eye follows round the case, so they
  // are a shade up from the panels they carry, the way a milled extrusion sits
  // against a coated sheet.
  const aluFrame = finish('anodized', '#3c444a', 0.33);
  const aluBright = finish('anodizedLight');
  const rubber = finish('rubber');

  // ── Frame: columns, rails, shell ────────────────────────────────────────
  const frame = new T.Group();

  /**
   * The four extruded corner columns.
   *
   * These are the part that makes the tower one object. Every panel lands on a
   * column, the glass sits against them, and the front-side column is the
   * visible edge where the two glass faces meet, which is the whole silhouette
   * of a case like this. A hollow section with a visible inner web is how the
   * extrusion is actually drawn, and it catches a highlight down its length
   * that a plain bar does not.
   */
  const COL = 0.36;
  for (const [cx, cz] of [
    [FRONT - COL / 2, GLASS - COL / 2],
    [FRONT - COL / 2, BACK + COL / 2],
    [REAR + COL / 2, GLASS - COL / 2],
    [REAR + COL / 2, BACK + COL / 2],
  ] as const) {
    const column = new T.Group();
    put(column, slab([COL, HEIGHT, COL], aluFrame, 0.05), [0, 0, 0]);
    // A chamfer down the outer arris, which is what actually reads as milled
    // aluminium: it holds a bright line the flat faces never do.
    const arris = new T.Mesh(
      new T.BoxGeometry(COL * 0.36, HEIGHT, COL * 0.36),
      aluBright,
    );
    arris.rotation.y = Math.PI / 4;
    put(column, arris, [
      (cx > MIDX ? 1 : -1) * COL * 0.46,
      0,
      (cz > MIDZ ? 1 : -1) * COL * 0.46,
    ]);
    put(frame, column, [cx, 0, cz]);
  }

  // Top and bottom rails, tying the columns into a frame on all four sides.
  for (const sy of [-1, 1] as const) {
    const y = sy > 0 ? ROOF - 0.19 : FLOOR + 0.19;
    for (const cz of [GLASS - COL / 2, BACK + COL / 2])
      put(frame, slab([DEPTH - COL * 2, 0.34, COL], aluFrame, 0.04), [
        MIDX,
        y,
        cz,
      ]);
    for (const cx of [FRONT - COL / 2, REAR + COL / 2])
      put(frame, slab([COL, 0.34, WIDTH - COL * 2], aluFrame, 0.04), [
        cx,
        y,
        MIDZ,
      ]);
  }

  /**
   * The rear panel, cut rather than covered: the I/O window, the eight
   * expansion slots and the supply's own opening are real holes with material
   * between them. This is the panel that used to be two thin bars with the
   * whole back of the case open between them.
   */
  const rearHoles: Rect[] = [
    [s.io.across, s.io.up, s.io.z - MIDZ, s.io.y],
    [s.psu.across, s.psu.up, s.psu.z - MIDZ, s.psu.y],
  ];
  for (let i = 0; i < s.slots; i++)
    rearHoles.push([
      1.94,
      s.slotPitch * 0.84,
      s.slotZ - MIDZ,
      s.slotY - i * s.slotPitch,
    ]);
  for (const [w, h, cz, cy] of plateWithHoles(
    WIDTH - COL * 2,
    HEIGHT - 0.38,
    rearHoles,
  ))
    put(frame, slab([0.1, h, w], steel, 0.014), [REAR + 0.05, cy, MIDZ + cz]);
  // A returned lip round each opening, so the cuts have an edge you can read.
  for (const [w, h, cz, cy] of rearHoles) {
    for (const sz of [-1, 1])
      put(frame, slab([0.13, h + 0.09, 0.05], steelInner, 0.01), [
        REAR + 0.12,
        cy,
        MIDZ + cz + (sz * (w + 0.05)) / 2,
      ]);
    for (const sy of [-1, 1])
      put(frame, slab([0.13, 0.05, w + 0.09], steelInner, 0.01), [
        REAR + 0.12,
        cy + (sy * (h + 0.05)) / 2,
        MIDZ + cz,
      ]);
  }

  /**
   * The motherboard tray: one continuous sheet, not the five bars it was.
   *
   * A tray is the part every other part is bolted to, so a tray with gaps in
   * it is the reason a build looks like it is hanging in mid-air. The three
   * openings are the ones a real tray has, and each is bound by a rubber
   * grommet: the big pass-through down the front edge, the run along the top
   * for the processor power lead, and the window behind the socket that lets a
   * cooler backplate come off without stripping the board out.
   */
  const trayHoles: Rect[] = [
    [1.15, 7.3, FRONT - 2.0, 0.1], // front pass-through
    [4.4, 0.75, MIDX - 1.0, ROOF - 1.25], // top run
    [2.5, 2.6, REAR + 3.0, 2.05], // socket access window
    [1.05, 1.5, FRONT - 2.0, FLOOR + 2.35], // lower pass-through
  ];
  for (const [w, h, cx, cy] of plateWithHoles(
    DEPTH - COL * 2,
    HEIGHT - 0.38,
    trayHoles,
  ))
    put(frame, slab([w, h, 0.085], steelInner, 0.012), [MIDX + cx, cy, TRAY]);
  for (const [w, h, cx, cy] of trayHoles) {
    for (const sx of [-1, 1])
      put(frame, slab([0.09, h + 0.14, 0.19], rubber, 0.03), [
        MIDX + cx + (sx * (w + 0.07)) / 2,
        cy,
        TRAY + 0.02,
      ]);
    for (const sy of [-1, 1])
      put(frame, slab([w + 0.14, 0.09, 0.19], rubber, 0.03), [
        MIDX + cx,
        cy + (sy * (h + 0.07)) / 2,
        TRAY + 0.02,
      ]);
  }

  // Floor, with the supply's intake cut through it, and the roof.
  for (const [w, h, cx, cz] of plateWithHoles(
    DEPTH - COL * 2,
    WIDTH - COL * 2,
    [[3.6, 3.1, -1.9, 0.35]],
  ))
    put(frame, slab([w, 0.1, h], steel, 0.014), [
      MIDX + cx,
      FLOOR + 0.05,
      MIDZ + cz,
    ]);
  // The roof is a frame, not a lid: the mesh panel drops into the opening.
  // Laying a solid plate here and the mesh under it is what buried the lid.
  for (const [w, h, cx, cz] of plateWithHoles(
    DEPTH - COL * 2,
    WIDTH - COL * 2,
    [[DEPTH - COL * 2 - 0.9, WIDTH - COL * 2 - 0.9, 0, 0]],
  ))
    put(frame, slab([w, 0.09, h], steel, 0.014), [
      MIDX + cx,
      ROOF - 0.05,
      MIDZ + cz,
    ]);
  // The back side, closing the cable chamber.
  put(frame, slab([DEPTH - COL * 2, HEIGHT - 0.38, 0.09], steel, 0.014), [
    MIDX,
    0,
    BACK + 0.045,
  ]);

  /**
   * Feet. A tower stands on four of them, and the 20 mm they lift it by is
   * what feeds the supply's floor intake. Leaving them off is why the case
   * used to look like it had been dropped through the table.
   */
  for (const fx of [REAR + 0.75, FRONT - 0.75])
    for (const fz of [BACK + 0.75, GLASS - 0.75]) {
      const foot = new T.Group();
      put(foot, slab([0.72, 0.2, 0.72], alu, 0.06), [0, 0.1, 0]);
      put(foot, slab([0.56, 0.22, 0.56], rubber, 0.09), [0, -0.08, 0]);
      put(frame, foot, [fx, FLOOR - 0.2, fz]);
    }

  // The filter in the floor, below the supply's intake.
  const filter = buildPerforation(material, 3.5, 3.0, 0.03, 0.1, '#1a1e21');
  filter.rotation.x = Math.PI / 2;
  put(frame, filter, [MIDX - 1.9, FLOOR - 0.07, MIDZ + 0.35]);

  /**
   * The intake channel: a perforated column behind the front glass.
   *
   * The front of a case like this is glass, so air cannot come through it.
   * It comes in down the front edge instead, through a full-height perforated
   * strip inboard of the corner column, and that is the wall the front fans
   * actually pull through.
   */
  const intake = buildPerforation(
    material,
    HEIGHT - 1.1,
    2.4,
    0.05,
    0.135,
    '#1e2225',
  );
  intake.rotation.y = Math.PI / 2;
  intake.rotation.x = Math.PI / 2;
  put(frame, intake, [FRONT - 0.34, 0, BACK + 1.5]);
  for (const cz of [BACK + 0.32, BACK + 2.68])
    put(frame, slab([0.14, HEIGHT - 0.9, 0.1], alu, 0.02), [
      FRONT - 0.34,
      0,
      cz,
    ]);

  // Front I/O, on the top rail where a tower like this puts it.
  const io = new T.Group();
  put(io, slab([0.5, 0.14, 0.5], aluBright, 0.05), [0, 0, 0]);
  const power = new T.Mesh(
    new T.CircleGeometry(0.09, 20),
    glowMaterial(s.accent, 1.6),
  );
  power.rotation.x = -Math.PI / 2;
  put(io, power, [0, 0.08, 0]);
  for (let i = 0; i < 3; i++)
    put(io, slab([0.3, 0.1, 0.13], finish('plasticGloss'), 0.02), [
      0,
      0.02,
      -0.5 - i * 0.34,
    ]);
  put(frame, io, [FRONT - 0.75, ROOF - 0.34, GLASS - 0.62]);

  add('chassis', frame, [0, 0, 0], [0, 0, -2.4]);

  // ── Expansion slot covers ───────────────────────────────────────────────
  const covers = new T.Group();
  // The installed 3.6-slot card occupies the first four openings.
  for (let i = 4; i < s.slots; i++) {
    const cover = new T.Group();
    put(
      cover,
      slab([0.07, s.slotPitch * 0.78, 1.9], steelInner, 0.012),
      [0, 0, 0],
    );
    // The thumbscrew tab that holds it, folded toward the inside.
    put(cover, slab([0.22, 0.3, 0.26], steelInner, 0.02), [
      0.11,
      s.slotPitch * 0.42,
      0.82,
    ]);
    put(cover, buildScrew(material, 0.07), [0.2, s.slotPitch * 0.42, 0.82]);
    put(covers, cover, [REAR + 0.16, s.slotY - i * s.slotPitch, s.slotZ]);
  }
  add('chassis', covers, [0, 0, 0], [-2.6, 0, 0]);

  // ── Panels ──────────────────────────────────────────────────────────────
  const glassMaterial = temperedGlass();

  /**
   * A glass panel in its frame: the pane, its polished edge trim and the four
   * rubber-bushed studs it hangs on.
   *
   * `axis` is which way the panel's width runs, and therefore which way it
   * faces: an 'x' panel spans the depth of the case and looks in from the
   * side, a 'z' panel spans the width and is the front. Getting this backwards
   * is not a subtle error - it stands both sheets of glass on the wrong axis,
   * so each one runs out through the walls it was supposed to close.
   */
  const pane = (w: number, h: number, axis: 'x' | 'z') => {
    const panel = new T.Group();
    const T_ = 0.07;
    const size: Vec3 = axis === 'x' ? [w, h, T_] : [T_, h, w];
    const across: Vec3 = axis === 'x' ? [1, 0, 0] : [0, 0, 1];
    const normal: Vec3 = axis === 'x' ? [0, 0, 1] : [1, 0, 0];
    panel.add(new T.Mesh(new T.BoxGeometry(...size), glassMaterial));
    // A narrow ceramic border and polished trim make the clear pane
    // readable without tinting away the hardware behind it.
    const ceramic = finish('plasticGloss', '#111619');
    const edge = finish('anodized', '#454e55', 0.13);
    const bar = (along: 'across' | 'up', length: number): Vec3 => {
      const d: Vec3 = [0.06, 0.06, 0.06];
      if (along === 'up') d[1] = length;
      else for (let i = 0; i < 3; i++) if (across[i]) d[i] = length;
      return d;
    };
    // Trim down all four edges, so the pane has a visible frame rather than
    // fading out into nothing where it meets the column.
    for (const sign of [-1, 1]) {
      const seal = bar('across', w - 0.08);
      seal[1] = 0.14;
      put(panel, slab(seal, ceramic), [0, sign * (h / 2 - 0.09), 0]);
      put(panel, slab(bar('across', w), edge, 0.012), [0, (sign * h) / 2, 0]);
      put(panel, slab(bar('up', h), edge, 0.012), [
        (across[0] * sign * w) / 2,
        0,
        (across[2] * sign * w) / 2,
      ]);
    }
    for (const sy of [-1, 1])
      for (const sw of [-1, 1])
        put(panel, slab([0.17, 0.17, 0.17], rubber, 0.07), [
          (across[0] * sw * (w - 0.8)) / 2 - normal[0] * 0.1,
          (sy * (h - 0.8)) / 2,
          (across[2] * sw * (w - 0.8)) / 2 - normal[2] * 0.1,
        ]);
    return panel;
  };

  // Side window. Up and out rather than straight at the camera, so a panel
  // this size does not park itself in front of everything it was covering.
  add(
    'sidepanel',
    pane(DEPTH - COL * 2 - 0.06, HEIGHT - 0.44, 'x'),
    [MIDX, 0, GLASS - 0.035],
    [0, 3.2, 3.6],
  );

  // Front glass, the other half of the corner.
  add(
    'frontpanel',
    pane(WIDTH - COL * 2 - 0.06, HEIGHT - 0.44, 'z'),
    [FRONT - 0.035, 0, MIDZ],
    [4.4, 1.4, 0],
  );

  // The solid side, behind the tray. Steel, with the thumbscrews that hold it.
  const backPanel = new T.Group();
  put(
    backPanel,
    slab([DEPTH - COL * 2 - 0.1, HEIGHT - 0.5, 0.08], steel, 0.02),
    [0, 0, 0],
  );
  put(
    backPanel,
    slab([DEPTH - COL * 2 - 0.5, 0.05, 0.04], alu, 0.01),
    [0, 0, -0.06],
  );
  for (const sy of [-1, 1])
    for (const sx of [-1, 1])
      put(backPanel, buildScrew(material, 0.08), [
        (sx * (DEPTH - COL * 2 - 0.7)) / 2,
        (sy * (HEIGHT - 1.1)) / 2,
        -0.07,
      ]);
  add('sidepanel', backPanel, [MIDX, 0, BACK - 0.04], [0, -1.2, -4.6]);

  /**
   * The lid: a mesh insert dropped into a recess in the roof rather than a
   * slab floating above it. The gap between a panel and its frame is the
   * detail that tells you whether a case was assembled or approximated, so
   * this one sits in its opening with the frame proud around it.
   */
  const top = new T.Group();
  const lidWidth = DEPTH - COL * 2 - 0.16;
  const lidDepth = WIDTH - COL * 2 - 0.16;
  // Open ventilation, with a folded perimeter and real rails underneath.
  for (const [w, d, x, z] of plateWithHoles(lidWidth, lidDepth, [
    [lidWidth - 0.55, lidDepth - 0.55, 0, 0],
  ]))
    put(top, slab([w, 0.09, d], alu, 0.02), [x, 0, z]);
  for (const x of [-4.6, 0, 4.6]) {
    put(top, slab([0.14, 0.1, lidDepth - 0.35], steelInner), [x, -0.09, 0]);
    for (const z of [-1, 1])
      put(top, buildScrew(material, 0.065), [
        x,
        0.08,
        z * (lidDepth / 2 - 0.16),
      ]);
  }
  const lid = buildPerforation(
    material,
    DEPTH - COL * 2 - 0.7,
    WIDTH - COL * 2 - 0.7,
    0.05,
    0.17,
    '#23282c',
  );
  lid.rotation.x = -Math.PI / 2;
  put(top, lid, [0, 0.06, 0]);
  put(top, slab([DEPTH - COL * 2 - 0.16, 0.05, 0.1], aluBright, 0.01), [
    0,
    0.04,
    (WIDTH - COL * 2 - 0.26) / 2,
  ]);
  label(
    top,
    'ATX',
    [(DEPTH - COL * 2) / 2 - 0.9, 0.1, -(WIDTH - COL * 2) / 2 + 0.5],
    0.9,
    '#6f787e',
  );
  add('toppanel', top, [MIDX, ROOF - 0.14, MIDZ], [0, 4.4, 0]);

  return { COL, MIDX, MIDZ, WIDTH, DEPTH, HEIGHT };
}
