import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { ModelTools } from './hardware.ts';
import type { Vec3 } from './layout.ts';
import type { Finisher } from './materials.ts';
import { glowMaterial } from './parts.ts';

/**
 * One graphics card, built once and used at both scales.
 *
 * The card used to be modelled twice: a detailed two-fan version at its own
 * scale and a separate, cruder two-fan slab inside the tower. Two models of
 * one object drift, and these had — different proportions, different shroud,
 * different fans — so the card you pulled out of the machine was visibly not
 * the card that had been in it. Everything below is the single source, and
 * both callers build from it.
 *
 * It is also now a triple-fan card, which is what a card in this class
 * actually is. Nearly every 5090 on sale is a three-fan, three-slot board from
 * a partner manufacturer; two fans belonged to a much smaller card.
 *
 * ── Proportions ──────────────────────────────────────────────────────────
 * Everything is a fraction of the card's LENGTH, so one number sizes the whole
 * card and the two scales cannot disagree about its shape. The fractions are
 * taken from a 3.5-slot partner card of roughly 350 × 150 × 75 mm.
 *
 * ── Local frame ──────────────────────────────────────────────────────────
 *   +X  along the card, away from the bracket   −X  the bracket end
 *   +Y  out of the board, the way the fans face
 *   +Z  across the card
 *
 * A card in a tower hangs cooler-downward, so `machine.ts` installs this by
 * turning it half a turn about X. That also swaps which long edge faces the
 * window, which is what `logoEdge` is for.
 */
export const CARD = {
  /** Across the slot, ÷ length. A 350 mm card stands about 150 mm tall. */
  width: 0.428,
  /** Total thickness of the cooler, ÷ length: three and a half slots. */
  depth: 0.214,
  /**
   * Where the three fans sit along the card, ÷ length.
   *
   * Spacing and radius are a pair, not two free numbers. The apertures are cut
   * out of one extruded plate, and two openings that overlap leave the plate's
   * top face impossible to triangulate: three.js then silently gives up on the
   * second and third holes and returns a solid panel with two faint circles
   * drawn on it. Keep `2 × fanRadius` comfortably under this spacing.
   */
  fans: [-0.315, 0, 0.315] as const,
  /** Fan radius ÷ length: about a 105 mm fan on a 350 mm card. */
  fanRadius: 0.15,
  /** The board inside is far shorter than the cooler around it. */
  pcb: { length: 0.63, width: 0.33 },
};

/**
 * One axial fan blade, swept and twisted, with real thickness and closed rims.
 *
 * Authored at unit radius so a caller scales it to whatever fan it needs. A
 * flat fin rotated round a hub reads as a paper windmill; the sweep, the
 * twist toward the tip and the closed edge are what make it read as a moulded
 * impeller.
 */
export function bladeGeometry() {
  const verts: number[] = [],
    indices: number[] = [];
  const rows = 13,
    cols = 6;
  for (let side = 0; side < 2; side++)
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const t = r / (rows - 1),
          u = c / (cols - 1) - 0.5;
        const radius = (0.32 + t * 1.13) / 1.45;
        const angle = 0.35 * Math.pow(t, 1.3) + u * (0.52 - 0.11 * t);
        const height =
          (0.12 * Math.sin(t * Math.PI * 0.85) + u * 0.24 * (0.25 + t)) / 1.45;
        verts.push(
          Math.cos(angle) * radius,
          height + side * (0.027 / 1.45),
          Math.sin(angle) * radius,
        );
      }
  for (let side = 0; side < 2; side++)
    for (let r = 0; r < rows - 1; r++)
      for (let c = 0; c < cols - 1; c++) {
        const a = side * rows * cols + r * cols + c,
          b = a + 1,
          d = a + cols,
          e = d + 1;
        indices.push(...(side ? [a, d, b, b, d, e] : [a, b, d, b, e, d]));
      }
  const layer = rows * cols;
  for (let r = 0; r < rows - 1; r++)
    for (const c of [0, cols - 1]) {
      const a = r * cols + c,
        b = (r + 1) * cols + c;
      indices.push(a, a + layer, b, b, a + layer, b + layer);
    }
  for (let c = 0; c < cols - 1; c++)
    for (const r of [0, rows - 1]) {
      const a = r * cols + c,
        b = a + 1;
      indices.push(a, b, a + layer, b, b + layer, a + layer);
    }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * One fan: nine blades on a hub, inside a rim.
 *
 * Blade count matters more than it looks. A card fan has an odd, prime-ish
 * count so the blades do not line up with the fins beneath and drone; nine is
 * the usual answer on a card this size.
 */
