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
import { useReducedMotion } from "motion/react";

export interface CarSpriteProps {
  isMoving: boolean;
  isCrashed: boolean;
  lives: number;
  className?: string;
}

interface SmokePuffDef {
  dx: string;
  dy: string;
  color: string;
  delay: string;
  duration: string;
}

/** Staggered rising smoke puffs emitted from impact point */
const SMOKE_PUFFS: readonly SmokePuffDef[] = [
  { dx: "-8px", dy: "-20px", color: "var(--color-scorch-grey)", delay: "100ms", duration: "1800ms" },
  { dx: "6px", dy: "-24px", color: "var(--color-scorch-ash)", delay: "280ms", duration: "2000ms" },
  { dx: "-4px", dy: "-28px", color: "var(--color-scorch-soot)", delay: "500ms", duration: "2200ms" },
  { dx: "-10px", dy: "-26px", color: "var(--color-scorch-charred)", delay: "750ms", duration: "2400ms" },
  { dx: "8px", dy: "-30px", color: "var(--color-scorch-soot)", delay: "1050ms", duration: "2300ms" },
  { dx: "-5px", dy: "-32px", color: "var(--color-scorch-charred)", delay: "1350ms", duration: "2100ms" },
];

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

function getScorchedColorMap(): Record<string, string> {
  return {
    O: "var(--color-scorch-charred)",
    B: "var(--color-scorch-soot)",
    L: "var(--color-scorch-grey)",
    S: "var(--color-scorch-charred)",
    W: "var(--color-scorch-grey)",
    G: "var(--color-scorch-ash)",
    H: "var(--color-scorch-burnt-orange)",
    T: "var(--color-scorch-burnt-orange)",
    R: "var(--color-scorch-charred)",
    K: "var(--color-scorch-charred)",
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
  /* 2 */ ".......LLLLLLLLLLLL.............",
  /* 3 */ "......LWWWWWWWLWWWWWWL..........",
  /* 4 */ ".....LWWGWWWWWLWWGWGWWL.........",
  /* 5 */ "..LLLLBBBBBBBLBBBBBBBBBBBLLL....",
  /* 6 */ ".HHBBBBBBBBBBLBBBBBBBBBBBBBBBBH.",
  /* 7 */ "HHBBBBBBBBBBBLBBBBBBBBBBBBBBBBHH",
  /* 8 */ "BBBBBBBBBBBBBLBBBBBBBBBBBBBBBBBB",
  /* 9 */ "BSSOOOOOOOSSSSSSSSSSSSOOOOOOOSSS",
  /* 10*/ "SSOKKKKKKKOSSSSSSSSSSOKKKKKKKOSS",
  /* 11*/ "SSOKKRRRKKOOOOOOOOOOOOKKRRRKKOSS",
  /* 12*/ "..OKRRRRRKO..........OKRRRRRKO..",
  /* 13*/ "..OKKRRRKKO..........OKKRRRKKO..",
  /* 14*/ "...OKKKKKO............OKKKKKO....",
  /* 15*/ "....OOOOO..............OOOOO.....",
];

export default function CarSprite({
  isMoving,
  isCrashed,
  lives,
  className = "",
}: CarSpriteProps) {
  const prefersReducedMotion = useReducedMotion();
  const { base, light, shadow } = getTierColor(lives);
  const pitch = 2; // 32 * 2 = 64px width, 16 * 2 = 32px height

  const colorMap: Record<string, string> = isCrashed
    ? getScorchedColorMap()
    : {
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
        className="w-full h-full overflow-visible"
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

        {/* Crash Fireball & Smoke FX spawned in car coordinate space */}
        {isCrashed && (
          <g transform="translate(48, 14) scale(1.5)" className="pointer-events-none" aria-hidden="true">
            {prefersReducedMotion ? (
              <rect
                x="-48"
                y="-14"
                width="64"
                height="32"
                fill="var(--color-scorch-burnt-orange)"
                className="crash-reduced-flash"
                transform="scale(0.6667)"
                transformOrigin="0 0"
              />
            ) : (
              <>
                {/* 1. Initial Impact Flash */}
                <rect
                  x="-12"
                  y="-12"
                  width="24"
                  height="24"
                  fill="var(--color-scene-sun-highlight)"
                  className="crash-flash motion-reduce:animate-none"
                />

                {/* 2. Expanding & Color-Shifting Fireball */}
                <path
                  d="M-3 -6 h6 v2 h3 v8 h-3 v2 h-6 v-2 h-3 v-8 h3 z"
                  fill="var(--color-scorch-burnt-orange)"
                  className="crash-fireball-outer motion-reduce:animate-none"
                />
                <path
                  d="M-2 -4 h4 v1 h2 v6 h-2 v1 h-4 v-1 h-2 v-6 h2 z"
                  fill="var(--color-scorch-ember)"
                  className="crash-fireball-mid motion-reduce:animate-none"
                />
                <rect
                  x="-2"
                  y="-2"
                  width="4"
                  height="4"
                  fill="var(--color-scene-sun-highlight)"
                  className="crash-fireball-core motion-reduce:animate-none"
                />

                {/* 3. Staggered Rising Smoke Puffs */}
                {SMOKE_PUFFS.map((puff, i) => (
                  <path
                    key={`smoke-${i}`}
                    d="M-1 -3 h2 v1 h2 v4 h-2 v1 h-4 v-1 h-2 v-4 h2 z"
                    fill={puff.color}
                    className="crash-smoke-puff motion-reduce:animate-none"
                    style={
                      {
                        "--smoke-dx": puff.dx,
                        "--smoke-dy": puff.dy,
                        "--smoke-duration": puff.duration,
                        animationDelay: puff.delay,
                      } as CSSProperties
                    }
                  />
                ))}
              </>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}