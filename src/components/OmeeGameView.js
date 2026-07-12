'use client';

import Link from 'next/link';
import PlayingCard from './PlayingCard';
import OmeeTable from './OmeeTable';
import { useOmeeGame, TARGET_TOKENS } from '../lib/useOmeeGame';
import { SUIT_SYMBOL, SUIT_NAME, SUITS, legalPlays } from '../lib/omee';

const SUITS_RED = new Set(['H', 'D']);

function BotFan({ count }) {
  return (
    <div className="flex -space-x-4 sm:-space-x-5">
      {Array.from({ length: count }).map((_, i) => (
        <PlayingCard key={i} card={null} faceDown size="sm" dealDelay={i * 60} />
      ))}
    </div>
  );
}

function SeatLabel({ name, active }) {
  return (
    <div className={`seat-label flex items-center gap-1.5 text-white/80 text-xs sm:text-sm ${active ? 'turn-indicator' : ''}`}>
      <span className="font-semibold tracking-wide">{name}</span>
    </div>
  );
}

function TrickCard({ play }) {
  if (!play) {
    return <div className="community-slot" style={{ width: 'var(--card-w-sm)', height: 'var(--card-h-sm)' }} />;
  }
  return <PlayingCard card={play.card} size="sm" dealDelay={0} />;
}

