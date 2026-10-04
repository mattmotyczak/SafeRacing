/**
 * Pixel-grid pipeline for Enter the Gungeon / Gen-3 Pokémon style sprites.
 *
 * This module provides pure, deterministic passes over a token-name grid:
 * 1. BAYER4 — 4×4 ordered-dither matrix (0..15).
 * 2. outline — expands filled cells with a 1-px dark outline token.
 * 3. shadeRamp — assigns four-tone shading ramps from a light vector.
 * 4. ditherBand — dithers transitions between silhouette bands.
 *
 * All functions are pure: no React, no DOM, no side effects, fully deterministic.
 * Colours are token names only — never raw hex.
 *
 * @license Apache-2.0
 */

export type Grid = readonly (readonly string[])[];

export const BAYER4: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

export type ShadeRamp = readonly [string, string, string, string];

export interface LightVector {
  readonly x: number;
  readonly y: number;
}

export interface ShadeRampOptions {
  readonly dither: boolean;
}

function isFilled(grid: Grid, r: number, c: number): boolean {
  return r >= 0 && r < grid.length && c >= 0 && c < grid[r].length && grid[r][c] !== ".";
}

/**
 * Returns a new grid with a 1-px orthogonal outline around every filled region.
 */
export function outline(grid: Grid, outlineToken: string): Grid {
  const rows = grid.length;
  if (rows === 0) return grid;
  const cols = grid[0].length;

  const out: string[][] = grid.map((row) => [...row]);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== ".") continue;
      const hasFilledNeighbour =
        isFilled(grid, r - 1, c) ||
        isFilled(grid, r + 1, c) ||
        isFilled(grid, r, c - 1) ||
        isFilled(grid, r, c + 1);
      if (hasFilledNeighbour) {
        out[r][c] = outlineToken;
      }
    }
  }

  return out.map((row) => Object.freeze(row)) as Grid;
}

function computeFacing(grid: Grid, r: number, c: number, light: LightVector): number {
  if (grid[r][c] === ".") return 0;

  let nx = 0;
  let ny = 0;
  if (!isFilled(grid, r - 1, c)) ny -= 1;
  if (!isFilled(grid, r + 1, c)) ny += 1;
  if (!isFilled(grid, r, c - 1)) nx -= 1;
  if (!isFilled(grid, r, c + 1)) nx += 1;

  // If fully interior, facing is biased towards top-left light
  if (nx === 0 && ny === 0) return 0.2;

  const nLen = Math.hypot(nx, ny);
  const lLen = Math.hypot(light.x, light.y);
  if (nLen === 0 || lLen === 0) return 0;

  nx /= nLen;
  ny /= nLen;
  const lx = light.x / lLen;
  const ly = light.y / lLen;

  return nx * lx + ny * ly;
}

export function shadeRamp(
  grid: Grid,
  ramp: ShadeRamp,
  light: LightVector,
  opts: ShadeRampOptions,
  outlineToken?: string
): Grid {
  const rows = grid.length;
  if (rows === 0) return grid;
  const cols = grid[0].length;

  const indexGrid: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(-1));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "." || (outlineToken && grid[r][c] === outlineToken)) continue;
      const facing = computeFacing(grid, r, c, light);
      let idx: number;
      if (facing > 0.4) idx = 0;
      else if (facing > 0.0) idx = 1;
      else if (facing > -0.4) idx = 2;
      else idx = 3;
      indexGrid[r][c] = idx;
    }
  }

  const out: string[][] = grid.map((row) => [...row]);

  if (opts.dither) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = indexGrid[r][c];
        if (idx < 0) continue;

        let ditherUp = false;
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const nIdx = indexGrid[nr][nc];
            if (nIdx >= 0 && Math.abs(nIdx - idx) === 1) {
              ditherUp = true;
              break;
            }
          }
        }

        if (ditherUp) {
          const bayer = BAYER4[r % 4][c % 4];
          const finalIdx = bayer >= 8 ? Math.max(0, idx - 1) : idx;
          out[r][c] = ramp[finalIdx];
        } else {
          out[r][c] = ramp[idx];
        }
      }
    }
  } else {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = indexGrid[r][c];
        if (idx >= 0) out[r][c] = ramp[idx];
      }
    }
  }

  return out.map((row) => Object.freeze(row)) as Grid;
}

