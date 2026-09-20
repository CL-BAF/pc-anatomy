import * as T from 'three';
import type { ModelTools } from './hardware.ts';
import type { Vec3 } from './layout.ts';

/**
 * Inside a DDR5 memory module.
 *
 * Coordinates are millimetres in the module frame, 1 unit ≈ 6 mm: the 133.35
 * mm UDIMM comes out at about twenty-two units long. The board lies flat with
 * its 288-pin edge along -Z; the eight x8 packages sit single-sided on the top
 * face with power management and the SPD hub between them and the contacts.
 * Package count, rank count and layout describe the modelled educational
 * example only: a single-sided, single-rank module with eight x8 packages.
 */
export function buildDimm(tools: ModelTools, _root: T.Group) {
  const { add, box, pcb, label, material } = tools;
  const mm = (value: number) => value / 6;
  const place = (group: T.Group, object: T.Object3D, at: Vec3) => {
    object.position.set(...at);
    group.add(object);
  };

  // Module board: 133.35 mm long in a JEDEC height class, green memory mask.
  const board = new T.Group();
  board.add(pcb([mm(133.35), mm(1.27), mm(31.25)], 'memory'));
  label(board, 'DDR5 UDIMM · 8 × X8', [0, mm(0.8), mm(10)], mm(40), '#82998b');
  add('dimmboard', board, [0, 0, 0], [0, -1.2, 0]);

  // Eight x8 DRAM packages in one row: one rank spanning both subchannels,
  // four packages per subchannel. BGA joints stay underneath each package.
  const chipX = (i: number) => -57.75 + i * 16.5;
  for (let i = 0; i < 8; i++) {
    const chip = new T.Group();
    chip.add(box([mm(11), mm(1.2), mm(10)], '#171b20', 0.1, 0.015));
    const joints = new T.InstancedMesh(
      new T.SphereGeometry(mm(0.18), 6, 4),
      material('#9ca7b2', 0.8),
      48,
    );
    const matrix = new T.Matrix4();
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 8; col++) {
        matrix.makeTranslation(
          mm(((col - 3.5) * 11) / 10),
          -mm(0.7),
          mm(((row - 2.5) * 10) / 8),
        );
        joints.setMatrixAt(row * 8 + col, matrix);
      }
    chip.add(joints);
    label(chip, 'x8', [0, mm(0.9), 0], mm(8), '#c4cccf');
    add(
      'dramchip',
      chip,
      [mm(chipX(i)), mm(1.4), mm(6)],
      [(i < 4 ? -1 : 1) * 0.5, 1.7, 0.4],
    );
  }

  // On-module power management and SPD hub between the packages and the edge.
  const pmic = new T.Group();
  pmic.add(box([mm(7), mm(1), mm(7)], '#1b1e21', 0.1, 0.01));
  label(pmic, 'PMIC', [0, mm(0.8), 0], mm(6), '#8c9499');
  add('dimmpmic', pmic, [mm(-8), mm(1.2), mm(-4)], [-0.5, 1.6, -0.4]);

  const spd = new T.Group();
  spd.add(box([mm(5), mm(1), mm(5)], '#1b1e21', 0.1, 0.01));
  label(spd, 'SPD', [0, mm(0.8), 0], mm(4.5), '#8c9499');
  add('dimmspd', spd, [mm(8), mm(1.2), mm(-4)], [0.5, 1.6, -0.4]);

  // 288-pin edge contacts with the DDR5 key gap: two fingers fields split
  // around the key, the way the slot key never passes through the fingers.
  const contacts = new T.Group();
  for (const [center, width] of [
    [-33.5, 60],
    [26.5, 60],
  ]) {
    place(contacts, box([mm(width), mm(0.8), mm(3)], '#284a3b', 0.25), [
      mm(center),
      0,
      mm(-14.5),
    ]);
  }
  for (let i = 0; i < 96; i++) {
    const x = -63.5 + i * 1.34;
    if (x > -6 && x < 0) continue;
    for (const side of [-1, 1]) {
      place(
        contacts,
        box([mm(0.7), mm(0.08), mm(2.2)], '#d5b96b', 0.9, 0.002),
        [mm(x), side * mm(0.45), mm(-14.5)],
      );
    }
  }
  add('dimmcontacts', contacts, [0, 0, 0], [0, -0.4, -1.8]);
}
