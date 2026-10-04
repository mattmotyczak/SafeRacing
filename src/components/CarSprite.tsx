/**
 * CarSprite — Detailed inline SVG pixel-grid arcade racing car sprite.
 *
 * Rendered from crisp <rect> cells facing forward (RIGHT):
 * - Aerodynamic body with hood, roof, rear spoiler on the left
 * - Windshield and side tinted windows with light reflection
 * - Front yellow headlights pointing right
 * - Rear red taillights on the left (exhaust side)
 * - Front & rear black tires with silver rims
 * - Dynamic color tiers mapped to remaining lives
 *
 * @license Apache-2.0
 */

import React from "react";
import type { CSSProperties } from "react";

export interface CarSpriteProps {
  isMoving: boolean;
  isCrashed: boolean;
  lives: number;
  className?: string;
}

function getTierColor(lives: number): { base: string; light: string; shadow: string } {
  let base: string;
  switch (lives) {
    case 1:
      base = "var(--color-car-tier1)";
      break;
    case 2:
      base = "var(--color-car-tier2)";
      break;
    case 3:
      base = "var(--color-car-tier3)";
      break;
    case 4:
      base = "var(--color-car-tier4)";
      break;
    default:
      base = "var(--color-car-tier5)";
      break;
  }
  return {
    base,
    light: `color-mix(in srgb, ${base} 75%, var(--color-scene-clouds))`,
    shadow: `color-mix(in srgb, ${base} 65%, var(--color-scene-outline))`,
  };
}

/**
 * 32x16 Pixel Grid Matrix for an authentic Arcade Sports Car facing forward (RIGHT ->).
 *
 * Legend:
 * . = Transparent
 * O = Dark outline / chassis
 * B = Body base color (tier)
 * L = Body highlight / top reflection
 * S = Body shadow / rocker panel
 * W = Window glass (tinted)
 * G = Windshield glare reflection
 * H = Headlight (yellow)
 * T = Taillight (red)
 * R = Wheel rim (silver)
 * K = Tire rubber (dark slate)
 */
const CAR_MATRIX: readonly string[] = [
  /* 0 */ "................................",
  /* 1 */ "................................",
  /* 2 */ "................................",
  /* 3 */ ".OOOOO..........................", // Rear spoiler wing
  /* 4 */ ".OLLLO.....OOOOOOOOO............", // Spoiler & roof top line
  /* 5 */ "..OO.....OOLLLLLLLLLOO..........", // Strut & roof highlight
  /* 6 */ "..OO....OOWWWWWWWWWWWGGO........", // Rear window, side glass, windshield
  /* 7 */ "..OO...OOWWWWWWWWWWWWGGO........", // Cabin side glass & A-pillar
  /* 8 */ ".OBBBBBOOWWWWWWWWWWWWGGO........", // Trunk deck & windshield base
  /* 9 */ "OTTTTBBOOLLLLLLLLLLLLLLLLLOOO...", // Taillights, waistline & sloping hood
  /* 10*/ "OTTTBBBBBBBBBBBBBBBBBBBBBBLLLLHO", // Mid body, door, headlights
  /* 11*/ "OBBBBBBBBBBBBBBBBBBBBBBBBBBBBBHO", // Lower body, front bumper
  /* 12*/ ".OOSSSSSSOOOOOOOOOOOOSSSSSSOOOO.", // Wheel arches & rocker panel
  /* 13*/ "..OKKKKKKO..OOOOOO..OKKKKKKO....", // Tires top & chassis underside
  /* 14*/ "..OKKRRKKO..........OKKRRKKO....", // Tires & silver rims
  /* 15*/ "...OKKKKO............OKKKKO.....", // Tire contact patch
];

export default function CarSprite({
  isMoving,
  isCrashed,
  lives,
  className = "",
}: CarSpriteProps) {
  const { base, light, shadow } = getTierColor(lives);
  const pitch = 2; // 32 * 2 = 64px width, 16 * 2 = 32px height

  const colorMap: Record<string, string> = {
    O: "var(--color-scene-outline)",
    B: base,
    L: light,
    S: shadow,
    W: "var(--color-car-window)",
    G: "var(--color-scene-clouds)",
    H: "var(--color-car-headlight)",
    T: "var(--color-accent-red)",
    R: "var(--color-smoke)",
    K: "var(--color-car-dark)",
  };

  const cells: React.ReactElement[] = [];
  for (let r = 0; r < CAR_MATRIX.length; r++) {
    const row = CAR_MATRIX[r];
    for (let c = 0; c < row.length; c++) {
      const char = row[c];
      if (char !== ".") {
        const fill = colorMap[char] || base;
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={c * pitch}
            y={r * pitch}
            width={pitch}
            height={pitch}
            style={{ fill }}
          />
        );
      }
    }
  }

  const svgStyle: CSSProperties = {
    imageRendering: "pixelated",
  };

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 64 32"
        role="img"
        aria-label={`Car sprite — ${lives} lives remaining`}
        className="w-full h-full"
        style={svgStyle}
        shapeRendering="crispEdges"
      >
        {isCrashed ? (
          <g transform="translate(0, 4)">
            {cells}
          </g>
        ) : isMoving ? (
          <g className="car-bounce motion-reduce:animate-none">
            {cells}
          </g>
        ) : (
          <g>
            {cells}
          </g>
        )}
      </svg>
    </div>
  );
}