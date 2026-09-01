/**
 * CarSprite — Inline SVG pixel-grid car sprite built from <rect> primitives.
 *
 * Each "pixel" is a 4-unit rect on a 64×32 viewBox (16×8 effective pixels).
 * CSS image-rendering: pixelated preserves crisp edges. Frame switching via
 * CSS steps() and conditional rendering — no requestAnimationFrame.
 *
 * Props drive visual state: idle, moving (animated), crashed.
 * Lives-based car-color recoloring with lives>=5 yellow aura.
 *
 * @license Apache-2.0
 */

import type { CSSProperties } from "react";

export interface CarSpriteProps {
  isMoving: boolean;
  isCrashed: boolean;
  lives: number;
  className?: string;
}

/* ---- Lives → color tiers (mirrors original App.tsx progression) ---- */
function carColor(lives: number): string {
  switch (lives) {
    case 1: return "#64748b"; // dim slate
    case 2: return "#7ba7c9"; // medium primary
    case 3: return "#8ed5ff"; // full primary
    case 4: return "#7dd3fc"; // sky blue
    default: return "#facc15"; // yellow (5+)
  }
}

const WINDOW = "#bfdbfe";
const DARK = "#1e293b";

/* ---- Geometric pixel body via <rect>s; fill inherits from group ---- */
interface BodyProps {
  color: string;
  windowColor: string;
  dark: string;
  offset: number; // Y offset for bounce frames
  damage?: boolean;
}

function BodyPixel({ color, windowColor, dark, offset, damage }: BodyProps) {
  const y = offset;
  return (
    <g>
      {/* main body */}
      <rect x="4" y={y + 12} width="56" height="12" rx="2" fill={color} />
      {/* roof */}
      <rect x="16" y={y + 4} width="24" height="12" rx="2" fill={color} />
      {/* window */}
      <rect x="18" y={y + 6} width="20" height="8" rx="1" fill={windowColor} />
      {/* rear spoiler */}
      <rect x="4" y={y + 8} width="4" height="4" rx="1" fill={dark} />
      {/* front bumper */}
      <rect x="2" y={y + 16} width="4" height="4" rx="1" fill={dark} />
      {/* headlights (yellow always) */}
      <rect x="56" y={y + 14} width="6" height="4" rx="1" fill="#facc15" />
      {/* wheels */}
      <rect x="10" y={y + 24} width="12" height="6" rx="2" fill={dark} />
      <rect x="42" y={y + 24} width="12" height="6" rx="2" fill={dark} />
      {/* wheel rims */}
      <rect x="13" y={y + 26} width="3" height="2" fill={windowColor} opacity={0.7} />
      <rect x="45" y={y + 26} width="3" height="2" fill={windowColor} opacity={0.7} />
      {damage && (
        <>
          {/* cracked window */}
          <rect x="22" y={y + 12} width="4" height="2" fill="#ef4444" />
          {/* sparks */}
          <rect x="20" y={y + 2} width="2" height="2" fill="#ef4444" opacity={0.7} />
          <rect x="30" y={y} width="2" height="2" fill="#f97316" opacity={0.7} />
          <rect x="44" y={y} width="2" height="2" fill="#facc15" opacity={0.6} />
        </>
      )}
    </g>
  );
}

export default function CarSprite({
  isMoving,
  isCrashed,
  lives,
  className = "",
}: CarSpriteProps) {
  const color = carColor(lives);

  const svgStyle: CSSProperties = {
    imageRendering: "pixelated",
    "--car-color": color,
  } as CSSProperties;

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 64 32"
        role="img"
        aria-label={`Car sprite — ${lives} lives remaining`}
        className="w-full h-full"
        style={svgStyle}
      >
        {/* Bounce offset for moving frames, animated via CSS steps() */}
        {isCrashed ? (
          <BodyPixel color={color} windowColor={WINDOW} dark={DARK} offset={2} damage />
        ) : isMoving ? (
          <g className="car-bounce motion-reduce:animate-none">
            <BodyPixel color={color} windowColor={WINDOW} dark={DARK} offset={0} />
          </g>
        ) : (
          <BodyPixel color={color} windowColor={WINDOW} dark={DARK} offset={0} />
        )}
      </svg>

      {/* Lives >= 5 yellow aura glow */}
      {lives >= 5 && (
        <div
          className="car-aura absolute inset-0"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      )}
    </div>
  );
}
