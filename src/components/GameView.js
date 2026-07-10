'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import PokerTable from './PokerTable';
import Hand from './Hand';
import CommunityCards from './CommunityCards';
import ActionBar from './ActionBar';
import { PotDisplay, ChipStack } from './ChipStack';
import { usePokerGame } from '../lib/usePokerGame';
import { evaluateHand } from '../lib/engine';

export default function GameView() {
  const { state, dealHand, resetTable, playerAction, PHASES } = usePokerGame();

  const toCall = Math.max(0, state.currentBet - state.playerBet);
  const isPlayerTurn = state.turn === 'player' && !state.handOver;
  const canAct = isPlayerTurn && state.playerChips > 0;

  const winningCards = useMemo(() => {
    if (state.phase !== PHASES.SHOWDOWN || !state.winner || state.winner === 'split') return [];
    if (state.communityCards.length < 5) return [];
    const hand = state.winner === 'player' ? state.playerHand : state.botHand;
    try {
      return evaluateHand([...hand, ...state.communityCards]).cards;
    } catch {
      return [];
    }
  }, [state.phase, state.winner, state.playerHand, state.botHand, state.communityCards, PHASES.SHOWDOWN]);

  const botFaceDown = !state.revealBot;

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden select-none">
      {/* 3D Background */}
      <PokerTable />

      {/* HUD */}
      <div className="safe-top safe-x absolute top-0 w-full flex justify-between items-start text-white z-10 pointer-events-none">
        <div className="min-w-0 pointer-events-auto">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <span className="text-amber-200/70 group-hover:-translate-x-0.5 transition-transform">
              &lsaquo;
            </span>
            <h1 className="hud-title text-lg sm:text-2xl font-bold tracking-widest drop-shadow-md truncate">
              POKER LK HUB
            </h1>
          </Link>
          <p className="hud-sub block text-[10px] sm:text-xs text-amber-200/70 tracking-wide mt-0.5 sm:mt-1 uppercase">
            Heads-Up Texas Hold&apos;em
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 sm:gap-2 pointer-events-auto shrink-0">
          <div className="bg-black/50 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg backdrop-blur-sm flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base whitespace-nowrap">
            <ChipStack amount={state.playerChips} small />
            <span className="hidden sm:inline">Balance: {state.playerChips.toLocaleString()} LKR</span>
            <span className="sm:hidden">{state.playerChips.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs">
            <Link
              href="/"
              className="text-white/50 hover:text-white/90 transition-colors underline underline-offset-2"
            >
              Home
            </Link>
            <span className="text-white/20">&middot;</span>
            <button
              onClick={resetTable}
              className="text-white/50 hover:text-white/90 transition-colors underline underline-offset-2"
            >
              Reset table
            </button>
          </div>
        </div>
      </div>

      {/* Bot row */}
      <div
        className="seat-row absolute w-full flex flex-col items-center z-10"
        style={{ top: 'clamp(52px, 13vh, 108px)', gap: 'var(--gap-xs)' }}
      >
        <div
          className={`seat-label flex items-center gap-1.5 sm:gap-2 text-white/80 text-xs sm:text-sm ${
            state.turn === 'bot' && !state.handOver ? 'turn-indicator' : ''
          }`}
        >
          <span className="font-semibold tracking-wide">DEALER BOT</span>
          <span className="text-amber-200/70">{state.botChips.toLocaleString()} LKR</span>
        </div>
        {state.botHand.length > 0 && (
          <Hand cards={state.botHand} faceDown={botFaceDown} winningCards={winningCards} />
        )}
      </div>

      {/* Center: community cards + pot */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
        style={{ gap: 'clamp(10px, 2.4vh, 20px)' }}
      >
        {state.communityCards.length > 0 && (
          <CommunityCards cards={state.communityCards} winningCards={winningCards} />
        )}
        {state.pot > 0 && <PotDisplay pot={state.pot} />}

        {state.handOver && state.winReason && (
          <div className="winner-banner absolute top-[-40px] left-1/2 -translate-x-1/2 bg-black/70 border border-amber-400/40 text-amber-200 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold backdrop-blur-sm whitespace-nowrap max-w-[90vw] truncate">
            {state.winReason}
          </div>
        )}
      </div>

      {/* Player row */}
      <div
        className="seat-row absolute w-full flex flex-col items-center z-10"
        style={{ bottom: 'clamp(108px, 23vh, 176px)', gap: 'var(--gap-xs)' }}
      >
        {state.playerHand.length > 0 && (
          <Hand cards={state.playerHand} winningCards={winningCards} size="lg" />
        )}
        <div
          className={`seat-label flex items-center gap-1.5 sm:gap-2 text-white/80 text-xs sm:text-sm ${
            state.turn === 'player' && !state.handOver ? 'turn-indicator' : ''
          }`}
        >
          <span className="font-semibold tracking-wide">YOU</span>
          <span className="text-amber-200/70">Bet: {state.playerBet}</span>
        </div>
      </div>

      {/* Message log */}
      <div className="hidden sm:block absolute bottom-4 left-4 z-10 text-[11px] text-white/40 max-w-xs pointer-events-none leading-tight fade-in">
        {state.log.slice(0, 3).map((entry, i) => (
          <div key={i} className={i === 0 ? 'text-white/70' : ''}>{entry}</div>
        ))}
      </div>

      {/* Bottom controls */}
      <div className="safe-bottom absolute bottom-0 w-full flex flex-col items-center gap-2 sm:gap-4 z-10 px-3">
        {state.handOver ? (
          <button
            onClick={dealHand}
            disabled={state.playerChips <= 0 || state.botChips <= 0}
            className="pointer-events-auto action-btn bg-gradient-to-b from-emerald-400 to-emerald-700 disabled:opacity-40"
          >
            {state.phase === PHASES.IDLE ? 'DEAL' : 'DEAL NEXT HAND'}
          </button>
        ) : (
          <ActionBar
            key={`${state.phase}-${state.turn}-${state.streetActionCount}`}
            isPlayerTurn={canAct}
            toCall={toCall}
            minRaise={Math.max(100, toCall + 100)}
            maxRaise={state.playerChips}
            onFold={() => playerAction('fold')}
            onCheck={() => playerAction('check')}
            onCall={() => playerAction('call')}
            onRaise={(amt) => playerAction('raise', amt)}
          />
        )}
      </div>
    </main>
  );
}
