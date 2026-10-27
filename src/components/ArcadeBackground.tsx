/**
 * ArcadeBackground — Seamless looping pixel-art scene, seven layers.
 *
 * Paint order, back to front: sky → hills → trees → ground → edges → rumble →
 * dashes. Every animated layer is two identical `w-[1920px]` tiles inside a
 * `w-[3840px]` row, panned by the shared velocity integrator below. The tile
 * width is FIXED at 1920px — never `w-1/2`, never `w-[200%]` — because the pan
 * wraps at exactly one tile (1920px), and the seam is only invisible when 1920
 * is congruent to 0 modulo that layer's own period at EVERY viewport width. A
 * percentage tile would make the pan distance the panel width instead, which is
 * period-aligned only by accident (1100 mod 100 = 0 today; 1100 mod 192 = 140, a
 * visible gap). Layer
 * periods — sky 1920 (uniform fill), hills 640, trees 240, ground uniform, edges
 * 60, rumble 192, dashes 192 — all divide 1920 exactly, so every seam is
 * off-panel by construction rather than by luck.
 *
 * Each layer also emits a second identical 3840px row at left-[3840px] so
 * viewports wider than 1920px stay covered; the two rows animate in sync and
 * together span [-1920px, 5760px].
 *
 * Motion is a single rAF integrator shared by all layers: one velocity scalar
 * ramps 0..cruise, so the whole scene accelerates and coasts together and stays
 * proportional. Per-layer CSS keyframes cannot ramp at all — animation-play-state
 * is binary, and changing duration or delay seeks the timeline and jumps phase.
 * Reduced motion never starts the integrator, and the tiles render at rest.
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

import React, { useState, useEffect, useRef, memo } from "react";
import type { ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import {
  hillSprite,
  treeSprite,
  treeFoliageSprite,
  treeTrunkSprite,
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
  /** Fraction of cruise speed this layer travels at. */
  depth: number;
  /** Reduced motion: leave the tile at rest and never register it. */
  frozen: boolean;
  boxClassName: string;
  renderTile: () => ReactNode;
}

/** Pan distance of one loop, shared by every layer. Congruent to 0 modulo each
 *  layer's own period, so no seam can appear at any viewport width. */
const TILE_PX = 1920;

/** Cruise speed of the nearest layer, in px/s. */
const CRUISE_PX_PER_S = 960;

/** Seconds to reach cruise from rest, and to coast back to rest. */
const RAMP_SECONDS = 0.55;

/** Longest frame a backgrounded tab may contribute, so the scene cannot jump. */
const MAX_FRAME_SECONDS = 0.05;

interface ScrollTarget {
  el: HTMLElement;
  depth: number;
}

/* One integrator drives the whole scene. Velocity is a single scalar, so all
 * layers ramp together and stay exactly proportional. Per-layer CSS keyframes
 * cannot do this: animation-play-state is binary, and changing duration or
 * delay both seek the timeline and jump the phase. */
const scrollTargets = new Set<ScrollTarget>();
let scrollMoving = false;
let scrollFrame = 0;
let scrollLast = 0;
let scrollSpeed = 0;
let scrollTravelled = 0;

function scrollTick(now: number) {
  // Clamped both ways: a backgrounded tab must not teleport the scene, and a
  // clock that steps backwards must not run the road in reverse.
  const dt = Math.max(0, Math.min((now - scrollLast) / 1000, MAX_FRAME_SECONDS));
  scrollLast = now;

  const target = scrollMoving ? 1 : 0;
  const step = dt / RAMP_SECONDS;
  scrollSpeed =
    target > scrollSpeed
      ? Math.min(target, scrollSpeed + step)
      : Math.max(target, scrollSpeed - step);

  // Park only once the road is meant to be stopped. Parking on `scrollSpeed === 0`
  // alone would kill the loop on its very first frame: the callback can receive a
  // frame timestamp older than the performance.now() taken when rAF was requested,
  // so dt clamps to 0, speed stays 0, and the chain never reschedules.
  if (!scrollMoving && scrollSpeed === 0) {
    scrollFrame = 0;
    return;
  }

  scrollTravelled += scrollSpeed * CRUISE_PX_PER_S * dt;
  for (const entry of scrollTargets) {
    const offset = (scrollTravelled * entry.depth) % TILE_PX;
    entry.el.style.transform = `translate3d(${-offset}px,0,0)`;
  }
  scrollFrame = requestAnimationFrame(scrollTick);
}

function scrollSetMoving(next: boolean) {
  scrollMoving = next;
  if (next && scrollFrame === 0) {
    scrollLast = performance.now();
    scrollFrame = requestAnimationFrame(scrollTick);
  }
}