export default function OmeeGameView() {
  const { state, dealHand, chooseTrump, playCard, newMatch, PHASES } = useOmeeGame();

  const isIdle = state.phase === PHASES.IDLE;
  const isTrumpSelect = state.phase === PHASES.TRUMP_SELECT;
  const isPlaying = state.phase === PHASES.PLAYING;
  const isHandEnd = state.phase === PHASES.HAND_END;
  const isMatchEnd = state.phase === PHASES.MATCH_END;

  const southTurn = isPlaying && state.turn === 'south';
  const ledSuit = state.currentTrick.length ? state.currentTrick[0].card.suit : null;
  const legalCardIds = southTurn
    ? new Set(legalPlays(state.hands.south, ledSuit).map((c) => c.id))
    : new Set();

  const trickBySeat = Object.fromEntries(state.currentTrick.map((p) => [p.seat, p]));
  const southFirstFour = isTrumpSelect && state.trumpChooser === 'south' ? state.hands.south : null;

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden select-none">
      <OmeeTable />

      {/* HUD */}
      <div className="safe-top safe-x absolute top-0 w-full flex justify-between items-start text-white z-10 pointer-events-none">
        <div className="min-w-0 pointer-events-auto">
          <Link href="/" className="group inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity">
            <span className="text-amber-200/70 group-hover:-translate-x-0.5 transition-transform">&lsaquo;</span>
            <h1 className="hud-title text-lg sm:text-2xl font-bold tracking-widest drop-shadow-md truncate">OMEE</h1>
          </Link>
          <p className="hud-sub block text-[10px] sm:text-xs text-amber-200/70 tracking-wide mt-0.5 sm:mt-1 uppercase">
            You &amp; Partner vs West &amp; East
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 sm:gap-2 pointer-events-auto shrink-0">
          <div className="bg-black/50 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg backdrop-blur-sm flex items-center gap-2 sm:gap-3 text-xs sm:text-sm whitespace-nowrap">
            <span className="text-emerald-300 font-bold">US {state.tokens.us}</span>
            <span className="text-white/30">/</span>
            <span className="text-rose-300 font-bold">THEM {state.tokens.them}</span>
            <span className="hidden sm:inline text-white/40">&middot; first to {TARGET_TOKENS}</span>
          </div>
          {state.trumpSuit && (
            <div className="bg-black/50 px-2.5 sm:px-3 py-1 rounded-full backdrop-blur-sm text-xs sm:text-sm flex items-center gap-1.5">
              <span className="text-white/50">Trump</span>
              <span className={SUITS_RED.has(state.trumpSuit) ? 'text-red-400 font-bold' : 'text-white font-bold'}>
                {SUIT_SYMBOL[state.trumpSuit]}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* North (partner) */}
      <div className="absolute w-full flex flex-col items-center z-10" style={{ top: 'clamp(58px, 12vh, 100px)', gap: 'var(--gap-xs)' }}>
        <SeatLabel name="PARTNER" active={isPlaying && state.turn === 'north'} />
        <BotFan count={state.hands.north.length} />
      </div>

      {/* West */}
      <div
        className="absolute flex flex-col items-center z-10"
        style={{ left: 'clamp(8px, 4vw, 28px)', top: '50%', transform: 'translateY(-50%)', gap: 'var(--gap-xs)' }}
      >
        <SeatLabel name="WEST" active={isPlaying && state.turn === 'west'} />
        <BotFan count={state.hands.west.length} />
      </div>

      {/* East */}
      <div
        className="absolute flex flex-col items-center z-10"
        style={{ right: 'clamp(8px, 4vw, 28px)', top: '50%', transform: 'translateY(-50%)', gap: 'var(--gap-xs)' }}
      >
        <SeatLabel name="EAST" active={isPlaying && state.turn === 'east'} />
        <BotFan count={state.hands.east.length} />
      </div>

      {/* Center: current trick */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none" style={{ gap: 8 }}>
        <div className="grid grid-cols-3 grid-rows-3 gap-1 place-items-center" style={{ width: 140, height: 110 }}>
          <div />
          <div className="row-start-1 col-start-2">
            <TrickCard play={trickBySeat.north} />
          </div>
          <div />
          <div className="row-start-2 col-start-1">
            <TrickCard play={trickBySeat.west} />
          </div>
          <div className="row-start-2 col-start-2" />
          <div className="row-start-2 col-start-3">
            <TrickCard play={trickBySeat.east} />
          </div>
          <div />
          <div className="row-start-3 col-start-2">
            <TrickCard play={trickBySeat.south} />
          </div>
          <div />
        </div>

        {!isIdle && (
          <div className="text-white/50 text-[11px] sm:text-xs bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
            Trick {Math.min(state.trickCount + 1, 8)} of 8 &middot; Won: {state.tricksWon.us}&ndash;{state.tricksWon.them}
          </div>
        )}

        {(isHandEnd || isMatchEnd) && state.lastHandResult && (
          <div className="winner-banner pointer-events-auto absolute top-[-56px] left-1/2 -translate-x-1/2 bg-black/70 border border-amber-400/40 text-amber-200 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold backdrop-blur-sm whitespace-nowrap max-w-[90vw] truncate">
            {isMatchEnd
              ? `${state.matchWinner === 'us' ? 'You & Partner' : 'West & East'} win the match! (${state.lastHandResult.reason})`
              : `${state.lastHandResult.team === 'us' ? 'You & Partner' : state.lastHandResult.team === 'them' ? 'West & East' : 'Push'}${state.lastHandResult.tokens ? ` +${state.lastHandResult.tokens} token${state.lastHandResult.tokens === 1 ? '' : 's'}` : ''} &mdash; ${state.lastHandResult.reason}`}
          </div>
        )}
      </div>

      {/* South (you) */}
      <div className="seat-row absolute w-full flex flex-col items-center z-10" style={{ bottom: 'clamp(96px, 20vh, 150px)', gap: 'var(--gap-xs)' }}>
        <div className="flex" style={{ gap: 'var(--gap-xs)' }}>
          {state.hands.south.map((card, i) => {
            const isLegal = legalCardIds.has(card.id);
            return (
              <button
                key={card.id}
                onClick={() => southTurn && isLegal && playCard(card)}
                disabled={!southTurn || !isLegal}
                className={`transition-transform ${southTurn && isLegal ? 'hover:-translate-y-2 cursor-pointer' : 'opacity-60 cursor-default'}`}
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <PlayingCard card={card} size="lg" dealDelay={i * 90} />
              </button>
            );
          })}
        </div>
        <SeatLabel name="YOU" active={southTurn} />
      </div>

      {/* Message log */}
      <div className="hidden sm:block absolute bottom-4 left-4 z-10 text-[11px] text-white/40 max-w-xs pointer-events-none leading-tight fade-in">
        {state.log.slice(0, 3).map((entry, i) => (
          <div key={i} className={i === 0 ? 'text-white/70' : ''}>{entry}</div>
        ))}
      </div>

      {/* Bottom controls */}
      <div className="safe-bottom absolute bottom-0 w-full flex flex-col items-center gap-2 sm:gap-4 z-10 px-3">
        {isIdle && (
          <button onClick={dealHand} className="pointer-events-auto action-btn bg-gradient-to-b from-emerald-400 to-emerald-700">
            DEAL
          </button>
        )}

        {isTrumpSelect && southFirstFour && (
          <div className="pointer-events-auto flex flex-col items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
            <span className="text-white/70 text-xs sm:text-sm">Choose trump suit</span>
            <div className="flex gap-2">
              {SUITS.map((s) => {
                const count = southFirstFour.filter((c) => c.suit === s).length;
                const red = SUITS_RED.has(s);
                return (
                  <button key={s} onClick={() => chooseTrump(s)} className={`suit-btn ${red ? 'suit-btn-red' : 'suit-btn-black'}`} title={SUIT_NAME[s]}>
                    <span className="suit-btn-symbol">{SUIT_SYMBOL[s]}</span>
                    <span className="suit-btn-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isHandEnd && (
          <button onClick={dealHand} className="pointer-events-auto action-btn bg-gradient-to-b from-emerald-400 to-emerald-700">
            DEAL NEXT HAND
          </button>
        )}

        {isMatchEnd && (
          <button onClick={newMatch} className="pointer-events-auto action-btn bg-gradient-to-b from-amber-300 to-amber-600">
            NEW MATCH
          </button>
        )}

        {!isIdle && (
          <Link href="/" className="pointer-events-auto text-white/50 hover:text-white/90 transition-colors underline underline-offset-2 text-[11px] sm:text-xs mb-1">
            Home
          </Link>
        )}
      </div>
    </main>
  );
}
