'use client';

import { motion } from 'framer-motion';
import { DEALER_SEAT_CSS } from '../lib/seatLayout';

/**
 * The permanent dealer: a fixed human presence alone at the head of the
 * table, directly across from the player - never a bot, never folds,
 * never busts. Breathes and blinks at idle, riffle-shuffles the shoe when
 * a fresh hand starts, and swings a dealing arm while actively pitching
 * cards out.
 */
export default function Dealer({ isDealing = false, isShuffling = false, cardsLeft = 0 }) {
  const active = isDealing || isShuffling;

  return (
    <div
      className="absolute z-20 flex flex-col items-center pointer-events-none"
      style={{ ...DEALER_SEAT_CSS, transform: 'translate(-50%, 0)' }}
    >
      <motion.div
        className="dealer-figure flex flex-col items-center"
        animate={
          active
            ? { y: [0, -3, 0], scale: [1, 1.03, 1] }
            : { y: [0, -2, 0] }
        }
        transition={
          active
            ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <svg
          className={`dealer-person ${active ? 'dealer-person-active' : ''}`}
          viewBox="0 0 120 168"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Torso / vest */}
          <path
            d="M28 70 C28 58 42 50 60 50 C78 50 92 58 92 70 L100 160 L20 160 Z"
            fill="#0d2f1d"
            stroke="#d4af37"
            strokeWidth="1.6"
          />
          <path d="M50 58 L60 78 L70 58 L60 66 Z" fill="#7a1f1f" stroke="#d4af37" strokeWidth="0.6" />

          {/* Static resting arm */}
          <motion.g
            style={{ transformOrigin: '32px 74px' }}
            animate={active ? { rotate: [0, -3, 0] } : { rotate: 0 }}
            transition={{ duration: 0.5, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
          >
            <rect x="18" y="72" width="16" height="46" rx="8" fill="#0d2f1d" stroke="#d4af37" strokeWidth="1.2" />
            <circle cx="24" cy="120" r="8" fill="#e3b28e" />
          </motion.g>

          {/* Dealing arm - swings out to pitch cards */}
          <motion.g
            style={{ transformOrigin: '88px 74px' }}
            animate={
              isDealing
                ? { rotate: [0, 34, 0] }
                : { rotate: 0 }
            }
            transition={{ duration: 0.42, repeat: isDealing ? Infinity : 0, ease: 'easeInOut' }}
          >
            <rect x="86" y="72" width="16" height="46" rx="8" fill="#0d2f1d" stroke="#d4af37" strokeWidth="1.2" />
            <circle cx="96" cy="120" r="8" fill="#e3b28e" />
            <rect x="90" y="112" width="14" height="19" rx="2" fill="#faf6ec" stroke="#1b3a6b" strokeWidth="1" />
          </motion.g>

          {/* Neck */}
          <rect x="52" y="46" width="16" height="14" fill="#e3b28e" />

          {/* Head */}
          <circle cx="60" cy="30" r="20" fill="#e3b28e" />
          {/* Hair */}
          <path d="M40 26 C40 12 80 12 80 26 C80 18 68 12 60 12 C52 12 40 18 40 26 Z" fill="#2b1c12" />
          <path d="M40 24 C38 30 38 36 41 42" fill="none" stroke="#2b1c12" strokeWidth="4" strokeLinecap="round" />
          <path d="M80 24 C82 30 82 36 79 42" fill="none" stroke="#2b1c12" strokeWidth="4" strokeLinecap="round" />

          {/* Face */}
          <motion.g
            animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
            transition={{ duration: 3.6, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: 'easeInOut' }}
            style={{ transformOrigin: '60px 30px' }}
          >
            <ellipse cx="52" cy="30" rx="2.2" ry="2.8" fill="#1a1a1a" />
            <ellipse cx="68" cy="30" rx="2.2" ry="2.8" fill="#1a1a1a" />
          </motion.g>
          <path d="M53 40 Q60 44 67 40" fill="none" stroke="#7a4b32" strokeWidth="1.6" strokeLinecap="round" />

          {/* Visor */}
          <path d="M40 22 Q60 14 80 22 L80 18 Q60 10 40 18 Z" fill="#14100a" stroke="#d4af37" strokeWidth="1" />
        </svg>

        {/* The shoe / remaining deck - riffles when shuffling before a hand */}
        <div className={`dealer-shoe ${isShuffling ? 'dealer-shoe-shuffling' : ''}`} aria-hidden="true">
          {Array.from({ length: Math.min(4, Math.max(1, Math.ceil(cardsLeft / 13))) }).map((_, i) => (
            <div
              key={i}
              className="dealer-shoe-card"
              style={{ bottom: `${i * 1.5}px`, animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>

        <span className="dealer-tag">{isShuffling ? 'SHUFFLING…' : 'DEALER'}</span>
      </motion.div>
    </div>
  );
}