/**
 * One animated layer: the A row at left-0 and an identical B row at
 * left-[3840px], each holding two 1920px tiles. Both rows register with the
 * integrator so they stay in lockstep.
 */
function ScrollLayer({ depth, frozen, boxClassName, renderTile }: ScrollLayerProps) {
  const rowA = useRef<HTMLDivElement>(null);
  const rowB = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (frozen) return;
    const targets = [rowA.current, rowB.current]
      .filter((el): el is HTMLDivElement => el !== null)
      .map((el) => ({ el, depth }));
    targets.forEach((target) => scrollTargets.add(target));
    return () => targets.forEach((target) => scrollTargets.delete(target));
  }, [depth, frozen]);

  const rowClass = (left: string) =>
    `absolute ${boxClassName} ${left} w-[3840px] flex will-change-transform`;

  return (
    <>
      <div ref={rowA} className={rowClass("left-0")} aria-hidden>
        {renderTile()}
        {renderTile()}
      </div>
      <div ref={rowB} className={rowClass("left-[3840px]")} aria-hidden>
        {renderTile()}
        {renderTile()}
      </div>
    </>
  );
}

interface PathDef {
  fill: string;
  d: string;
}

/**
 * Consolidate contiguous horizontal runs of identical tokens into SVG rectangle subpaths:
 * M x y h w v pitch h -w z
 * Grouped by fill token to emit a single <path> per unique color.
 * Replaces ~124,000 individual <rect> nodes with ~200 <path> nodes across the scene.
 */
function gridToPaths(grid: Grid, pitch: number, depthFactor = 0): PathDef[] {
  const colorRuns = new Map<string, string[]>();
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    const y = r * pitch;
    let c = 0;
    while (c < row.length) {
      const token = row[c];
      if (token === ".") {
        c++;
        continue;
      }
      const startC = c;
      while (c < row.length && row[c] === token) {
        c++;
      }
      const x = startC * pitch;
      const w = (c - startC) * pitch;
      let runs = colorRuns.get(token);
      if (!runs) {
        runs = [];
        colorRuns.set(token, runs);
      }
      runs.push(`M${x} ${y}h${w}v${pitch}h${-w}z`);
    }
  }

  const result: PathDef[] = [];
  for (const [token, runs] of colorRuns.entries()) {
    const fill =
      depthFactor > 0
        ? depthMix(token, depthFactor)
        : token.startsWith("var(")
          ? token
          : depthMix(token, depthFactor);
    result.push({ fill, d: runs.join(" ") });
  }
  return result;
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

/* Processed grids and path sets are computed once at import. The pipeline is
 * pure and its inputs are module constants, so running it inside render rebuilt
 * the whole scene on every state change — and ScrollLayer renders each tile
 * twice per row across two rows. Precomputing path data reduces ~10^5 DOM
 * elements down to ~200 while preserving pixel-perfect visual fidelity. */
const SUN_GRID = buildSpriteGrid(
  sunSprite.grid,
  sunSprite.ramp,
  sunSprite.outlineToken,
  sunSprite.light,
  true
);
const SUN_PATHS = gridToPaths(SUN_GRID, sunSprite.pitch);
const SUN_VIEWBOX_WIDTH = sunSprite.grid[0].length * sunSprite.pitch;
const SUN_VIEWBOX_HEIGHT = sunSprite.grid.length * sunSprite.pitch;

const CLOUD_GRID = buildSpriteGrid(
  cloudSprite.grid,
  cloudSprite.ramp,
  cloudSprite.outlineToken,
  cloudSprite.light,
  true
);
const CLOUD_PATHS = gridToPaths(CLOUD_GRID, cloudSprite.pitch);
const CLOUD_VIEWBOX_WIDTH = cloudSprite.grid[0].length * cloudSprite.pitch;
const CLOUD_VIEWBOX_HEIGHT = cloudSprite.grid.length * cloudSprite.pitch;

const TRUNK_GRID = buildSpriteGrid(
  treeTrunkSprite.grid,
  treeTrunkSprite.ramp,
  treeTrunkSprite.outlineToken,
  treeTrunkSprite.light,
  true
);
const FOLIAGE_GRID = buildSpriteGrid(
  treeFoliageSprite.grid,
  treeFoliageSprite.ramp,
  treeFoliageSprite.outlineToken,
  treeFoliageSprite.light,
  true
);
const TRUNK_PATHS = gridToPaths(TRUNK_GRID, treeSprite.pitch, 0.15);
const FOLIAGE_PATHS = gridToPaths(FOLIAGE_GRID, treeSprite.pitch, 0.15);

