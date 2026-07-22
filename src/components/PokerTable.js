'use client';

// A flat, PokerStars-style oval table built with layered CSS gradients
// instead of a 3D scene. This is the classic "kidney table" look: a thin
// dark rail, a gold trim line, and a green felt oval with a soft overhead
// highlight - simple, crisp, and reliably renders the same on every device.
export default function PokerTable() {
  return (
    <div
      className="absolute top-0 left-0 w-full h-full -z-10 flex items-center justify-center"
      style={{
        background:
          'radial-gradient(ellipse at 50% 38%, #0f2e1e 0%, #081d13 45%, #04120c 75%, #020a07 100%)',
      }}
    >
      <div className="poker-table-oval">
        <div className="poker-table-gold">
          <div className="poker-table-felt">
            <div className="poker-table-spotlight" />
            <div className="poker-table-felt-shine" />
            <div className="poker-table-felt-vignette" />
            <span className="poker-table-watermark">POKER LK HUB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