export function buildAxialFan(
  finish: Finisher,
  radius: number,
  blades: T.BufferGeometry,
  detail: 'full' | 'plain' = 'full',
) {
  const fan = new T.Group();
  const count = 9;
  const impeller = new T.InstancedMesh(
    blades,
    finish('plastic', '#191d20'),
    count,
  );
  const helper = new T.Object3D();
  for (let i = 0; i < count; i++) {
    helper.position.set(0, 0, 0);
    helper.rotation.set(0, (i * Math.PI * 2) / count, 0);
    helper.scale.setScalar(radius);
    helper.updateMatrix();
    impeller.setMatrixAt(i, helper.matrix);
  }
  impeller.userData.spinRate = 6.4;
  fan.add(impeller);
  // The hub, and the plate on top of it that carries the marking.
  const hub = new T.Mesh(
    new T.CylinderGeometry(radius * 0.22, radius * 0.27, radius * 0.17, 40),
    finish('plasticGloss', '#1b1f22'),
  );
  hub.position.y = radius * 0.03;
  fan.add(hub);
  const cap = new T.Mesh(
    new T.CylinderGeometry(radius * 0.165, radius * 0.165, radius * 0.01, 40),
    finish('anodizedLight', '#7d868c'),
  );
  cap.position.y = radius * 0.12;
  fan.add(cap);
  if (detail === 'full')
    // The ring that ties the blade tips together. A rim-linked fan is the
    // current standard on a card: it holds static pressure through a dense
    // fin stack where a free-tip fan would spill at the edge.
    for (const [r, y] of [
      [radius * 1.0, radius * 0.005],
      [radius * 0.985, radius * 0.055],
    ] as const) {
      const ring = new T.Mesh(
        new T.TorusGeometry(r, radius * 0.018, 8, 64),
        finish('anodized', '#4a5258'),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      fan.add(ring);
    }
  return fan;
}

export type CardParts = {
  shroud: T.Group;
  fans: { object: T.Group; x: number }[];
  backplate: T.Group;
  bracket: T.Group;
  /** Fin banks, one under each fan, for callers that want them separately. */
  fins: T.Group;
};

/**
 * The cooler assembly, sized to a card of length `L` in the caller's units.
 *
 * `logoEdge` is which long edge carries the lit wordmark: +1 puts it on the
 * +Z side, −1 on the −Z side. The tower turns the card half over to install
 * it, so it asks for −1 in order to end up with the mark facing the window.
 */
export function buildCardCooler(
  tools: ModelTools,
  finish: Finisher,
  L: number,
  options: {
    logoEdge?: 1 | -1;
    accent?: string;
    detail?: 'full' | 'plain';
  } = {},
): CardParts {
  const { material, label } = tools;
  const { logoEdge = 1, accent = '#37d6ff', detail = 'full' } = options;
  const W = CARD.width * L,
    D = CARD.depth * L,
    R = CARD.fanRadius * L;
  const slab = (size: Vec3, mat: T.Material, radius = L * 0.004) =>
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

  const dark = finish('anodized', '#23282d');
  const mid = finish('anodized', '#31383e');
  const bright = finish('anodizedLight', '#828b92');
  const alu = finish('brushed', '#5e666c');

  /**
   * The top face, with three apertures cut in it.
   *
   * Cut, not covered: a plate with three discs laid on it reads as a sticker,
   * and the rim round each opening is most of what tells you the shroud has
   * thickness. Shapes with holes extrude cleanly, so this is one piece.
   */
  const shroud = new T.Group();
  const face = new T.Shape();
  const hx = L / 2,
    hz = W / 2,
    corner = L * 0.018;
  face.moveTo(-hx + corner, -hz);
  face.lineTo(hx - corner, -hz);
  face.quadraticCurveTo(hx, -hz, hx, -hz + corner);
  face.lineTo(hx, hz - corner);
  face.quadraticCurveTo(hx, hz, hx - corner, hz);
  face.lineTo(-hx + corner, hz);
  face.quadraticCurveTo(-hx, hz, -hx, hz - corner);
  face.lineTo(-hx, -hz + corner);
  face.quadraticCurveTo(-hx, -hz, -hx + corner, -hz);
  for (const f of CARD.fans) {
    const hole = new T.Path();
    hole.absarc(f * L, 0, R, 0, Math.PI * 2, true);
    face.holes.push(hole);
  }
  const plate = new T.ExtrudeGeometry(face, {
    depth: L * 0.012,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: L * 0.003,
    bevelThickness: L * 0.002,
    curveSegments: detail === 'full' ? 44 : 22,
  });
  plate.rotateX(-Math.PI / 2);
  put(shroud, new T.Mesh(plate, dark), [0, 0, 0]);

  // A raised rim round each aperture, and the four-arm spider that would carry
  // the motor. Both are what a fan opening actually looks like from above.
  for (const f of CARD.fans) {
    const rim = new T.Mesh(
      new T.TorusGeometry(R * 1.015, L * 0.005, 8, detail === 'full' ? 56 : 28),
      bright,
    );
    rim.rotation.x = Math.PI / 2;
    put(shroud, rim, [f * L, L * 0.006, 0]);
  }

  /**
   * The sides and ends, which are bands rather than walls.
   *
   * A cooler closed on all four faces is a box, and a box is what this looked
   * like: the fin stack, which is the entire point of the object, was sealed
   * inside where nothing could see it. A real card is open below the shroud
   * lip and open at both ends, because that is where the air leaves. So each
   * side gets a deep band under the top face and a thin lip at the bottom,
   * with the fins showing through the gap between them.
   */
  for (const sz of [-1, 1] as const) {
    const z = sz * (W / 2 - W * 0.037);
    put(shroud, slab([L, D * 0.4, W * 0.075], mid), [0, -D * 0.25, z]);
    put(shroud, slab([L, D * 0.11, W * 0.075], mid), [0, -D * 0.805, z]);
    // A chamfered arris along the top edge, which is the line that catches the
    // light and gives the card its edge against a dark case.
    put(shroud, slab([L * 0.985, L * 0.012, L * 0.012], bright), [
      0,
      -L * 0.004,
      sz * (W / 2 - L * 0.008),
    ]);
  }
  // The ends, open below their own band so the stack vents out of the card.
  for (const sx of [-1, 1] as const) {
    put(shroud, slab([W * 0.05, D * 0.4, W], mid), [
      sx * (L / 2 - W * 0.025),
      -D * 0.25,
      0,
    ]);
    put(shroud, slab([W * 0.05, D * 0.11, W], mid), [
      sx * (L / 2 - W * 0.025),
      -D * 0.805,
      0,
    ]);
  }
  // The angular facet across the top. Partner cards all carry some version of
  // this crease; a flat rectangle with three holes in it is the one thing they
  // never look like.
  for (const f of [-0.1575, 0.1575]) {
    const crease = slab([L * 0.03, L * 0.014, W * 0.94], alu);
    crease.rotation.y = 0.13;
    put(shroud, crease, [f * L, L * 0.004, 0]);
  }

  /**
   * The lit wordmark down one edge, and the power socket on the top edge.
   *
   * The card is named nominatively, the way the rest of this project names the
   * three parts it models as specific subjects. No manufacturer's own mark,
   * shroud styling or trade dress is reproduced here: this is a generic
   * partner-style cooler, not a copy of any one company's card.
   */
  const bar = new T.Mesh(
    new T.PlaneGeometry(L * 0.34, L * 0.008),
    glowMaterial(accent, 1.45),
  );
  // A plane faces +Z. Turning it half a turn about Y is what points it the
  // other way; turning it about X *and* Y is a half turn about Z, which spins
  // it in its own plane and leaves it still facing +Z.
  if (logoEdge < 0) bar.rotation.y = Math.PI;
  put(shroud, bar, [L * 0.06, -D * 0.12, logoEdge * (W / 2 + L * 0.001)]);
  const wordmark = new T.Group();
  label(wordmark, 'GEFORCE RTX 5090', [0, 0, 0], L * 0.26, '#aab3ba');
  wordmark.rotation.x = Math.PI / 2;
  if (logoEdge < 0) wordmark.rotation.z = Math.PI;
  put(shroud, wordmark, [L * 0.06, -D * 0.3, logoEdge * (W / 2 + L * 0.002)]);

  // The 12V-2x6 socket, on the top edge where a card of this draw puts it.
  const socket = new T.Group();
  put(
    socket,
    slab([L * 0.062, L * 0.03, L * 0.022], finish('plasticGloss')),
    [0, 0, 0],
  );
  // Twelve high-current contacts in two rows, plus four smaller sense
  // contacts. This is the feature that distinguishes 12V-2x6 / 12VHPWR from
  // an ordinary PCIe 8-pin block at a glance.
  for (let i = 0; i < 12; i++)
    put(socket, slab([L * 0.007, L * 0.012, L * 0.008], finish('nickel')), [
      -L * 0.021 + (i % 6) * L * 0.0084,
      L * 0.006,
      (Math.floor(i / 6) - 0.5) * L * 0.01,
    ]);
  for (let i = 0; i < 4; i++)
    put(socket, slab([L * 0.003, L * 0.006, L * 0.004], finish('nickel')), [
      -L * 0.0075 + i * L * 0.005,
      L * 0.012,
      L * 0.014,
    ]);
  put(shroud, socket, [L * 0.1, L * 0.012, -logoEdge * W * 0.2]);

  /** Fin banks, one under each fan, visible through the apertures and ends. */
  const fins = new T.Group();
  const finMaterial = material('#5f686e', 0.9, 0.3);
  const finGeometry = new T.BoxGeometry(L * 0.0016, D * 0.62, W * 0.9);
  const perBank = detail === 'full' ? 54 : 26;
  for (const f of CARD.fans) {
    const bank = new T.InstancedMesh(finGeometry, finMaterial, perBank);
    const helper = new T.Object3D();
    for (let i = 0; i < perBank; i++) {
      helper.position.set(
        f * L + (i - (perBank - 1) / 2) * ((R * 2.05) / perBank),
        0,
        0,
      );
      helper.rotation.set(0, 0, 0);
      helper.scale.set(1, 1, 1);
      helper.updateMatrix();
      bank.setMatrixAt(i, helper.matrix);
    }
    bank.castShadow = bank.receiveShadow = true;
    fins.add(bank);
  }

  /**
   * The backplate, with the flow-through window at the far end.
   *
   * That opening is not decoration: the fin stack past the end of the board is
   * open on both faces so the third fan can blow straight through the card
   * instead of back into the case. It is the defining feature of the rear half
   * of a modern card and the reason they are as long as they are.
   */
  const backplate = new T.Group();
  const bp = new T.Shape();
  const bx = L / 2,
    bz = W / 2;
  bp.moveTo(-bx, -bz);
  bp.lineTo(bx, -bz);
  bp.lineTo(bx, bz);
  bp.lineTo(-bx, bz);
  const vent = new T.Path();
  const v0 = L * 0.17,
    v1 = L * 0.46,
    vz = W * 0.36;
  vent.moveTo(v0, -vz);
  vent.lineTo(v1, -vz);
  vent.lineTo(v1, vz);
  vent.lineTo(v0, vz);
  bp.holes.push(vent);
  const bpGeometry = new T.ExtrudeGeometry(bp, {
    depth: L * 0.008,
    bevelEnabled: false,
  });
  bpGeometry.rotateX(-Math.PI / 2);
  put(
    backplate,
    new T.Mesh(bpGeometry, finish('anodized', '#20252a')),
    [0, 0, 0],
  );
  /**
   * Everything on the backplate goes on its OUTER face, which is −Y here.
   *
   * The canonical card has its fans on +Y, so the backplate's outside points
   * the other way. Decorating the +Y face puts the detail on the side that is
   * pressed against the board, where it is invisible at this scale and buried
   * at the other. And the outer face is not a minor one: in the tower the card
   * hangs cooler-downward, so this plate is the whole of the card you see.
   *
   * It is also kept dark. A polished sheet at metalness 0.94 takes its colour
   * from the room rather than from itself, and a large one over the middle of
   * the card turned the whole top of it pale grey.
   */
  put(
    backplate,
    slab([L * 0.5, L * 0.005, W * 0.55], finish('anodized', '#262c31')),
    [-L * 0.18, -L * 0.006, 0],
  );
  put(backplate, slab([L * 0.22, L * 0.004, W * 0.2], alu), [
    -L * 0.3,
    -L * 0.009,
    0,
  ]);
  // Ribs and fixings, so the plate is not a blank sheet from above.
  for (let i = 0; i < 5; i++)
    put(
      backplate,
      slab([L * 0.012, L * 0.012, W * 0.66], finish('anodized', '#1b2024')),
      [-L * 0.4 + i * L * 0.13, -L * 0.011, 0],
    );
  for (const sx of [-1, 1] as const)
    for (const sz of [-1, 1] as const)
      put(backplate, slab([L * 0.02, L * 0.012, L * 0.02], bright), [
        sx * L * 0.44,
        -L * 0.011,
        sz * (W / 2 - L * 0.03),
      ]);
  for (const sz of [-1, 1] as const)
    put(
      backplate,
      slab([L * 0.96, L * 0.01, L * 0.01], finish('anodized', '#343b41')),
      [0, -L * 0.011, sz * (W / 2 - L * 0.012)],
    );
  const mark = new T.Group();
  label(mark, 'RTX 5090', [0, 0, 0], L * 0.13, '#8b949a');
  // The label plane faces +Y after `label` lays it flat, so it has to be
  // turned over to be read from the outer face.
  mark.rotation.x = Math.PI;
  put(backplate, mark, [-L * 0.3, -L * 0.015, 0]);

  /**
   * The bracket: the slot-width plate at the board end, with the display
   * outputs and the vent above them.
   */
  const bracket = new T.Group();
  // The plate lies in the Y-Z plane. Its long axis is the card's height, which
  // is Z here, and its short axis is the two slots of thickness it occupies,
  // which is Y. Building it the other way round stands the bracket on end and
  // runs it out through the top of the cooler.
  // The plate spans the card's own thickness. Hung below the board instead, it
  // sticks out past the top of the card and stands proud of the rear panel.
  const steel = finish('steel', '#8d959b');
  put(bracket, slab([L * 0.012, D * 0.92, W * 0.92], steel), [0, 0, 0]);
  // The folded tab that the case screws through, at the end that meets it.
  put(bracket, slab([L * 0.03, D * 0.9, W * 0.1], steel), [
    L * 0.012,
    0,
    W * 0.46,
  ]);
  // Three DisplayPort and one HDMI: the output set on a card of this class,
  // stacked down the bracket with the vent above them.
  for (let i = 0; i < 4; i++)
    put(
      bracket,
      slab([L * 0.016, D * 0.24, W * 0.16], finish('plasticGloss')),
      [-L * 0.005, -D * 0.02, W * 0.29 - i * W * 0.2],
    );
  for (let i = 0; i < 24; i++)
    put(
      bracket,
      slab([L * 0.005, D * 0.05, W * 0.03], finish('steel', '#434a50')),
      [
        L * 0.004,
        D * 0.2 + (i % 2) * D * 0.12,
        W * 0.38 - Math.floor(i / 2) * W * 0.055,
      ],
    );

  const blades = bladeGeometry();
  const fans = CARD.fans.map((f) => ({
    object: buildAxialFan(finish, R, blades, detail),
    x: f * L,
  }));

  return { shroud, fans, backplate, bracket, fins };
}

/**
 * Where each part of the card sits along the card's own thickness.
 *
 * Both scales stack the card from the same table, so the fans sit the same
 * distance under the shroud face and the board the same distance above the
 * backplate whichever scale you are looking at. Returned in the caller's
 * units, from a card of length `L`.
 */
export function cardStack(L: number) {
  const D = CARD.depth * L;
  return {
    /** The shroud's top face, and therefore the top of the card. */
    shroud: D,
    /** Fans, seated just inside their apertures. */
    fan: D - L * 0.03,
    /** The fin banks, filling the space between the fans and the board. */
    fins: D * 0.5,
    /** The board. */
    pcb: 0,
    /** The backplate, just under the board. */
    backplate: -L * 0.019,
    /** The bracket spans the card's thickness, so it is centred on it. */
    bracket: D * 0.46,
  };
}
