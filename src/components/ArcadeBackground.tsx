/**
 * ArcadeBackground — Seamless looping pixel-art tiled background.
 *
 * Renders two pixel-identical tile children animated via CSS
 * translateX(0 → -50%) using the existing scrollBackground keyframes. Tile
 * geometry is per-layer, because a translateX(-50%) loop is only seamless when
 * the pan distance is congruent to 0 modulo that layer's own period at EVERY
 * viewport width — so the dash and ground layers use fixed 1920px tiles in a
 * 3840px row, while the sky keeps percentage tiles until its period changes.
 * Pure CSS — no requestAnimationFrame or JS loops.
 * Reduced motion disables all scroll layers via media query in index.css.
 *
 * @license Apache-2.0
 */

interface ArcadeBackgroundProps {
  isMoving: boolean;
  className?: string;
}

const tileGradient = [
  "linear-gradient(45deg,var(--color-surface) 25%,transparent 25%,transparent 75%,var(--color-surface) 75%,var(--color-surface))",
  "linear-gradient(45deg,var(--color-surface) 25%,transparent 25%,transparent 75%,var(--color-surface) 75%,var(--color-surface))",
].join(",");

const groundGradient = "linear-gradient(90deg,var(--color-track-line) 1px,transparent 1px)";

const dashGradient =
  "repeating-linear-gradient(90deg,var(--color-dash) 0 128px,transparent 128px 192px)";

export default function ArcadeBackground({ isMoving, className = "" }: ArcadeBackgroundProps) {
  const scrollState = isMoving ? "arcade-scroll-running" : "";

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Sky / Distant Background — pixel-checkerboard tile */}
      <div
        className={`arcade-scroll-sky ${scrollState} absolute inset-0 w-[200%] h-1/2 flex border-b border-overlay-faint opacity-40 motion-reduce:animate-none`}
        aria-hidden
      >
        <div
          className="w-1/2 h-full relative"
          style={{
            backgroundImage: tileGradient,
            backgroundSize: "100px 100px",
            backgroundPosition: "0 0,50px 50px",
          }}
        />
        <div
          className="w-1/2 h-full relative"
          style={{
            backgroundImage: tileGradient,
            backgroundSize: "100px 100px",
            backgroundPosition: "0 0,50px 50px",
          }}
        />
      </div>

      {/* Ground / Road — vertical-stripe tile. Fixed 1920px tiles in a 3840px row for
          the same reason as the dashes: translateX(-50%) pans exactly one container
          half (1920px), and the stripe period is 40px, so 1920 = 48 × 40 and the A/B
          boundary lands on a period boundary at EVERY viewport width. A w-1/2 tile
          (width = panel width, e.g. 1100px) is NOT period-aligned — 1100 mod 40 = 20,
          which halves the spacing across the seam. This layer's seam is also parked
          out of sight: isMoving runs 3s, so the boundary advances 3 × 192 = 576px and
          rests at screen x = 1344, outside the 1100px panel, for the whole question. */}
      <div
        className={`arcade-scroll-ground ${scrollState} absolute bottom-0 left-0 w-[3840px] h-1/2 flex bg-ground-tint motion-reduce:animate-none`}
        aria-hidden
      >
        <div className="w-[1920px] h-full border-t border-overlay-faint relative">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: groundGradient,
              backgroundSize: "40px 100%",
            }}
          />
        </div>
        <div className="w-[1920px] h-full border-t border-overlay-faint relative">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: groundGradient,
              backgroundSize: "40px 100%",
            }}
          />
        </div>
      </div>

      {/* Road dashes — fast scrolling lane markings. Periodic 192px gradient on
          TWO FIXED 1920px (10-period) tiles inside a 3840px container. Seamless
          wrapping requires tile width ≡ 0 (mod 192px): 1920 = 10 × 192, so
          translateX(-50%) pans exactly one container half (1920px = 10 periods)
          and the A/B boundary lands on a period boundary at every viewport
          width. A w-1/2 tile (width = panel width, e.g. 1100px) is NOT
          period-aligned (1100 mod 192 = 140) and shows a seam. */}
      <div
        className={`arcade-scroll-dashes ${scrollState} absolute bottom-1/4 left-0 w-[3840px] h-1 flex motion-reduce:animate-none`}
        aria-hidden
      >
        <div
          className="w-[1920px] h-full"
          style={{
            backgroundImage: dashGradient,
          }}
        />
        <div
          className="w-[1920px] h-full"
          style={{
            backgroundImage: dashGradient,
          }}
        />
      </div>
    </div>
  );
}