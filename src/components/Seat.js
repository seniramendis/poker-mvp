'use client';

import { motion } from 'framer-motion';
import Hand from './Hand';
import { ChipStack } from './ChipStack';

export default function Seat({
  player,
  seatId,
  isTurn,
  isHuman = false,
  isDealerButton = false,
  cardsFaceDown = true,
  winningCards = [],
  handName = null,
  isWinner = false,
  size = 'sm',
}) {
  if (!player) return null;

  return (
    <div className={`seat-block flex flex-col items-center ${player.folded ? 'opacity-40' : ''}`}>
      <div className="relative">
        {isTurn && <motion.div className="seat-turn-ring" layoutId="turn-ring" />}
        <div className={`seat-pod ${isTurn ? 'seat-pod-active' : ''} ${isWinner ? 'seat-pod-winner' : ''}`}>
          {player.hand.length > 0 && (
            <Hand
              cards={player.hand}
              faceDown={cardsFaceDown}
              winningCards={winningCards}
              size={size}
              seatId={seatId}
            />
          )}
        </div>
        {isDealerButton && <span className="dealer-button-chip">D</span>}
      </div>

      {/* Live bet, shown as an actual chip stack on the felt (not just a number) */}
      {!player.out && player.bet > 0 && (
        <div className="seat-bet flex flex-col items-center gap-0.5 mt-1.5">
          <ChipStack amount={player.bet} small />
          <span className="seat-bet-amount">{player.bet.toLocaleString()}</span>
        </div>
      )}

      <div
        className={`seat-label mt-1 flex flex-col items-center gap-0.5 text-white/80 text-[10px] sm:text-xs ${
          isTurn ? 'turn-indicator' : ''
        }`}
      >
        <span className="font-semibold tracking-wide truncate max-w-[74px] sm:max-w-none">
          {isHuman ? 'YOU' : player.name}
        </span>
        <span className="text-amber-200/70">
          {player.out ? 'OUT' : `${player.chips.toLocaleString()}`}
        </span>
        {player.allIn && !player.out && <span className="text-red-300/80 font-bold">ALL-IN</span>}
      </div>
      {handName && (
        <div
          className={`hand-name-tag mt-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[11px] font-bold tracking-wide whitespace-nowrap ${
            isWinner ? 'hand-name-winner' : 'hand-name-shown'
          }`}
        >
          {handName}
        </div>
      )}
    </div>
  );
}