const TREE_BASE_WIDTH = treeSprite.grid[0].length; // 32
const TREE_BASE_HEIGHT = treeSprite.grid.length; // 48
const TREE_PITCH = treeSprite.pitch; // 2
const TREE_PIXEL_WIDTH = TREE_BASE_WIDTH * TREE_PITCH; // 64px
const TREE_POSITIONS = Array.from({ length: 8 }, (_, k) => 120 + 240 * k);

/** 640px hill period repeated 3× to fill the 1920px tile. */
const HILLS_GRID = buildHillGrid();
const HILLS_FULL_GRID: Grid = HILLS_GRID.map((row) =>
  Array.from({ length: 3 }, () => row).flat()
) as Grid;
const HILLS_PATHS = gridToPaths(HILLS_FULL_GRID, hillSprite.pitch, 0.35);
const HILLS_VIEWBOX_WIDTH = HILLS_FULL_GRID[0].length * hillSprite.pitch;
const HILLS_VIEWBOX_HEIGHT = HILLS_FULL_GRID.length * hillSprite.pitch;

/** Tufted top 4 rows alternate highlight/light, then solid bands. */
function grassBandIndex(r: number): number {
  if (r < 4) return r % 2 === 0 ? 0 : 1;
  return Math.floor((r - 4) / 5) % 3;
}

const GRASS_GRID = ditherBand(
  grassSprite.grid,
  grassSprite.ramp as readonly string[],
  (r, _c) => grassBandIndex(r)
);
const GRASS_PATHS = gridToPaths(GRASS_GRID, grassSprite.pitch, 0);
const GRASS_HEIGHT = GRASS_GRID.length * grassSprite.pitch; // 80px
const GRASS_WIDTH = GRASS_GRID[0].length * grassSprite.pitch; // 1920px

const ROAD_TEXTURE_PATHS = gridToPaths(roadTextureSprite.grid, roadTextureSprite.pitch, 0);
const ROAD_TEXTURE_WIDTH = roadTextureSprite.grid[0].length * roadTextureSprite.pitch; // 1920px
const ROAD_TEXTURE_HEIGHT = roadTextureSprite.grid.length * roadTextureSprite.pitch; // 40px

