'use client';

import { useState } from 'react';

export default function ActionBar({
  isPlayerTurn,
  toCall,
  minRaise,
  maxRaise,
  onFold,
  onCheck,
  onCall,
  onRaise,
  disabled,
}) {
  const [raiseAmount, setRaiseAmount] = useState(() => Math.min(minRaise, Math.max(maxRaise, minRaise)));

  const canCheck = toCall === 0;
  const active = isPlayerTurn && !disabled;
  const clampedRaise = Math.min(Math.max(raiseAmount, minRaise), Math.max(maxRaise, minRaise));

  return (
    <div
      className={`action-bar pointer-events-auto flex flex-col items-center gap-2 sm:gap-3 w-full max-w-md transition-all duration-300 ${
        active ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-2 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3 bg-black/60 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 max-w-full">
        <input
          type="range"
          min={minRaise}
          max={Math.max(maxRaise, minRaise)}
          value={clampedRaise}
          onChange={(e) => setRaiseAmount(Number(e.target.value))}
          className="action-bar-slider w-28 sm:w-40 accent-amber-400"
        />
        <span className="text-amber-300 font-mono w-14 sm:w-16 text-xs sm:text-sm shrink-0">
          {clampedRaise} LKR
        </span>
      </div>

      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        <button
          onClick={onFold}
          disabled={!active}
          className="action-btn action-btn-fold"
        >
          FOLD
        </button>
        {canCheck ? (
          <button onClick={onCheck} disabled={!active} className="action-btn action-btn-check">
            CHECK
          </button>
        ) : (
          <button onClick={onCall} disabled={!active} className="action-btn action-btn-call">
            CALL {toCall}
          </button>
        )}
        <button
          onClick={() => onRaise(clampedRaise)}
          disabled={!active || maxRaise < minRaise}
          className="action-btn action-btn-raise"
        >
          RAISE
        </button>
      </div>
    </div>
  );
}
