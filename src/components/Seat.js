'use client';

import Hand from './Hand';

export default function Seat({
  player,
  isTurn,
  isHuman = false,
  cardsFaceDown = true,
  winningCards = [],
  handName = null,
  isWinner = false,
  size = 'sm',
}) {
  if (!player) return null;

  return (
    <div className={`seat-block flex flex-col items-center ${player.folded ? 'opacity-40' : ''}`}>
      {player.hand.length > 0 && (
        <Hand cards={player.hand} faceDown={cardsFaceDown} winningCards={winningCards} size={size} />
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
        {!player.out && player.bet > 0 && (
          <span className="text-white/50">Bet: {player.bet}</span>
        )}
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
