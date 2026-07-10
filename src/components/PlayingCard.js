'use client';

const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED_SUITS = new Set(['H', 'D']);

/**
 * A single animated playing card.
 * - `faceDown`: shows the card back
 * - `dealDelay`: stagger the deal-in animation (ms)
 * - `highlight`: adds a winning-hand glow
 */
export default function PlayingCard({
  card,
  faceDown = false,
  dealDelay = 0,
  highlight = false,
  size = 'md',
}) {
  const dims = SIZES[size] || SIZES.md;
  const isRed = card && RED_SUITS.has(card.suit);

  return (
    <div
      className={`card-flip-wrap ${highlight ? 'card-highlight' : ''}`}
      style={{
        width: dims.w,
        height: dims.h,
        animationDelay: `${dealDelay}ms`,
      }}
    >
      <div className={`card-flip-inner ${faceDown ? '' : 'is-flipped'}`}>
        {/* Back face */}
        <div className="card-face card-back">
          <div className="card-back-pattern" />
        </div>

        {/* Front face */}
        <div className={`card-face card-front ${isRed ? 'text-red' : 'text-black'}`}>
          {card && (
            <>
              <div className="card-corner card-corner-tl">
                <span className="card-rank">{card.rank}</span>
                <span className="card-suit-mini">{SUIT_SYMBOL[card.suit]}</span>
              </div>
              <div className="card-suit-center">{SUIT_SYMBOL[card.suit]}</div>
              <div className="card-corner card-corner-br">
                <span className="card-rank">{card.rank}</span>
                <span className="card-suit-mini">{SUIT_SYMBOL[card.suit]}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const SIZES = {
  sm: { w: 46, h: 64 },
  md: { w: 62, h: 88 },
  lg: { w: 78, h: 110 },
};
