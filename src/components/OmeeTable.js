'use client';

// Same flat oval table treatment as PokerTable, but shaped for a 4-seat
// trick-taking game (slightly less elongated) and re-labelled.
export default function OmeeTable() {
  return (
    <div
      className="absolute top-0 left-0 w-full h-full -z-10 flex items-center justify-center"
      style={{
        background:
          'radial-gradient(ellipse at 50% 38%, #0f2e1e 0%, #081d13 45%, #04120c 75%, #020a07 100%)',
      }}
    >
      <div className="poker-table-oval" style={{ width: 'clamp(240px, 74vw, 620px)', height: 'clamp(240px, 60vh, 560px)', borderRadius: '46%' }}>
        <div className="poker-table-gold" style={{ borderRadius: '46%' }}>
          <div className="poker-table-felt" style={{ borderRadius: '46%' }}>
            <div className="poker-table-felt-shine" />
            <div className="poker-table-felt-vignette" />
            <span className="poker-table-watermark">OMEE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
