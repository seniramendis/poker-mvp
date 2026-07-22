'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import PokerTable from './PokerTable';
import Seat from './Seat';
import CommunityCards from './CommunityCards';
import ActionBar from './ActionBar';
import { PotDisplay, ChipStack } from './ChipStack';
import { usePokerGame } from '../lib/usePokerGame';

export default function GameView() {
  const { state, dealHand, resetTable, playerAction, PHASES } = usePokerGame();

  const human = state.players.find((p) => p.id === 'human');
  const bots = state.players.filter((p) => p.id !== 'human');

  const isPlayerTurn = state.activeId === 'human' && !state.handOver;
  const toCall = human ? Math.max(0, state.currentBet - human.bet) : 0;
  const canAct = isPlayerTurn && human && human.chips > 0;

  const showdownById = useMemo(() => {
    const map = new Map();
    for (const s of state.showdown) map.set(s.id, s);
    return map;
  }, [state.showdown]);

  const winningCards = useMemo(() => {
    if (state.phase !== PHASES.SHOWDOWN) return [];
    const winners = state.showdown.filter((s) => s.isWinner);
    return winners.flatMap((w) => w.cards || []);
  }, [state.phase, state.showdown, PHASES.SHOWDOWN]);

  const gameOver = human && human.out;

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
            {bots.length + 1}-Max Texas Hold&apos;em
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 sm:gap-2 pointer-events-auto shrink-0">
          <div className="bg-black/50 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg backdrop-blur-sm flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base whitespace-nowrap">
            <ChipStack amount={human?.chips ?? 0} small />
            <span className="hidden sm:inline">Balance: {(human?.chips ?? 0).toLocaleString()} LKR</span>
            <span className="sm:hidden">{(human?.chips ?? 0).toLocaleString()}</span>
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

      {/* Bot seats */}
      <div
        className="seat-row absolute w-full flex flex-wrap justify-center items-start z-10 px-2"
        style={{ top: 'clamp(50px, 12vh, 100px)', gap: 'clamp(8px, 3vw, 28px)' }}
      >
        {bots.map((bot) => {
          const sd = showdownById.get(bot.id);
          const revealed = state.handOver && !bot.folded && !bot.out;
          return (
            <Seat
              key={bot.id}
              player={bot}
              isTurn={state.activeId === bot.id && !state.handOver}
              cardsFaceDown={!revealed}
              winningCards={winningCards}
              handName={revealed ? sd?.handName ?? null : null}
              isWinner={!!sd?.isWinner}
              size="sm"
            />
          );
        })}
      </div>

      {/* Center: community cards + pot + winner banner */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
        style={{ gap: 'clamp(8px, 2vh, 16px)' }}
      >
        {state.handOver && state.winReason && (
          <div className="winner-banner bg-black/75 border border-amber-400/50 text-amber-200 px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-lg font-bold backdrop-blur-sm whitespace-nowrap max-w-[92vw] truncate shadow-lg">
            {state.winReason}
          </div>
        )}

        {state.communityCards.length > 0 && (
          <CommunityCards cards={state.communityCards} winningCards={winningCards} />
        )}
        {state.pot > 0 && <PotDisplay pot={state.pot} />}
      </div>

      {/* Player seat */}
      <div
        className="seat-row absolute w-full flex flex-col items-center z-10"
        style={{ bottom: 'clamp(108px, 23vh, 176px)', gap: 'var(--gap-xs)' }}
      >
        {human && (
          <Seat
            player={human}
            isHuman
            isTurn={isPlayerTurn}
            cardsFaceDown={false}
            winningCards={winningCards}
            handName={state.handOver && !human.folded ? showdownById.get('human')?.handName ?? null : null}
            isWinner={!!showdownById.get('human')?.isWinner}
            size="lg"
          />
        )}
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
            disabled={gameOver}
            className="pointer-events-auto action-btn bg-gradient-to-b from-emerald-400 to-emerald-700 disabled:opacity-40"
          >
            {gameOver ? 'YOU BUSTED' : state.phase === PHASES.IDLE ? 'DEAL' : 'DEAL NEXT HAND'}
          </button>
        ) : (
          <ActionBar
            key={`${state.phase}-${state.activeId}-${state.currentBet}`}
            isPlayerTurn={canAct}
            toCall={toCall}
            minRaise={state.currentBet + state.minRaiseSize}
            maxRaise={human ? human.bet + human.chips : 0}
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