export function ditherBand(
  grid: Grid,
  ramp: readonly string[],
  bandIndexFn: (r: number, c: number) => number,
  outlineToken?: string
): Grid {
  const rows = grid.length;
  if (rows === 0) return grid;
  const cols = grid[0].length;

  const out: string[][] = grid.map((row) => [...row]);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "." || (outlineToken && grid[r][c] === outlineToken)) continue;
      const band = bandIndexFn(r, c);
      if (band < 0 || band >= ramp.length) continue;

      let onBoundary = false;
      let neighbourBand = band;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== "." && (!outlineToken || grid[nr][nc] !== outlineToken)) {
          const nBand = bandIndexFn(nr, nc);
          if (nBand !== band && nBand >= 0) {
            onBoundary = true;
            neighbourBand = nBand;
            break;
          }
        }
      }

      if (onBoundary) {
        const bayer = BAYER4[r % 4][c % 4];
        const useHigher = bayer >= 8;
        const targetBand = useHigher ? Math.min(band, neighbourBand) : Math.max(band, neighbourBand);
        out[r][c] = ramp[targetBand];
      } else {
        out[r][c] = ramp[band];
      }
    }
  }

  return out.map((row) => Object.freeze(row)) as Grid;
}

export function depthMix(token: string, factor: number): string {
  const clamped = Math.max(0, Math.min(1, factor));
  const pct = Math.round((1 - clamped) * 100);
  const varToken = token.startsWith("var(--") ? token : `var(${token.startsWith("--") ? token : `--${token}`})`;
  return `color-mix(in oklab, ${varToken} ${pct}%, var(--color-scene-sky-horizon))`;
}

export function deriveRamp(baseToken: string): ShadeRamp {
  return [
    depthMix(baseToken, -0.15),
    depthMix(baseToken, -0.07),
    baseToken,
    depthMix(baseToken, 0.2),
  ];
}

/* ============================================================================
 * SPRITE DATA — Solid, filled pixel-art shapes
 * ============================================================================ */

/** Car sprite — 32×16 px at pitch 2 (64×32 viewBox) */
export const carSprite: {
  readonly grid: Grid;
  readonly ramp: ShadeRamp;
  readonly outlineToken: string;
  readonly light: LightVector;
  readonly pitch: 2;
} = {
  grid: [
    "...............##...............",  // 0: roof top
    "............########............",  // 1: roof upper
    "..........############..........",  // 2: roof cabin
    ".........##############.........",  // 3: cabin mid
    "......####################......",  // 4: hood / trunk start
    "....########################....",  // 5: beltline
    "..############################..",  // 6: body upper
    ".##############################.",  // 7: body mid
    "################################",  // 8: body main
    "################################",  // 9: body lower
    "##....####################....##",  // 10: wheel wells
    "##....####################....##",  // 11: wheel wells
    "##....####################....##",  // 12: wheel wells
    "##....####################....##",  // 13: wheel wells
    "################################",  // 14: base underside
    "##............................##",  // 15: tires contact
  ].map(row => row.split("")),
  ramp: [
    "var(--color-scene-car-highlight)",
    "var(--color-scene-car-light)",
    "var(--color-scene-car-base)",
    "var(--color-scene-car-shadow)",
  ],
  outlineToken: "var(--color-scene-outline)",
  light: { x: 1, y: -1 },
  pitch: 2,
};

