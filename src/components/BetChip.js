'use client';

import { motion } from 'framer-motion';
import { seatPct, POT_PCT } from '../lib/seatLayout';

/**
 * A single chip that flies from a seat to the pot when that player bets,
 * calls, or raises. Purely decorative - GameView mounts one of these per
 * bet event and lets it unmount itself when the flight finishes.
 */
export default function BetChip({ fromId, onDone }) {
  const from = seatPct(fromId);
  const to = POT_PCT;

  return (
    <motion.div
      className="bet-chip"
      initial={{
        top: `${from.top}%`,
        left: `${from.left}%`,
        opacity: 0,
        scale: 0.6,
      }}
      animate={{
        top: [`${from.top}%`, `${(from.top + to.top) / 2 - 6}%`, `${to.top}%`],
        left: [`${from.left}%`, `${(from.left + to.left) / 2}%`, `${to.left}%`],
        opacity: [0, 1, 1, 0],
        scale: [0.6, 1, 0.8],
      }}
      transition={{ duration: 0.62, ease: 'easeOut' }}
      onAnimationComplete={onDone}
    />
  );
}
