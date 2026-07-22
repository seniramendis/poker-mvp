'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import PokerTable from './PokerTable';
import Dealer from './Dealer';
import BetChip from './BetChip';
import Seat from './Seat';
import CommunityCards from './CommunityCards';
import ActionBar from './ActionBar';
import { PotDisplay, ChipStack } from './ChipStack';
import { usePokerGame } from '../lib/usePokerGame';
import { BOT_SEAT_CSS, HUMAN_SEAT_CSS } from '../lib/seatLayout';

export default function GameView() {
  const { state, dealHand, resetTable, playerAction, PHASES } = usePokerGame();

  const human = state.players.find((p) => p.id === 'human');
  const bots = state.players.filter((p) => p.id !== 'human');

  const isPlayerTurn = state.activeId === 'human' && !state.handOver;
  const toCall = human ? Math.max(0, state.currentBet - human.bet) : 0;
  const canAct = isPlayerTurn && human && human.chips > 0;

  const dealerButtonId = state.players[state.dealerIndex]?.id ?? null;

  // --- Dealer "actively dealing" pulse: true briefly whenever a new street
  // (or a fresh hand) starts handing out cards. ---
  const [isDealing, setIsDealing] = useState(false);
  const prevPhaseRef = useRef(state.phase);
  useEffect(() => {
    if (state.phase !== prevPhaseRef.current) {
      prevPhaseRef.current = state.phase;
      if (state.phase !== PHASES.SHOWDOWN && state.phase !== PHASES.IDLE) {
        const onTimer = setTimeout(() => setIsDealing(true), 0);
        const offTimer = setTimeout(() => setIsDealing(false), 900);
        return () => {
          clearTimeout(onTimer);
          clearTimeout(offTimer);
        };
      }
    }
  }, [state.phase, PHASES.SHOWDOWN, PHASES.IDLE]);

  // --- Riffle-shuffle: fires the moment a brand-new hand starts, right
  // before the dealer pitches out hole cards. ---
  const [isShuffling, setIsShuffling] = useState(false);
  const prevPhaseForShuffleRef = useRef(state.phase);
  useEffect(() => {
    const cameFrom = prevPhaseForShuffleRef.current;
    prevPhaseForShuffleRef.current = state.phase;
    if (
      state.phase === PHASES.PREFLOP &&
      (cameFrom === PHASES.IDLE || cameFrom === PHASES.SHOWDOWN)
    ) {
      const onTimer = setTimeout(() => setIsShuffling(true), 0);
      const offTimer = setTimeout(() => setIsShuffling(false), 550);
      return () => {
        clearTimeout(onTimer);
        clearTimeout(offTimer);
      };
    }
  }, [state.phase, PHASES.PREFLOP, PHASES.IDLE, PHASES.SHOWDOWN]);

  // --- Chips flying from a seat to the pot whenever that seat's bet grows ---
  const [flyingChips, setFlyingChips] = useState([]);
  const prevBetsRef = useRef({});
  useEffect(() => {
    const additions = [];
    for (const p of state.players) {
      const prev = prevBetsRef.current[p.id] ?? 0;
      if (p.bet > prev) {
        additions.push({ key: `${p.id}-${p.bet}-${Date.now()}`, fromId: p.id });
      }
      prevBetsRef.current[p.id] = p.bet;
    }
    if (additions.length) {
      const t = setTimeout(() => setFlyingChips((f) => [...f, ...additions]), 0);
      return () => clearTimeout(t);
    }
  }, [state.players]);

  const removeChip = (key) => setFlyingChips((f) => f.filter((c) => c.key !== key));

  // --- Winner celebration ---
  const prevHandOverRef = useRef(state.handOver);
  useEffect(() => {
    if (state.handOver && !prevHandOverRef.current) {
      if (state.winnerIds.includes('human')) {
        confetti({
          particleCount: 140,
          spread: 80,
          startVelocity: 45,
          origin: { x: 0.5, y: 0.72 },
          colors: ['#d4af37', '#f4d675', '#faf6ec', '#18b364'],
        });
      } else if (state.winnerIds.length > 0) {
        confetti({
          particleCount: 46,
          spread: 55,
          startVelocity: 28,
          origin: { x: 0.5, y: 0.5 },
          colors: ['#d4af37', '#f4d675'],
        });
      }
    }
    prevHandOverRef.current = state.handOver;
  }, [state.handOver, state.winnerIds]);

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
      {/* Table felt */}
      <PokerTable />

      {/* HUD */}
      <div className="safe-top safe-x absolute top-0 w-full flex justify-between items-start text-white z-30 pointer-events-none">
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

      {/* Permanent dealer, head of the table */}
      <Dealer isDealing={isDealing} isShuffling={isShuffling} cardsLeft={state.deck.length} />

      {/* Bot seats, fanned beneath the dealer */}
      {bots.map((bot, i) => {
        const sd = showdownById.get(bot.id);
        const revealed = state.handOver && !bot.folded && !bot.out;
        const pos = BOT_SEAT_CSS[i] ?? BOT_SEAT_CSS[BOT_SEAT_CSS.length - 1];
        return (
          <div
            key={bot.id}
            className="absolute z-10"
            style={{ ...pos, transform: 'translate(-50%, 0)' }}
          >
            <Seat
              player={bot}
              seatId={bot.id}
              isTurn={state.activeId === bot.id && !state.handOver}
              isDealerButton={dealerButtonId === bot.id}
              cardsFaceDown={!revealed}
              winningCards={winningCards}
              handName={revealed ? sd?.handName ?? null : null}
              isWinner={!!sd?.isWinner}
              size="sm"
            />
          </div>
        );
      })}

      {/* Center: community cards + pot + winner banner - pinned a fixed
          distance below the dealer/bot row (not centered against the full
          viewport), so it never drifts down into the human hand on short
          or wide viewports. */}
      <div
        className="absolute left-1/2 flex flex-col items-center z-10 pointer-events-none"
        style={{ top: 'clamp(92px, 27vh, 176px)', transform: 'translateX(-50%)', gap: 'clamp(8px, 2vh, 16px)' }}
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

      {/* Chips flying from seats to the pot */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {flyingChips.map((c) => (
          <BetChip key={c.key} fromId={c.fromId} onDone={() => removeChip(c.key)} />
        ))}
      </div>

      {/* Player seat */}
      <div className="absolute z-10" style={{ ...HUMAN_SEAT_CSS, transform: 'translate(-50%, 0)' }}>
        {human && (
          <Seat
            player={human}
            seatId="human"
            isHuman
            isTurn={isPlayerTurn}
            isDealerButton={dealerButtonId === 'human'}
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
      <div className="safe-bottom absolute bottom-0 w-full flex flex-col items-center gap-2 sm:gap-4 z-30 px-3">
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
