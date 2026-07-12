'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  createOmeeDeck,
  shuffle,
  SEAT_ORDER,
  TEAM_OF,
  nextSeat,
  seatsFrom,
  sortHand,
  legalPlays,
  trickWinnerSeat,
  botChooseTrump,
  botChooseCard,
  scoreHand,
} from './omee';

export const TARGET_TOKENS = 10;

const PHASES = {
  IDLE: 'idle',
  TRUMP_SELECT: 'trump-select',
  PLAYING: 'playing',
  TRICK_END: 'trick-end',
  HAND_END: 'hand-end',
  MATCH_END: 'match-end',
};

function makeInitialState() {
  return {
    phase: PHASES.IDLE,
    dealer: null,
    trumpChooser: null,
    trumpSuit: null,
    dealOrder: [],
    deck: [],
    hands: { south: [], west: [], north: [], east: [] },
    turn: null,
    leader: null,
    currentTrick: [],
    trickCount: 0,
    tricksWon: { us: 0, them: 0 },
    tokens: { us: 0, them: 0 },
    carryPending: false,
    lastHandResult: null,
    matchWinner: null,
    message: 'Press "Deal" to start a hand.',
    log: [],
  };
}

function log(state, entry) {
  return [entry, ...state.log].slice(0, 6);
}

function reducer(state, action) {
  switch (action.type) {
    case 'DEAL_HAND': {
      if (state.matchWinner) return state;
      const dealer = state.dealer ? nextSeat(state.dealer) : SEAT_ORDER[Math.floor(Math.random() * 4)];
      const trumpChooser = nextSeat(dealer);
      const dealOrder = seatsFrom(trumpChooser);
      const deck = shuffle(createOmeeDeck());

      const hands = { south: [], west: [], north: [], east: [] };
      for (const seat of dealOrder) {
        hands[seat] = deck.splice(0, 4);
      }

      return {
        ...state,
        phase: PHASES.TRUMP_SELECT,
        dealer,
        trumpChooser,
        trumpSuit: null,
        dealOrder,
        deck,
        hands,
        turn: trumpChooser,
        leader: null,
        currentTrick: [],
        trickCount: 0,
        tricksWon: { us: 0, them: 0 },
        lastHandResult: null,
        message:
          trumpChooser === 'south'
            ? 'Pick your trump suit from your first four cards.'
            : `${trumpChooser} is choosing trump...`,
        log: log(state, `New hand. Dealer: ${dealer}.`),
      };
    }

    case 'CHOOSE_TRUMP': {
      if (state.phase !== PHASES.TRUMP_SELECT || action.seat !== state.trumpChooser) return state;
      const deck = [...state.deck];
      const hands = { ...state.hands };
      for (const seat of state.dealOrder) {
        hands[seat] = [...hands[seat], ...deck.splice(0, 4)];
      }
      hands.south = sortHand(hands.south, action.suit);

      return {
        ...state,
        phase: PHASES.PLAYING,
        trumpSuit: action.suit,
        deck,
        hands,
        turn: state.trumpChooser,
        leader: state.trumpChooser,
        currentTrick: [],
        message:
          state.trumpChooser === 'south'
            ? 'Trump set. Lead any card.'
            : `${state.trumpChooser} chose trump. Waiting for their lead.`,
        log: log(state, `Trump is ${action.suit} (chosen by ${state.trumpChooser === 'south' ? 'you' : state.trumpChooser}).`),
      };
    }

    case 'PLAY_CARD': {
      if (state.phase !== PHASES.PLAYING || state.turn !== action.seat) return state;
      const ledSuit = state.currentTrick.length ? state.currentTrick[0].card.suit : null;
      const legal = legalPlays(state.hands[action.seat], ledSuit);
      if (!legal.some((c) => c.id === action.card.id)) return state;

      const hands = {
        ...state.hands,
        [action.seat]: state.hands[action.seat].filter((c) => c.id !== action.card.id),
      };
      const currentTrick = [...state.currentTrick, { seat: action.seat, card: action.card }];

      if (currentTrick.length < 4) {
        return {
          ...state,
          hands,
          currentTrick,
          turn: nextSeat(action.seat),
          message: `${action.seat === 'south' ? 'You' : action.seat} played ${action.card.rank}${action.card.suit}.`,
        };
      }

      // Trick complete — pause briefly before resolving (handled by CLEAR_TRICK).
      return {
        ...state,
        hands,
        currentTrick,
        phase: PHASES.TRICK_END,
        turn: null,
        message: 'Trick complete...',
      };
    }

    case 'CLEAR_TRICK': {
      if (state.phase !== PHASES.TRICK_END) return state;
      const winnerSeat = trickWinnerSeat(state.currentTrick, state.trumpSuit);
      const winnerTeam = TEAM_OF[winnerSeat];
      const tricksWon = { ...state.tricksWon, [winnerTeam]: state.tricksWon[winnerTeam] + 1 };
      const trickCount = state.trickCount + 1;

      const entry = `${winnerSeat === 'south' ? 'You' : winnerSeat} won the trick.`;

      if (trickCount >= 8) {
        const trumpTeam = TEAM_OF[state.trumpChooser];
        const result = scoreHand({ tricksWon, trumpTeam, carryPending: state.carryPending });
        const tokens = { ...state.tokens };
        if (result.team) tokens[result.team] += result.tokens;

        const matchWinner = tokens.us >= TARGET_TOKENS ? 'us' : tokens.them >= TARGET_TOKENS ? 'them' : null;

        return {
          ...state,
          phase: matchWinner ? PHASES.MATCH_END : PHASES.HAND_END,
          tricksWon,
          trickCount,
          tokens,
          carryPending: result.carryPending,
          lastHandResult: result,
          matchWinner,
          currentTrick: [],
          turn: null,
          leader: null,
          message: matchWinner
            ? `${matchWinner === 'us' ? 'You & Partner' : 'West & East'} win the match!`
            : 'Hand complete.',
          log: log(state, `${entry} Hand over: ${result.reason}`),
        };
      }

      return {
        ...state,
        phase: PHASES.PLAYING,
        tricksWon,
        trickCount,
        currentTrick: [],
        leader: winnerSeat,
        turn: winnerSeat,
        message: `${winnerSeat === 'south' ? 'You' : winnerSeat} lead${winnerSeat === 'south' ? '' : 's'} the next trick.`,
        log: log(state, entry),
      };
    }

    case 'BOT_CHOOSE_TRUMP': {
      if (state.phase !== PHASES.TRUMP_SELECT || state.turn !== action.seat || action.seat === 'south') return state;
      const suit = botChooseTrump(state.hands[action.seat]);
      return reducer(state, { type: 'CHOOSE_TRUMP', seat: action.seat, suit });
    }

    case 'BOT_PLAY': {
      if (state.phase !== PHASES.PLAYING || state.turn !== action.seat || action.seat === 'south') return state;
      const card = botChooseCard({
        hand: state.hands[action.seat],
        currentTrick: state.currentTrick,
        trumpSuit: state.trumpSuit,
        seat: action.seat,
      });
      return reducer(state, { type: 'PLAY_CARD', seat: action.seat, card });
    }

    case 'NEW_MATCH': {
      return { ...makeInitialState(), dealer: state.dealer };
    }

    default:
      return state;
  }
}

