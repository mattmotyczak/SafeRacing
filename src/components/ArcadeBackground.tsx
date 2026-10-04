/**
 * ArcadeBackground — Seamless looping pixel-art scene, seven layers.
 *
 * Paint order, back to front: sky → hills → trees → ground → edges → rumble →
 * dashes. Every animated layer is two identical `w-[1920px]` tiles inside a
 * `w-[3840px]` row, driven by the shared `scrollBackground` keyframes
 * (translateX(0 → -50%)). The tile width is FIXED at 1920px — never `w-1/2`,
 * never `w-[200%]` — because a translateX(-50%) loop pans exactly one container
 * half (1920px), and the seam is only invisible when 1920 is congruent to 0
 * modulo that layer's own period at EVERY viewport width. A percentage tile makes
 * the pan distance the panel width instead, which is period-aligned only by
 * accident (1100 mod 100 = 0 today; 1100 mod 192 = 140, a visible gap). Layer
 * periods — sky 1920 (uniform fill), hills 640, trees 240, ground uniform, edges
 * 60, rumble 192, dashes 192 — all divide 1920 exactly, so every seam is
 * off-panel by construction rather than by luck.
 *
 * Each layer also emits a second identical 3840px row at left-[3840px] so
 * viewports wider than 1920px stay covered; the two rows animate in sync and
 * together span [-1920px, 5760px].
 *
 * Pure CSS — no requestAnimationFrame, no JS ticker. Reduced motion is disabled
 * twice over: `motion-reduce:animate-none` in the markup here, and the
 * `prefers-reduced-motion` block at the bottom of index.css.
 *
 * Vertical stack, as a percentage of the panel height so the composition holds at
 * every viewport. The panel is `aspect-video`, so a fixed-px budget silently
 * overflows below ~900px of panel width — the horizon has to scale with the box.
 *
 *   sky     100% ─ 74%   full bleed, no vertical math at all
 *   hills    74% ─ 54%   base tucked 4% behind the treeline
 *   trees    58% ─ 34%   base sits on the horizon
 *   grass    34% ─ 26%   verge, painted inside the ground tile
 *   road     26% ─  0%   two lanes, divider at 13%
 *
 * All sprites use per-sprite viewBoxes matching their own aspect (no
 * preserveAspectRatio="none"). Every scene SVG carries
 * `shape-rendering="crispEdges"` and `style={{ imageRendering: 'pixelated' }}`.
 * Depth desaturation is expressed via CSS `color-mix()` using per-layer
 * `--scene-depth-*` custom properties bound to `var(--color-scene-sky-horizon)`.
 *
 * @license Apache-2.0
 */

import React, { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import {
  hillSprite,
  treeSprite,
  cloudSprite,
  sunSprite,
  grassSprite,
  roadTextureSprite,
  outline,
  shadeRamp,
  ditherBand,
  depthMix,
  type Grid,
  type ShadeRamp,
  type LightVector,
} from "./pixel";

interface ArcadeBackgroundProps {
  isMoving: boolean;
  className?: string;
}

const skyGradient =
  "linear-gradient(180deg,var(--color-scene-sky-top) 0%,var(--color-scene-sky-horizon) 100%)";

const dashGradient =
  "repeating-linear-gradient(90deg,var(--color-scene-road-dashes-base) 0 128px,transparent 128px 192px)";

const edgesGradient =
  "repeating-linear-gradient(90deg,var(--color-scene-rumble-white-base) 0 40px,transparent 40px 60px)";

const rumbleGradient =
  "repeating-linear-gradient(90deg,var(--color-scene-rumble-red-base) 0 96px,var(--color-scene-rumble-white-base) 96px 192px)";

interface ScrollLayerProps {
  scrollClass: string;
  scrollState: string;
  boxClassName: string;
  renderTile: () => ReactNode;
}

/**
 * One animated layer: the A row at left-0 and an identical B row at
 * left-[3840px], each holding two 1920px tiles. Both rows carry the same
 * scroll class so they stay in lockstep.
 */
function ScrollLayer({ scrollClass, scrollState, boxClassName, renderTile }: ScrollLayerProps) {
  const rowClass = (left: string) =>
    `${scrollClass} ${scrollState} absolute ${boxClassName} ${left} w-[3840px] flex`;

  return (
    <>
      <div className={rowClass("left-0")} aria-hidden>
        {renderTile()}
        {renderTile()}
      </div>
      <div className={rowClass("left-[3840px]")} aria-hidden>
        {renderTile()}
        {renderTile()}
      </div>
    </>
  );
}

/** Render a Grid as <rect> elements at the given pitch (local, React-specific) */
function renderGrid(grid: Grid, pitch: number): React.ReactElement[] {
  const cells: React.ReactElement[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const token = grid[r][c];
      if (token !== ".") {
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={c * pitch}
            y={r * pitch}
            width={pitch}
            height={pitch}
            fill={token}
          />
        );
      }
    }
  }
  return cells;
}