/** Tree sprite — 32×48 px at pitch 2 (64×96 viewBox) - Solid Evergreen/Pine tree */
export const treeSprite: {
  readonly grid: Grid;
  readonly ramp: ShadeRamp;
  readonly outlineToken: string;
  readonly light: LightVector;
  readonly pitch: 2;
} = {
  grid: (() => {
    const rows = 48;
    const cols = 32;
    const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill("."));

    const tiers = [
      { startY: 2, endY: 10, startW: 4, endW: 14 },
      { startY: 10, endY: 20, startW: 10, endW: 22 },
      { startY: 20, endY: 34, startW: 16, endW: 28 },
    ];

    const cx = 16;
    for (const tier of tiers) {
      for (let y = tier.startY; y < tier.endY; y++) {
        const progress = (y - tier.startY) / (tier.endY - tier.startY);
        const w = Math.round(tier.startW + progress * (tier.endW - tier.startW));
        const half = Math.floor(w / 2);
        for (let x = cx - half; x <= cx + half; x++) {
          if (x >= 0 && x < cols) {
            grid[y][x] = "#";
          }
        }
      }
    }

    for (let y = 34; y < 46; y++) {
      for (let x = cx - 3; x <= cx + 2; x++) {
        grid[y][x] = "#";
      }
    }

    return grid;
  })(),
  ramp: [
    "var(--color-scene-trees-highlight)",
    "var(--color-scene-trees-light)",
    "var(--color-scene-trees-base)",
    "var(--color-scene-trees-shadow)",
  ],
  outlineToken: "var(--color-scene-outline)",
  light: { x: 1, y: -1 },
  pitch: 2,
};

/** Cloud sprite — 48×24 px at pitch 2 (96×48 viewBox) - Solid fluffy cloud */
export const cloudSprite: {
  readonly grid: Grid;
  readonly ramp: ShadeRamp;
  readonly outlineToken: string;
  readonly light: LightVector;
  readonly pitch: 2;
} = {
  grid: (() => {
    const rows = 24;
    const cols = 48;
    const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill("."));

    const puffs = [
      { cx: 14, cy: 14, r: 8 },
      { cx: 24, cy: 10, r: 9 },
      { cx: 34, cy: 14, r: 7 },
    ];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (y >= 12 && y <= 18 && x >= 8 && x <= 40) {
          grid[y][x] = "#";
          continue;
        }
        for (const p of puffs) {
          const dx = (x - p.cx);
          const dy = (y - p.cy);
          if (dx * dx + dy * dy <= p.r * p.r) {
            grid[y][x] = "#";
            break;
          }
        }
      }
    }
    return grid;
  })(),
  ramp: [
    "var(--color-scene-cloud-highlight)",
    "var(--color-scene-cloud-light)",
    "var(--color-scene-cloud-base)",
    "var(--color-scene-cloud-shadow)",
  ],
  outlineToken: "var(--color-scene-outline)",
  light: { x: 1, y: -1 },
  pitch: 2,
};

/** Sun sprite — 32×32 px at pitch 2 (64×64 viewBox) — Solid retro 8-bit sun */
export const sunSprite: {
  readonly grid: Grid;
  readonly ramp: ShadeRamp;
  readonly outlineToken: string;
  readonly light: LightVector;
  readonly pitch: 2;
} = {
  grid: (() => {
    const size = 32;
    const grid: string[][] = Array.from({ length: size }, () => Array(size).fill("."));
    const cx = 15.5;
    const cy = 15.5;
    const r = 10;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2;
        if (d2 <= r ** 2) {
          grid[y][x] = "#";
        }
      }
    }

    for (let i = 0; i < 4; i++) {
      grid[2 + i][15] = "#"; grid[2 + i][16] = "#";   // top
      grid[26 + i][15] = "#"; grid[26 + i][16] = "#"; // bottom
      grid[15][2 + i] = "#"; grid[16][2 + i] = "#";   // left
      grid[15][26 + i] = "#"; grid[16][26 + i] = "#"; // right
    }

    return grid;
  })(),
  ramp: [
    "var(--color-scene-sun-highlight)",
    "var(--color-scene-sun-light)",
    "var(--color-scene-sun-base)",
    "var(--color-scene-sun-shadow)",
  ],
  outlineToken: "var(--color-scene-outline)",
  light: { x: 0, y: -1 },
  pitch: 2,
};