export function useOmeeGame() {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);
  const timer = useRef(null);

  const dealHand = useCallback(() => dispatch({ type: 'DEAL_HAND' }), []);
  const chooseTrump = useCallback((suit) => dispatch({ type: 'CHOOSE_TRUMP', seat: 'south', suit }), []);
  const playCard = useCallback((card) => dispatch({ type: 'PLAY_CARD', seat: 'south', card }), []);
  const newMatch = useCallback(() => dispatch({ type: 'NEW_MATCH' }), []);

  // Bot trump selection.
  useEffect(() => {
    if (state.phase === PHASES.TRUMP_SELECT && state.turn && state.turn !== 'south') {
      timer.current = setTimeout(() => {
        dispatch({ type: 'BOT_CHOOSE_TRUMP', seat: state.turn });
      }, 700);
      return () => clearTimeout(timer.current);
    }
  }, [state.phase, state.turn]);

  // Bot card plays.
  useEffect(() => {
    if (state.phase === PHASES.PLAYING && state.turn && state.turn !== 'south') {
      timer.current = setTimeout(() => {
        dispatch({ type: 'BOT_PLAY', seat: state.turn });
      }, 650);
      return () => clearTimeout(timer.current);
    }
  }, [state.phase, state.turn]);

  // Pause on a completed trick so players can see all four cards, then clear it.
  useEffect(() => {
    if (state.phase === PHASES.TRICK_END) {
      timer.current = setTimeout(() => {
        dispatch({ type: 'CLEAR_TRICK' });
      }, 1100);
      return () => clearTimeout(timer.current);
    }
  }, [state.phase]);

  return { state, dealHand, chooseTrump, playCard, newMatch, PHASES, TARGET_TOKENS };
}
