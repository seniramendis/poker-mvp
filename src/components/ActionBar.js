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
      className={`action-bar pointer-events-auto flex flex-col items-center gap-3 transition-all duration-300 ${
        active ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-2 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
        <input
          type="range"
          min={minRaise}
          max={Math.max(maxRaise, minRaise)}
          value={clampedRaise}
          onChange={(e) => setRaiseAmount(Number(e.target.value))}
          className="w-40 accent-amber-400"
        />
        <span className="text-amber-300 font-mono w-16 text-sm">{clampedRaise} LKR</span>
      </div>

      <div className="flex gap-3">
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
