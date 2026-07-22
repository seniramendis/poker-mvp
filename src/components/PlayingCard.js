'use client';

import { motion } from 'framer-motion';

const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED_SUITS = new Set(['H', 'D']);

/**
 * A single animated playing card, dealt in from the dealer's position at
 * the head of the table.
 * - `faceDown`: shows the card back
 * - `dealDelay`: stagger the deal-in animation (ms)
 * - `highlight`: adds a winning-hand glow
 * - `fromX` / `fromY`: pixel offset the card flies in from (dealer -> seat)
 */
export default function PlayingCard({
  card,
  faceDown = false,
  dealDelay = 0,
  highlight = false,
  size = 'md',
  fromX = 0,
  fromY = -120,
}) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const isRed = card && RED_SUITS.has(card.suit);

  return (
    <motion.div
      className={`card-flip-wrap ${sizeClass} ${highlight ? 'card-highlight' : ''}`}
      initial={{ opacity: 0, x: fromX, y: fromY, rotate: -22, scale: 0.55 }}
      animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
      transition={{
        delay: dealDelay / 1000,
        type: 'spring',
        stiffness: 320,
        damping: 24,
        mass: 0.7,
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
    </motion.div>
  );
}

const SIZE_CLASSES = {
  sm: 'card-size-sm',
  md: 'card-size-md',
  lg: 'card-size-lg',
};
