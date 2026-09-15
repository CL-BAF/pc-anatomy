/**
 * Every technical claim in the manifest points at one of these.
 *
 * Standards bodies and vendor documentation only. A source backs the operating
 * principle and the published specification of a component *family*. It is
 * never evidence that a particular modeled part is populated on a particular
 * machine.
 */
export const sources = {
  tuf5090: {
    name: 'ASUS · TUF RTX 5090 construction and cooling',
    url: 'https://www.asus.com/uk/motherboards-components/graphics-cards/tuf-gaming/tuf-rtx5090-32g-gaming/',
  },
  tuf5090specs: {
    name: 'ASUS · TUF RTX 5090 specifications',
    url: 'https://www.asus.com/uk/motherboards-components/graphics-cards/tuf-gaming/tuf-rtx5090-32g-gaming/techspec/',
  },
  whitepaper: {
    name: 'NVIDIA · RTX Blackwell architecture',
    url: 'https://images.nvidia.com/aem-dam/Solutions/geforce/blackwell/nvidia-rtx-blackwell-gpu-architecture.pdf',
  },
  specs: {
    name: 'NVIDIA · RTX 5090 specifications',
    url: 'https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/',
  },
  cuda: {
    name: 'NVIDIA · CUDA programming guide',
    url: 'https://docs.nvidia.com/cuda/cuda-programming-guide/',
  },
  powerdesign: {
    name: 'MPS · GPU power conversion principles',
    url: 'https://www.monolithicpower.com/en/learning/resources/powering-the-next-sophisticated-ai-system',
  },
  monitor: {
    name: 'Texas Instruments · Current and voltage monitoring',
    url: 'https://www.ti.com/lit/ds/symlink/ina3221.pdf',
  },
  temperature: {
    name: 'Texas Instruments · Temperature sensing',
    url: 'https://www.ti.com/product/TMP451',
  },
  flash: {
    name: 'Winbond · W25Q serial NOR flash documentation',
    url: 'https://www.winbond.com/hq/product/code-storage-flash/qspi-nor/w25q-jv/?__locale=en&partNo=W25Q128JVBIQG',
  },
  construction: {
    name: 'NVIDIA · Founders Edition cooling and construction',
    url: 'https://www.nvidia.com/en-gb/geforce/news/rtx-50-series-graphics-cards-gpu-laptop-announcements/',
  },
  // ── Whole-machine standards ──────────────────────────────────────────────
  psu: {
    name: 'Intel · ATX multi-rail power supply design guide',
    url: 'https://www.intel.com/content/www/us/en/content-details/336521/atx-version-3-multi-rail-desktop-platform-power-supply-design-guide.html',
  },
  ddr5: {
    name: 'Micron · DDR5 client module architecture white paper',
    url: 'https://www.micron.com/content/dam/micron/global/public/products/white-paper/ddr5-key-module-features-wp-client.pdf',
  },
  pcie: {
    name: 'PCI-SIG · PCI Express specifications',
    url: 'https://pcisig.com/specifications',
  },
  nvme: {
    name: 'NVM Express · Specifications',
    url: 'https://nvmexpress.org/specifications/',
  },
  bldc: {
    name: 'Texas Instruments · Brushless DC motor commutation with Hall sensors',
    url: 'https://www.ti.com/document-viewer/lit/html/SLVAEG3',
  },
  coolermount: {
    name: 'Intel · Processor cooler socket compatibility',
    url: 'https://www.intel.com/content/www/us/en/support/articles/000099700/processors.html',
  },
  sata: {
    name: 'TE Connectivity · SATA 7 + 15 contact connector drawings',
    url: 'https://www.te.com/en/product-2129475-1.html',
  },
  aio: {
    name: 'ARCTIC · Liquid Freezer III pump, coldplate and radiator design',
    url: 'https://www.arctic.de/en/Liquid-Freezer-III-360',
  },
  ryzen: {
    name: 'AMD · Ryzen 9 9950X specifications',
    url: 'https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-9-9950x.html',
  },
  zen5: {
    name: 'AMD · Zen 5 microarchitecture optimization guide',
    url: 'https://docs.amd.com/v/u/en-US/58455_1.00',
  },
  corei9: {
    name: 'Intel · Core Ultra 9 285K specifications',
    url: 'https://www.intel.com/content/www/us/en/products/sku/241060/intel-core-ultra-9-processor-285k-36m-cache-up-to-5-70-ghz/specifications.html',
  },
  arrowlake: {
    name: 'Intel · Core Ultra 200S architecture and interfaces datasheet',
    url: 'https://edc.intel.com/content/www/us/en/design/products/platforms/details/arrow-lake-s/core-ultra-200s-series-processors-datasheet-volume-1-of-2/',
  },
  mainboardmanual: {
    name: 'ASUS · X670E motherboard layout and connector manual',
    url: 'https://dlcdnets.asus.com/pub/ASUS/mb/Socket%20AM5/TUF_GAMING_X670E-PLUS_WIFI/E20195_TUF_GAMING_X670E_PLUS_WIFI_UM_WEB.pdf',
  },
  samsungnvme: {
    name: 'Samsung · 990 PRO M.2 SSD hardware datasheet',
    url: 'https://download.semiconductor.samsung.com/resources/data-sheet/samsung_nvme_ssd_990_pro_datasheet_rev.2.0.pdf',
  },
  samsungsata: {
    name: 'Samsung · 870 EVO SATA SSD hardware datasheet',
    url: 'https://download.semiconductor.samsung.com/resources/data-sheet/Samsung_SSD_870_EVO_Data_Sheet_Rev1.1_230509.pdf',
  },
  ssdarchitecture: {
    name: 'Samsung · SSD controller and flash architecture white paper',
    url: 'https://download.semiconductor.samsung.com/resources/white-paper/Samsung_SSD_950_PRO_White_paper.pdf',
  },
  ddr5architecture: {
    name: 'Kingston · DDR5 module and subchannel architecture',
    url: 'https://www.kingston.com/en/blog/pc-performance/ddr5-overview',
  },
  fanconstruction: {
    name: 'Noctua · Fan frame, impeller and bearing construction',
    url: 'https://cdn.noctua.at/media/noctua_nf_a12x25_pwm_infosheet_en_web.pdf',
  },
  aircooler: {
    name: 'Noctua · Tower cooler construction and mounting',
    url: 'https://cdn.noctua.at/media/noctua_nh_u12a_infosheet_en_web.pdf',
  },
  acdc: {
    name: 'Texas Instruments · PFC / LLC power supply reference design and schematics',
    url: 'https://www.ti.com/tool/TIDA-010015',
  },
  multiphase: {
    name: 'Texas Instruments · Multiphase regulator circuit architecture',
    url: 'https://www.ti.com/product/TPS53679',
  },
  esd: {
    name: 'Texas Instruments · Display-interface ESD protection reference design',
    url: 'https://www.ti.com/tool/TIDA-050001',
  },
  packaging: {
    name: 'Texas Instruments · BGA packaging and PCB assembly notes',
    url: 'https://www.ti.com/design-development/packaging/smt-application-notes.html',
  },
  crystal: {
    name: 'Texas Instruments · Crystal oscillator circuit and layout',
    url: 'https://www.ti.com/video/6313368697112',
  },
  bearing: {
    name: 'Noctua · Fan bearing principles and cross-section',
    url: 'https://www.noctua.at/en/expertise/tech/sso-bearing',
  },
  fuse: {
    name: 'Littelfuse · Surface-mount fuse construction and ratings',
    url: 'https://www.littelfuse.com/assetdocs/fuse-437-datasheet?assetguid=7efbf979-42bb-4da1-b7b4-e1ec5d2b3789',
  },
  chassis: {
    name: 'Fractal Design · ATX case assembly and drive-mount diagrams',
    url: 'https://www.fractal-design.com/app/uploads/2023/08/Define-7-Manual-V.3-2023-08-21.pdf',
  },
} as const;

export type SourceId = keyof typeof sources;