/** Render a sun sprite at given position within the 1920px tile */
function SunSprite({ x, y, size = 64 }: { x: number; y: number; size?: number }) {
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
      viewBox={`0 0 ${SUN_VIEWBOX_WIDTH} ${SUN_VIEWBOX_HEIGHT}`}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {SUN_PATHS.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}

/** Render a cloud sprite at given position within the 1920px tile */
function CloudSprite({ x, y, width = 96, height = 48 }: { x: number; y: number; width?: number; height?: number }) {
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
      viewBox={`0 0 ${CLOUD_VIEWBOX_WIDTH} ${CLOUD_VIEWBOX_HEIGHT}`}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {CLOUD_PATHS.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}

/** Render the hills layer as a full 1920px tile using hillSprite (640px period, 3 peaks) */
function HillsTile() {
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
        viewBox={`0 0 ${HILLS_VIEWBOX_WIDTH} ${HILLS_VIEWBOX_HEIGHT}`}
        shapeRendering="crispEdges"
        preserveAspectRatio="none"
        style={{ imageRendering: "pixelated", width: "100%", height: "100%" }}
        aria-hidden
      >
        {HILLS_PATHS.map((p, i) => (
          <path key={i} d={p.d} fill={p.fill} />
        ))}
      </svg>
    </div>
  );
}

/** Render the trees layer as a full 1920px tile with 8 trees at 240px pitch */
function TreesTile() {
  return (
    <div className="w-[1920px] h-full relative">
      {TREE_POSITIONS.map((cx, k) => (
        <div
          key={k}
          className="absolute"
          style={{
            left: `${cx - TREE_PIXEL_WIDTH / 2}px`,
            width: `${TREE_PIXEL_WIDTH}px`,
            height: `${TREE_BASE_HEIGHT * TREE_PITCH}px`,
            bottom: "-4px",
          }}
        >
          {/* Trunk first, canopy over it so the junction outline is hidden */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${TREE_PIXEL_WIDTH} ${TREE_BASE_HEIGHT * TREE_PITCH}`}
            shapeRendering="crispEdges"
            style={{ imageRendering: "pixelated" }}
            aria-hidden
          >
            {TRUNK_PATHS.map((p, i) => (
              <path key={`trunk-${i}`} d={p.d} fill={p.fill} />
            ))}
            {FOLIAGE_PATHS.map((p, i) => (
              <path key={`foliage-${i}`} d={p.d} fill={p.fill} />
            ))}
          </svg>
        </div>
      ))}
    </div>
  );
}

/** Render the ground layer: grass verge (top 23.529%) over road with texture overlay */
function GroundTile() {
  const GRASS_FRACTION = 23.529;

  return (
    <div
      className="w-[1920px] h-full relative"
      style={{ backgroundColor: "var(--color-scene-road-base)" }}
    >
      {/* Grass verge — top 23.529% of the layer */}
      <div
        className="absolute inset-x-0 top-0"
        style={
          {
            height: `${GRASS_FRACTION}%`,
            position: "relative",
            backgroundColor: "var(--color-scene-grass-base)",
          } as React.CSSProperties
        }
      >
        <svg
          className="absolute inset-0"
          viewBox={`0 0 ${GRASS_WIDTH} ${GRASS_HEIGHT}`}
          shapeRendering="crispEdges"
          preserveAspectRatio="none"
          style={{ imageRendering: "pixelated", width: "100%", height: "100%" }}
          aria-hidden
        >
          {GRASS_PATHS.map((p, i) => (
            <path key={i} d={p.d} fill={p.fill} />
          ))}
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
  return (
    <svg
      className="w-[1920px] h-full"
      viewBox={`0 0 ${ROAD_TEXTURE_WIDTH} ${ROAD_TEXTURE_HEIGHT}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", opacity: 0.4 }}
      aria-hidden
    >
      {ROAD_TEXTURE_PATHS.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}

function ArcadeBackgroundUnmemoized({ isMoving, className = "" }: ArcadeBackgroundProps) {
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

  const effectiveReducedMotion = Boolean(prefersReducedMotion) && !debugForceMotion;

  // The integrator owns velocity; React only says whether the road should move.
  useEffect(() => {
    scrollSetMoving(isMoving && !effectiveReducedMotion);
    return () => scrollSetMoving(false);
  }, [isMoving, effectiveReducedMotion]);

  const skyTile = () => (
    <div className="w-[1920px] h-full relative" style={{ backgroundImage: skyGradient }}>
      {/* Clouds — positioned off-seam, parallax with sky */}
      <CloudSprite x={850} y={96} width={220} height={60} />
      <CloudSprite x={1410} y={48} width={180} height={48} />
    </div>
  );

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>

      {/* Sky — a vertical daylight gradient. Period = tile width (1920px). */}
      <ScrollLayer
        depth={16 / CRUISE_PX_PER_S}
        frozen={effectiveReducedMotion}
        boxClassName="inset-0"
        renderTile={skyTile}
      />

      {/* Sun — static, no parallax */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <SunSprite x={424} y={32} size={64} />
      </div>

      {/* Hills — distant, 32 px/s, base tucked behind the treeline */}
      <ScrollLayer
        depth={32 / CRUISE_PX_PER_S}
        frozen={effectiveReducedMotion}
        boxClassName="bottom-[34%] h-[28%]"
        renderTile={HillsTile}
      />

      {/* Trees — nearer, 76.8 px/s, base on the horizon */}
      <ScrollLayer
        depth={76.8 / CRUISE_PX_PER_S}
        frozen={effectiveReducedMotion}
        boxClassName="bottom-[34%] h-[24%]"
        renderTile={TreesTile}
      />

      {/* Surface plane — grass verge over road */}
      <ScrollLayer
        depth={192 / CRUISE_PX_PER_S}
        frozen={effectiveReducedMotion}
        boxClassName="bottom-0 h-[34%]"
        renderTile={GroundTile}
      />

      {/* Road edge lines — 60px period, 960 px/s */}
      <ScrollLayer
        depth={1}
        frozen={effectiveReducedMotion}
        boxClassName="bottom-0 h-[26%]"
        renderTile={EdgesTile}
      />

      {/* Kerb rumble — 192px period, 960 px/s, on the grass/road boundary */}
      <ScrollLayer
        depth={1}
        frozen={effectiveReducedMotion}
        boxClassName="bottom-[26%] h-1"
        renderTile={RumbleTile}
      />

      {/* Road dashes — 192px period, 960 px/s, lane divider at the road midpoint */}
      <ScrollLayer
        depth={1}
        frozen={effectiveReducedMotion}
        boxClassName="bottom-[13%] h-1"
        renderTile={DashesTile}
      />

      {/* Road texture overlay — sparse horizontal cracks & patches at 40% opacity */}
      <ScrollLayer
        depth={1}
        frozen={effectiveReducedMotion}
        boxClassName="bottom-[13%] h-[40px]"
        renderTile={RoadTextureTile}
      />
    </div>
  );
}

/**
 * Memoized: its only meaningful prop is `isMoving`. Precomputing consolidated
 * path definitions keeps the background to ~200 SVG path elements and avoids
 * reconciliation overhead on state changes (stoplight, lives, score).
 */
export default memo(ArcadeBackgroundUnmemoized);