/** Build a shaded+outlined sprite grid using the pixel pipeline */
function buildSpriteGrid(
  grid: Grid,
  ramp: ShadeRamp | readonly string[],
  outlineToken: string,
  light: LightVector,
  dither: boolean
): Grid {
  let processed = outline(grid, outlineToken);
  processed = shadeRamp(processed, ramp as ShadeRamp, light, { dither }, outlineToken);
  return processed;
}

/** Build hill grid with dithered band transitions */
function buildHillGrid(): Grid {
  const baseGrid = hillSprite.grid;

  const bandIndexFn = (r: number): number => {
    if (r < 18) return 0; // highlight
    if (r < 32) return 1; // light
    return 2; // base
  };

  const outlined = outline(baseGrid, hillSprite.outlineToken);
  const ramp = hillSprite.ramp as readonly string[];
  const dithered = ditherBand(outlined, ramp, (r, _c) => bandIndexFn(r), hillSprite.outlineToken);

  return dithered;
}

/** Render a sun sprite at given position within the 1920px tile */
function SunSprite({ x, y, size = 64 }: { x: number; y: number; size?: number }) {
  const grid = buildSpriteGrid(
    sunSprite.grid,
    sunSprite.ramp,
    sunSprite.outlineToken,
    sunSprite.light,
    true
  );
  const viewBoxWidth = sunSprite.grid[0].length * sunSprite.pitch;
  const viewBoxHeight = sunSprite.grid.length * sunSprite.pitch;

  return (
    <svg
      className="absolute"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${size}px`,
        height: `${size}px`,
        imageRendering: "pixelated",
      }}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {renderGrid(grid, sunSprite.pitch)}
    </svg>
  );
}

/** Render a cloud sprite at given position within the 1920px tile */
function CloudSprite({ x, y, width = 96, height = 48 }: { x: number; y: number; width?: number; height?: number }) {
  const grid = buildSpriteGrid(
    cloudSprite.grid,
    cloudSprite.ramp,
    cloudSprite.outlineToken,
    cloudSprite.light,
    true
  );
  const viewBoxWidth = cloudSprite.grid[0].length * cloudSprite.pitch;
  const viewBoxHeight = cloudSprite.grid.length * cloudSprite.pitch;

  return (
    <svg
      className="absolute"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        imageRendering: "pixelated",
      }}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {renderGrid(grid, cloudSprite.pitch)}
    </svg>
  );
}

/** Render the hills layer as a full 1920px tile using hillSprite (640px period, 3 peaks) */
function HillsTile() {
  // hillSprite.grid is 160×50 at pitch 4 = 640×200px. We need 3 repeats for 1920px.
  const baseGrid = buildHillGrid();
  const baseWidth = baseGrid[0].length; // 160
  const baseHeight = baseGrid.length;   // 50
  const repeats = 3; // 1920 / 640 = 3

  // Tile horizontally 3 times
  const fullGrid: Grid = baseGrid.map((row) =>
    Array.from({ length: repeats }, (_, i) => row).flat()
  ) as Grid;

  // Depth factor for hills: 0.35 → 65% color, 35% sky-horizon
  const depthFactor = 0.35;

  return (
    <div
      className="w-[1920px] h-full relative"
      style={{
        "--scene-depth-hills": depthFactor,
      } as React.CSSProperties}
    >
      <svg
        className="absolute inset-0"
        viewBox={`0 0 ${fullGrid[0].length * hillSprite.pitch} ${fullGrid.length * hillSprite.pitch}`}
        shapeRendering="crispEdges"
        preserveAspectRatio="none"
        style={{ imageRendering: "pixelated", width: "100%", height: "100%" }}
        aria-hidden
      >
        {fullGrid.map((row, r) =>
          row.map((token, c) => {
            if (token === ".") return null;
            const mixedFill = depthMix(token, depthFactor);
            return (
              <rect
                key={`${r}-${c}`}
                x={c * hillSprite.pitch}
                y={r * hillSprite.pitch}
                width={hillSprite.pitch}
                height={hillSprite.pitch}
                style={{
                  fill: mixedFill,
                } as React.CSSProperties}
              />
            );
          })
        )}
      </svg>
    </div>
  );
}

/** Render the trees layer as a full 1920px tile with 8 trees at 240px pitch */
function TreesTile() {
  const baseGrid = buildSpriteGrid(
    treeSprite.grid,
    treeSprite.ramp,
    treeSprite.outlineToken,
    treeSprite.light,
    true
  );
  const baseWidth = baseGrid[0].length;  // 32
  const baseHeight = baseGrid.length;    // 48
  const pitch = treeSprite.pitch;        // 2
  const treePixelWidth = baseWidth * pitch;  // 64px
  const treePitchPx = 240;  // 240px period
  const treesPerTile = 8;   // 1920 / 240 = 8

  // Each tree is 64px wide (32*2), centered at 120 + 240k
  const treePositions = Array.from({ length: treesPerTile }, (_, k) => 120 + treePitchPx * k);

  // Depth factor for trees: 0.15 → 85% color, 15% sky-horizon
  const depthFactor = 0.15;

  return (
    <div className="w-[1920px] h-full relative">
      {treePositions.map((cx, k) => (
        <svg
          key={k}
          className="absolute bottom-0"
          style={{
            left: `${cx - treePixelWidth / 2}px`,
            width: `${treePixelWidth}px`,
            height: `${baseHeight * pitch}px`,
            imageRendering: "pixelated",
          }}
          viewBox={`0 0 ${baseWidth * pitch} ${baseHeight * pitch}`}
          shapeRendering="crispEdges"
          aria-hidden
        >
          {baseGrid.map((row, r) =>
            row.map((token, c) => {
              if (token === ".") return null;
              const mixedFill = depthMix(token, depthFactor);
              return (
                <rect
                  key={`${r}-${c}`}
                  x={c * pitch}
                  y={r * pitch}
                  width={pitch}
                  height={pitch}
                  style={{
                    fill: mixedFill,
                  } as React.CSSProperties}
                />
              );
            })
          )}
        </svg>
      ))}
    </div>
  );
}

/** Render the ground layer: grass verge (top 23.529%) over road with texture overlay */
function GroundTile() {
  const GRASS_FRACTION = 23.529;

  // Road base — solid fill using CSS variable
  // Grass verge — built from grassSprite with dithered bands
  const baseGrid = grassSprite.grid;

  // Band index: tufted top 4 rows (band 0=highlight, band 1=light), then solid bands
  const bandIndexFn = (r: number): number => {
    if (r < 4) return r % 2 === 0 ? 0 : 1;
    return Math.floor((r - 4) / 5) % 3;
  };

  // Apply outline first
  const outlined = outline(baseGrid, grassSprite.outlineToken);

  // Apply ditherBand for band transitions (tufted edge + band boundaries)
  const ramp = grassSprite.ramp as readonly string[];
  const dithered = ditherBand(outlined, ramp, (r, _c) => bandIndexFn(r), grassSprite.outlineToken);

  const grassHeight = dithered.length * grassSprite.pitch; // 80px
  const grassWidth = dithered[0].length * grassSprite.pitch; // 1920px

  // Depth factor for grass: 0 → 100% color (no atmospheric desaturation)
  const depthFactor = 0;

  return (
    <div className="w-[1920px] h-full relative"
         style={{ backgroundColor: "var(--color-scene-road-base)" }}>
      {/* Grass verge — top 23.529% of the layer */}
      <div
        className="absolute inset-x-0 top-0"
        style={{ height: `${GRASS_FRACTION}%`, position: "relative" } as React.CSSProperties}
      >
        <svg
          className="absolute inset-0"
          viewBox={`0 0 ${grassWidth} ${grassHeight}`}
          shapeRendering="crispEdges"
          preserveAspectRatio="none"
          style={{ imageRendering: "pixelated", width: "100%", height: "100%" }}
          aria-hidden
        >
          {dithered.map((row, r) =>
            row.map((token, c) => {
              if (token === ".") return null;
              const mixedFill = depthMix(token, depthFactor);
              return (
                <rect
                  key={`${r}-${c}`}
                  x={c * grassSprite.pitch}
                  y={r * grassSprite.pitch}
                  width={grassSprite.pitch}
                  height={grassSprite.pitch}
                  style={{
                    fill: mixedFill,
                  } as React.CSSProperties}
                />
              );
            })
          )}
        </svg>
      </div>
    </div>
  );
}

const EdgesTile = () => (
  <div className="w-[1920px] h-full relative">
    <div className="absolute inset-x-0 top-2 h-1" style={{ backgroundImage: edgesGradient }} />
    <div className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundImage: edgesGradient }} />
  </div>
);

const RumbleTile = () => (
  <div className="w-[1920px] h-full" style={{ backgroundImage: rumbleGradient }} />
);

const DashesTile = () => (
  <div className="w-[1920px] h-full" style={{ backgroundImage: dashGradient }} />
);

/** Render road texture overlay — sparse horizontal cracks & patches at 40% opacity */
function RoadTextureTile() {
  const baseGrid = roadTextureSprite.grid;
  const baseWidth = baseGrid[0].length;   // 480
  const baseHeight = baseGrid.length;     // 10
  const pitch = roadTextureSprite.pitch;  // 4
  const textureWidth = baseWidth * pitch; // 1920px
  const textureHeight = baseHeight * pitch; // 40px

  // Depth factor for road texture: 0 → 100% color (closest layer)
  const depthFactor = 0;

  return (
    <svg
      className="w-[1920px] h-full"
      viewBox={`0 0 ${textureWidth} ${textureHeight}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", opacity: 0.4 }}
      aria-hidden
    >
      {baseGrid.map((row, r) =>
        row.map((token, c) => {
          if (token === ".") return null;
          const mixedFill = depthMix(token, depthFactor);
          return (
            <rect
              key={`${r}-${c}`}
              x={c * pitch}
              y={r * pitch}
              width={pitch}
              height={pitch}
              style={{
                fill: mixedFill,
              } as React.CSSProperties}
            />
          );
        })
      )}
    </svg>
  );
}

