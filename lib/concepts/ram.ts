import { concept, type Concept } from '../concept.ts';

/**
 * Inside the memory module.
 *
 * The modelled module is one educational example: a single-sided, single-rank
 * DDR5 UDIMM with eight x8 packages. Real modules vary in package count, rank
 * count and layout; the deeper scales follow one 16 Gb x8 die from such a
 * module. Package placement, bank-block sizes and the cell grid are
 * illustrative throughout.
 */
export const ramConcepts: Concept[] = [
  // ── DDR5 module (physical) ────────────────────────────────────────────
  concept({
    id: 'dimmboard',
    name: 'Module circuit board',
    shortName: 'Module board',
    category: 'Board',
    parent: 'ram',
    level: 'dimm',
    description:
      'The module circuit board of the educational example: a single-sided, single-rank DDR5 UDIMM, 133.35 mm long in a JEDEC height class. Real modules vary in package count, rank count and layout.',
    purpose:
      'Carries eight DRAM packages, power management and the SPD hub, and plugs into a motherboard DIMM slot on 288 edge contacts.',
    quantity: '1 modelled board',
    specifications: {
      Length: '133.35 mm, JEDEC height class',
      Contacts: '288-pin DDR5',
      Subchannels: '2 × 32-bit data (40-bit capable) per JEDEC',
      Example: 'Single-sided, single rank; real modules vary',
    },
    representationType: 'physical',
    physicalAccuracy:
      'Representative DDR5 UDIMM example. Outline length follows the DDR5 module form factor; height class, package population and routing are illustrative, not a specific product.',
    sources: ['ddr5', 'ddr5architecture', 'jedecddr5'],
    searchTerms: ['dimm', 'udimm', 'module', 'ddr5', 'memory board'],
  }),
  concept({
    id: 'dramchip',
    name: 'DRAM packages',
    shortName: 'DRAM chip',
    category: 'Memory',
    parent: 'ram',
    level: 'dimm',
    open: 'dram',
    description:
      'Eight x8 DRAM packages on one side of the example module: one single rank spanning both 32-bit subchannels, four packages per subchannel. Each package die holds all of the banks; the rank operates in lockstep.',
    purpose:
      'Stores the bits. Selecting the rank addresses one 64-bit-wide set across both subchannels at once.',
    quantity: '8 illustrative packages, 1 rank',
    specifications: {
      Width: '8 × x8 packages, single rank',
      Subchannels: '4 packages per subchannel',
      Example: 'Single-sided; real modules vary',
    },
    representationType: 'physical',
    physicalAccuracy:
      'Representative DDR5 UDIMM example. Package count and single-sided placement describe the modelled module only; real modules vary in packages, ranks and layout.',
    sources: ['ddr5', 'ddr5architecture', 'jedecddr5'],
    searchTerms: ['dram', 'chip', 'package', 'rank', 'x8', 'memory'],
  }),
  concept({
    id: 'dimmpmic',
    name: 'Module power management',
    shortName: 'PMIC',
    category: 'Power',
    parent: 'ram',
    level: 'dimm',
    description:
      'The on-module power management IC: a DDR5 change from board-supplied regulation. A client UDIMM carries no register clock driver.',
    purpose:
      'Converts the slot supply to the low voltages the DRAM needs, beside the packages it feeds.',
    quantity: '1 modelled IC',
    specifications: { Role: 'On-module regulation, DDR5 feature' },
    representationType: 'physical',
    physicalAccuracy:
      'Representative DDR5 UDIMM example. Presence of on-module regulation follows JEDEC DDR5; exact part and placement are illustrative.',
    sources: ['ddr5', 'ddr5architecture', 'jedecddr5'],
    searchTerms: ['pmic', 'power', 'regulator', 'voltage', 'ddr5'],
  }),
  concept({
    id: 'dimmspd',
    name: 'SPD hub',
    shortName: 'SPD hub',
    category: 'Board',
    parent: 'ram',
    level: 'dimm',
    description:
      'The serial presence detect hub beside the power management IC on the example module.',
    purpose:
      'Holds the module profile that firmware reads while training memory at boot.',
    quantity: '1 modelled hub',
    specifications: { Role: 'Module profile for memory training' },
    representationType: 'physical',
    physicalAccuracy:
      'Representative DDR5 UDIMM example. Role follows published module architecture; exact part and placement are illustrative.',
    sources: ['ddr5', 'ddr5architecture', 'jedecddr5'],
    searchTerms: ['spd', 'hub', 'eeprom', 'training', 'profile'],
  }),
  concept({
    id: 'dimmcontacts',
    name: 'Module edge contacts',
    shortName: 'Edge contacts',
    category: 'Memory',
    parent: 'ram',
    level: 'dimm',
    description:
      'Gold-plated edge fingers with the DDR5 keying notch along the bottom edge of the example module.',
    purpose:
      'Carries two subchannel buses, command, power and sideband signals through the DIMM slot; the key controls mechanical compatibility.',
    quantity: '1 illustrative contact field',
    specifications: { Contacts: '288-pin DDR5', Key: 'DDR5 notch position' },
    representationType: 'physical',
    physicalAccuracy:
      'Representative DDR5 UDIMM example. Contact count and keying follow the DDR5 module form factor; exact finger detail is illustrative.',
    sources: ['ddr5', 'ddr5architecture', 'jedecddr5'],
    searchTerms: ['contacts', 'edge', '288-pin', 'key', 'notch', 'fingers'],
  }),

  // ── DRAM package (physical) ───────────────────────────────────────────
  concept({
    id: 'dramsubstrate',
    name: 'DRAM package substrate',
    shortName: 'Substrate',
    category: 'Board',
    parent: 'dramchip',
    level: 'dram',
    description:
      'The ball-grid-array substrate one DRAM package is built on, shown opened for illustration.',
    purpose:
      'Fans the die connections out to the solder balls that join the package to the module board.',
    quantity: '1 modelled substrate',
    specifications: { Package: 'BGA, x8 width' },
    representationType: 'physical',
    physicalAccuracy:
      'Illustrative opened package view. The package is sealed in reality; substrate routing and internal construction are not claimed.',
    sources: ['micronddr5', 'jedecddr5', 'packaging'],
    searchTerms: ['substrate', 'bga', 'package', 'interposer'],
  }),
  concept({
    id: 'dramdie',
    name: 'DRAM die',
    shortName: 'DRAM die',
    category: 'Memory',
    parent: 'dramchip',
    level: 'dram',
    open: 'banks',
    description:
      'One 16 Gbit x8 DRAM die from the example package, shown lifted from its substrate for illustration. The package is sealed in reality.',
    purpose:
      'Holds the bank array explored at the next scale: 32 banks in 8 bank groups on a 16 Gb or larger x8 die.',
    quantity: '1 modelled die',
    specifications: {
      Density: '16 Gbit, x8 width',
      Banks: '32 on 16 Gb or larger x8 die',
    },
    representationType: 'physical',
    physicalAccuracy:
      'Illustrative opened package view. The package is sealed in reality; die size and internal construction are not claimed.',
    sources: ['micronddr5', 'jedecddr5', 'packaging'],
    searchTerms: ['die', 'dram', '16 gbit', 'silicon', 'chip'],
  }),
  concept({
    id: 'dramball',
    name: 'Solder ball grid',
    shortName: 'Solder balls',
    category: 'Board',
    parent: 'dramchip',
    level: 'dram',
    description:
      'The grid of solder balls beneath the example package substrate, shown with the package opened for illustration.',
    purpose:
      'Joins the package to the module board for signals and power across the whole footprint.',
    quantity: '1 illustrative ball grid',
    specifications: { Package: 'BGA ball grid, x8 width' },
    representationType: 'physical',
    physicalAccuracy:
      'Illustrative opened package view. The package is sealed in reality; ball count and placement are illustrative.',
    sources: ['micronddr5', 'jedecddr5', 'packaging'],
    searchTerms: ['solder', 'balls', 'bga', 'grid', 'joints'],
  }),

  // ── DRAM banks (logical) ──────────────────────────────────────────────
  concept({
    id: 'drambank',
    name: 'DRAM bank',
    shortName: 'Bank',
    category: 'Memory',
    parent: 'dramdie',
    level: 'banks',
    open: 'bank',
    description:
      'One of 32 independent banks on a 16 Gb or larger x8 die, grouped four to a bank group across 8 groups. Every package die holds all 32 banks and the rank operates in lockstep; early 8 Gb x4/x8 and all x16 dies hold 16 instead.',
    purpose:
      'Each bank is an independent array with its own row decoder and sense-amp row buffer, holding one open row at a time so banks can overlap their work.',
    quantity: '32 modelled banks in 8 groups of 4',
    specifications: {
      Banks: '32 on 16 Gb or larger x8 die',
      Groups: '8 bank groups × 4 banks',
    },
    representationType: 'logical',
    physicalAccuracy:
      'Documented logical architecture. Block size and placement are illustrative; exact transistor-level placement is not publicly available.',
    sources: ['jedecddr5', 'micronddr5', 'skhynixddr5'],
    searchTerms: ['bank', 'bank group', 'array', 'ddr5', 'dram'],
  }),
  concept({
    id: 'dramio',
    name: 'DRAM I/O and control periphery',
    shortName: 'I/O periphery',
    category: 'Memory',
    parent: 'dramdie',
    level: 'banks',
    description:
      'The input/output, command decoding, refresh control and data-path periphery around the bank array of the modelled die.',
    purpose:
      'Moves commands, addresses and data between the subchannel buses and the banks, and schedules refresh across them.',
    quantity: '1 modelled periphery block',
    specifications: { Role: 'I/O, control and refresh' },
    representationType: 'logical',
    physicalAccuracy:
      'Documented logical architecture. Block size and placement are illustrative; exact transistor-level placement is not publicly available.',
    sources: ['jedecddr5', 'micronddr5', 'skhynixddr5'],
    searchTerms: ['io', 'periphery', 'control', 'refresh', 'phy', 'command'],
  }),

  // ── Bank: rows, columns and cells (logical) ───────────────────────────
  concept({
    id: 'dramcell',
    name: 'Memory cells',
    shortName: 'Cells',
    category: 'Memory',
    parent: 'drambank',
    level: 'bank',
    description:
      'An illustrative sample of the storage cells in one bank row: each cell is one transistor plus one capacitor (1T1C). A real 16 Gb x8 bank holds tens of thousands of rows of about a thousand columns each; this grid is magnified and not to scale.',
    purpose:
      'Each cell holds one bit as charge. Reading a row is destructive and its values are written back from the row buffer.',
    quantity: 'Illustrative sample grid, about 16 rows × 8 columns',
    specifications: { Cell: '1T1C, one transistor and one capacitor' },
    representationType: 'logical',
    physicalAccuracy:
      'Documented logical architecture. Block size and placement are illustrative; exact transistor-level placement is not publicly available.',
    sources: ['jedecddr5', 'skhynixddr5', 'dramfundamentals'],
    searchTerms: ['cell', '1t1c', 'capacitor', 'transistor', 'bit', 'array'],
  }),
  concept({
    id: 'dramrow',
    name: 'Wordlines and rows',
    shortName: 'Rows',
    category: 'Memory',
    parent: 'drambank',
    level: 'bank',
    description:
      'An illustrative sample of the wordlines running across one bank: selecting a wordline opens its row into the sense amplifiers. A real 16 Gb x8 bank selects among 65,536 rows; this sample shows a handful.',
    purpose:
      'Addressing a row stages a whole page of cells into the row buffer at once; one row stays open per bank at a time.',
    quantity: 'Illustrative sample of rows',
    specifications: { Real: '65,536 rows on 16 Gb x8 (16 row bits)' },
    representationType: 'logical',
    physicalAccuracy:
      'Documented logical architecture. Block size and placement are illustrative; exact transistor-level placement is not publicly available.',
    sources: ['jedecddr5', 'skhynixddr5', 'dramfundamentals'],
    searchTerms: ['row', 'wordline', 'page', 'open row', 'ras'],
  }),
  concept({
    id: 'dramcolumn',
    name: 'Bitlines and columns',
    shortName: 'Columns',
    category: 'Memory',
    parent: 'drambank',
    level: 'bank',
    description:
      'An illustrative sample of the bitline pairs running down one bank to the sense amplifiers. A real 16 Gb x8 bank selects among about a thousand columns per row; this sample shows a handful.',
    purpose:
      'Addressing columns picks values out of the open row for transfer without disturbing the rest of it.',
    quantity: 'Illustrative sample of columns',
    specifications: { Real: 'About 1024 columns per row on 16 Gb x8' },
    representationType: 'logical',
    physicalAccuracy:
      'Documented logical architecture. Block size and placement are illustrative; exact transistor-level placement is not publicly available.',
    sources: ['jedecddr5', 'skhynixddr5', 'dramfundamentals'],
    searchTerms: ['column', 'bitline', 'cas', 'page'],
  }),
  concept({
    id: 'dramrowdec',
    name: 'Row decoder',
    shortName: 'Row decoder',
    category: 'Memory',
    parent: 'drambank',
    level: 'bank',
    description:
      'The decoder block at the edge of the modelled bank array that turns a row address into one selected wordline.',
    purpose:
      'Selects which row opens into the sense amplifiers when a bank is activated.',
    quantity: '1 modelled decoder block',
    specifications: { Role: 'Row address to wordline select' },
    representationType: 'logical',
    physicalAccuracy:
      'Documented logical architecture. Block size and placement are illustrative; exact transistor-level placement is not publicly available.',
    sources: ['jedecddr5', 'skhynixddr5', 'dramfundamentals'],
    searchTerms: ['decoder', 'row decoder', 'wordline', 'address'],
  }),
  concept({
    id: 'dramsenseamp',
    name: 'Sense amplifiers',
    shortName: 'Sense amps',
    category: 'Memory',
    parent: 'drambank',
    level: 'bank',
    description:
      'The strip of differential amplifiers on the bitline pairs at the edge of the modelled bank. They latch the open row and double as the row buffer.',
    purpose:
      'Detects each tiny cell signal, restores it, and holds the open row for column access and writeback.',
    quantity: '1 modelled sense-amp strip',
    specifications: { Role: 'Differential amps and row buffer' },
    representationType: 'logical',
    physicalAccuracy:
      'Documented logical architecture. Block size and placement are illustrative; exact transistor-level placement is not publicly available.',
    sources: ['jedecddr5', 'skhynixddr5', 'dramfundamentals'],
    searchTerms: ['sense', 'amplifier', 'row buffer', 'bitline', 'latch'],
  }),
];
