/**
 * ArcadeBackground — Seamless looping pixel-art tiled background.
 *
 * Renders a 200%-width container with two pixel-identical tile children,
 * animated via CSS translateX(0 → -50%) using the existing scrollBackground
 * keyframes. Pure CSS — no requestAnimationFrame or JS loops.
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

const groundGradient = "linear-gradient(90deg,rgba(41,173,255,0.04) 1px,transparent 1px)";

export default function ArcadeBackground({ isMoving, className = "" }: ArcadeBackgroundProps) {
  const scrollState = isMoving ? "arcade-scroll-running" : "";

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Sky / Distant Background — pixel-checkerboard tile */}
      <div
        className={`arcade-scroll-sky ${scrollState} absolute inset-0 w-[200%] h-1/2 flex border-b border-white/5 opacity-40 motion-reduce:animate-none`}
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

      {/* Ground / Road — vertical-stripe tile */}
      <div
        className={`arcade-scroll-ground ${scrollState} absolute bottom-0 left-0 w-[200%] h-1/2 flex bg-slate-900/20 motion-reduce:animate-none`}
        aria-hidden
      >
        <div className="w-1/2 h-full border-t border-white/5 relative">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: groundGradient,
              backgroundSize: "40px 100%",
            }}
          />
        </div>
        <div className="w-1/2 h-full border-t border-white/5 relative">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: groundGradient,
              backgroundSize: "40px 100%",
            }}
          />
        </div>
      </div>

      {/* Road dashes — fast scrolling lane markings */}
      <div
        className={`arcade-scroll-dashes ${scrollState} absolute bottom-1/4 left-0 w-[200%] h-1 flex gap-16 motion-reduce:animate-none`}
        aria-hidden
      >
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="w-32 h-full bg-white/5 rounded-full" />
        ))}
      </div>
    </div>
  );
}