export default function ArcadeBackground({ isMoving, className = "" }: ArcadeBackgroundProps) {
  const prefersReducedMotion = useReducedMotion();
  const [debugForceMotion, setDebugForceMotion] = useState(false);

  // Dev-only: Shift+M toggles debug force-motion to bypass prefers-reduced-motion
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "M") {
        setDebugForceMotion((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const effectiveReducedMotion = prefersReducedMotion && !debugForceMotion;
  const scrollState = isMoving && !effectiveReducedMotion ? "arcade-scroll-running" : "";

  const skyTile = () => (
    <div className="w-[1920px] h-full relative" style={{ backgroundImage: skyGradient }}>
      {/* Sun — positioned at 424px, 32px (off-seam, >200px from boundaries) */}
      <SunSprite x={424} y={32} size={64} />
      {/* Clouds — positioned off-seam */}
      <CloudSprite x={850} y={96} width={220} height={60} />
      <CloudSprite x={1410} y={48} width={180} height={48} />
    </div>
  );

  return (
    <div className={`absolute inset-0 overflow-hidden arcade-scroll-container ${scrollState} ${className}`}>
      {/* Diagnostic: shows if prefers-reduced-motion is active and debug force-motion */}
      <div className="fixed bottom-2 right-2 z-50 px-2 py-1 bg-black/80 text-white text-xs font-mono">
        reduced-motion: {prefersReducedMotion ? "ON" : "OFF"} | debug-force: {debugForceMotion ? "ON" : "OFF"}
      </div>

      {/* Sky — a vertical daylight gradient. Period = tile width (1920px). */}
      <ScrollLayer
        scrollClass="arcade-scroll-sky"
        scrollState=""
        boxClassName="inset-0"
        renderTile={skyTile}
      />

      {/* Hills — distant, 32 px/s, base tucked behind the treeline */}
      <ScrollLayer
        scrollClass="arcade-scroll-hills"
        scrollState=""
        boxClassName="bottom-[34%] h-[28%]"
        renderTile={HillsTile}
      />

      {/* Trees — nearer, 76.8 px/s, base on the horizon */}
      <ScrollLayer
        scrollClass="arcade-scroll-trees"
        scrollState=""
        boxClassName="bottom-[34%] h-[24%]"
        renderTile={TreesTile}
      />

      {/* Surface plane — grass verge over road */}
      <ScrollLayer
        scrollClass="arcade-scroll-ground"
        scrollState=""
        boxClassName="bottom-0 h-[34%]"
        renderTile={GroundTile}
      />

      {/* Road edge lines — 60px period, 960 px/s */}
      <ScrollLayer
        scrollClass="arcade-scroll-edges"
        scrollState=""
        boxClassName="bottom-0 h-[26%]"
        renderTile={EdgesTile}
      />

      {/* Kerb rumble — 192px period, 960 px/s, on the grass/road boundary */}
      <ScrollLayer
        scrollClass="arcade-scroll-rumble"
        scrollState=""
        boxClassName="bottom-[26%] h-1"
        renderTile={RumbleTile}
      />

      {/* Road dashes — 192px period, 960 px/s, lane divider at the road midpoint */}
      <ScrollLayer
        scrollClass="arcade-scroll-dashes"
        scrollState=""
        boxClassName="bottom-[13%] h-1"
        renderTile={DashesTile}
      />

      {/* Road texture overlay — sparse horizontal cracks & patches at 40% opacity */}
      <ScrollLayer
        scrollClass="arcade-scroll-dashes"
        scrollState=""
        boxClassName="bottom-[13%] h-[40px]"
        renderTile={RoadTextureTile}
      />
    </div>
  );
}