/** Hill sprite — 640px period tile at pitch 4 (160×50 cells) — Solid rolling hills */
export const hillSprite: {
  readonly grid: Grid;
  readonly ramp: readonly [string, string, string];
  readonly outlineToken: string;
  readonly light: LightVector;
  readonly pitch: 4;
} = {
  grid: (() => {
    const width = 160;
    const height = 50;
    const grid: string[][] = Array.from({ length: height }, () => Array(width).fill("."));

    const peaks = [
      { cx: 28, apex: 16, w: 56 },
      { cx: 80, apex: 10, w: 72 },
      { cx: 132, apex: 16, w: 56 }, // mirror of peak 1: 160 - 28 = 132
    ];

    for (let x = 0; x < width; x++) {
      let minY = height;
      for (const p of peaks) {
        const dx = Math.abs(x - p.cx);
        const halfW = p.w / 2;
        if (dx <= halfW) {
          const normalized = dx / halfW;
          const curve = 1 - (1 - normalized * normalized) ** 1.5;
          const y = Math.round(p.apex + curve * (height - p.apex));
          if (y < minY) minY = y;
        }
      }
      for (let y = minY; y < height; y++) {
        grid[y][x] = "#";
      }
    }

    return grid;
  })(),
  ramp: [
    "var(--color-scene-hills-highlight)",
    "var(--color-scene-hills-light)",
    "var(--color-scene-hills-base)",
  ],
  outlineToken: "var(--color-scene-outline)",
  light: { x: 1, y: -1 },
  pitch: 4,
};

/** Grass sprite — 3-tone verge strip with solid fill and tufted top edge, 1920px at pitch 4 (480×20) */
export const grassSprite: {
  readonly grid: Grid;
  readonly ramp: readonly [string, string, string];
  readonly outlineToken: string;
  readonly light: LightVector;
  readonly pitch: 4;
} = {
  grid: (() => {
    const width = 480;
    const height = 20;
    const grid: string[][] = Array.from({ length: height }, () => Array(width).fill("."));

    for (let x = 0; x < width; x++) {
      const tuftHeight = (x % 4 === 0 || x % 7 === 0) ? 1 : (x % 3 === 0 ? 2 : 3);
      for (let y = tuftHeight; y < height; y++) {
        grid[y][x] = "#";
      }
    }

    return grid;
  })(),
  ramp: [
    "var(--color-scene-grass-highlight)",
    "var(--color-scene-grass-light)",
    "var(--color-scene-grass-base)",
  ],
  outlineToken: "var(--color-scene-outline)",
  light: { x: 1, y: -1 },
  pitch: 4,
};

/** Road texture overlay — 1920×40px at pitch 4 (480×10 cells) — Sparse horizontal cracks & patches */
export const roadTextureSprite: {
  readonly grid: Grid;
  readonly ramp: readonly [string, string, string];
  readonly outlineToken: string;
  readonly light: LightVector;
  readonly pitch: 4;
} = {
  // 1920px wide at pitch 4 = 480 cells. Height = 40px = 10 cells.
  grid: (() => {
    const width = 480;
    const height = 10;
    const grid: string[][] = Array.from({ length: height }, () => Array(width).fill("."));

    // Horizontal fissures — 3-5 cracks across the tile
    const fissurePositions = [1, 3, 5, 7]; // row indices
    for (const y of fissurePositions) {
      for (let x = 0; x < width; x++) {
        // Sparse crack: ~15% density with gaps
        if ((x * 7 + y * 13) % 16 < 3) {
          grid[y][x] = "#";
        }
      }
    }

    // Patch rectangles — 2-3 repair patches
    const patches = [
      { x: 72, y: 1, w: 16, h: 2 },   // left side
      { x: 240, y: 4, w: 12, h: 2 },  // center
      { x: 380, y: 6, w: 14, h: 1 },  // right side
    ];
    for (const p of patches) {
      for (let y = p.y; y < p.y + p.h && y < height; y++) {
        for (let x = p.x; x < p.x + p.w && x < width; x++) {
          grid[y][x] = "#";
        }
      }
    }

    return grid;
  })(),
  ramp: [
    "var(--color-scene-road-highlight)",
    "var(--color-scene-road-light)",
    "var(--color-scene-road-base)",
  ],
  outlineToken: "var(--color-scene-outline)",
  light: { x: 1, y: -1 },
  pitch: 4,
};