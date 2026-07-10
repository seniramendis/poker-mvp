'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createDeck, shuffle, evaluateHand, compareEval, handName } from './engine';

const STARTING_CHIPS = 5000;
const SMALL_BLIND = 50;
const BIG_BLIND = 100;

const PHASES = {
  IDLE: 'idle',
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown',
};

function makeInitialState() {
  return {
    phase: PHASES.IDLE,
    deck: [],
    communityCards: [],
    playerHand: [],
    botHand: [],
    playerChips: STARTING_CHIPS,
    botChips: STARTING_CHIPS,
    pot: 0,
    playerBet: 0,
    botBet: 0,
    currentBet: 0,
    dealerIsPlayer: true,
    turn: null, // 'player' | 'bot'
    message: 'Press "Deal" to start a hand.',
    log: [],
    winner: null, // 'player' | 'bot' | 'split'
    winReason: '',
    handOver: true,
    revealBot: false,
    lastAction: null,
    streetActionCount: 0,
  };
}

function log(state, entry) {
  return [entry, ...state.log].slice(0, 6);
}

function botDecision(state) {
  // Very small heuristic bot: estimate hand strength from what's visible,
  // then pick fold / call / raise with some randomness so it's not fully predictable.
  const visibleCards = [...state.botHand, ...state.communityCards];
  let strength = 0.3;
  if (visibleCards.length >= 5) {
    const evalResult = evaluateHand(visibleCards);
    strength = Math.min(1, evalResult.score / 8 + 0.15);
  } else {
    // Preflop heuristic: pair or high cards are stronger
    const [a, b] = state.botHand;
    if (a && b) {
      if (a.value === b.value) strength = 0.55 + a.value / 40;
      else strength = (a.value + b.value) / 34 + (a.suit === b.suit ? 0.05 : 0);
    }
  }

  const toCall = state.currentBet - state.botBet;
  const rand = Math.random();

  if (toCall === 0) {
    if (strength > 0.65 && rand > 0.4) return { action: 'raise', amount: Math.round(BIG_BLIND * (1 + strength * 2)) };
    return { action: 'check' };
  }

  if (strength < 0.28 && toCall > BIG_BLIND && rand > 0.25) {
    return { action: 'fold' };
  }
  if (strength > 0.7 && rand > 0.35) {
    return { action: 'raise', amount: Math.round(toCall + BIG_BLIND * (1 + strength * 2)) };
  }
  return { action: 'call' };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'DEAL_HAND': {
      if (state.playerChips <= 0 || state.botChips <= 0) {
        return {
          ...state,
          message: 'Not enough chips to start a new hand. Reset the table.',
        };
      }
      const deck = shuffle(createDeck());
      const playerHand = [deck.pop(), deck.pop()];
      const botHand = [deck.pop(), deck.pop()];

      const dealerIsPlayer = !state.handOver ? state.dealerIsPlayer : !state.dealerIsPlayer;
      const sbIsPlayer = dealerIsPlayer;

      const sbAmount = Math.min(SMALL_BLIND, sbIsPlayer ? state.playerChips : state.botChips);
      const bbAmount = Math.min(BIG_BLIND, sbIsPlayer ? state.botChips : state.playerChips);

      let playerChips = state.playerChips;
      let botChips = state.botChips;
      let playerBet = 0;
      let botBet = 0;

      if (sbIsPlayer) {
        playerChips -= sbAmount;
        playerBet = sbAmount;
        botChips -= bbAmount;
        botBet = bbAmount;
      } else {
        botChips -= sbAmount;
        botBet = sbAmount;
        playerChips -= bbAmount;
        playerBet = bbAmount;
      }

      return {
        ...makeInitialState(),
        deck,
        playerHand,
        botHand,
        playerChips,
        botChips,
        playerBet,
        botBet,
        pot: playerBet + botBet,
        currentBet: Math.max(playerBet, botBet),
        dealerIsPlayer,
        phase: PHASES.PREFLOP,
        handOver: false,
        turn: sbIsPlayer ? 'player' : 'bot',
        message: sbIsPlayer ? 'Your move.' : "Bot's move.",
        log: log(state, `New hand dealt. Blinds posted (${SMALL_BLIND}/${BIG_BLIND}).`),
      };
    }

    case 'PLAYER_ACTION': {
      if (state.turn !== 'player' || state.handOver) return state;
      return applyAction(state, 'player', action.action, action.amount);
    }

    case 'BOT_ACTION': {
      if (state.turn !== 'bot' || state.handOver) return state;
      const decision = botDecision(state);
      return applyAction(state, 'bot', decision.action, decision.amount);
    }

    case 'RESET_TABLE': {
      return makeInitialState();
    }

    default:
      return state;
  }
}

function advancePhase(state) {
  const nextDeck = [...state.deck];
  let communityCards = state.communityCards;
  let phase = state.phase;

  if (state.phase === PHASES.PREFLOP) {
    nextDeck.pop(); // burn
    communityCards = [nextDeck.pop(), nextDeck.pop(), nextDeck.pop()];
    phase = PHASES.FLOP;
  } else if (state.phase === PHASES.FLOP) {
    nextDeck.pop();
    communityCards = [...communityCards, nextDeck.pop()];
    phase = PHASES.TURN;
  } else if (state.phase === PHASES.TURN) {
    nextDeck.pop();
    communityCards = [...communityCards, nextDeck.pop()];
    phase = PHASES.RIVER;
  } else if (state.phase === PHASES.RIVER) {
    phase = PHASES.SHOWDOWN;
  }

  return { ...state, deck: nextDeck, communityCards, phase };
}

function resolveShowdown(state) {
  const playerEval = evaluateHand([...state.playerHand, ...state.communityCards]);
  const botEval = evaluateHand([...state.botHand, ...state.communityCards]);
  const cmp = compareEval(playerEval, botEval);

  let winner, winReason;
  let playerChips = state.playerChips;
  let botChips = state.botChips;

  if (cmp > 0) {
    winner = 'player';
    winReason = `You win with ${handName(playerEval.score)}!`;
    playerChips += state.pot;
  } else if (cmp < 0) {
    winner = 'bot';
    winReason = `Bot wins with ${handName(botEval.score)}.`;
    botChips += state.pot;
  } else {
    winner = 'split';
    winReason = `Split pot — both have ${handName(playerEval.score)}.`;
    playerChips += Math.floor(state.pot / 2);
    botChips += Math.ceil(state.pot / 2);
  }

  return {
    ...state,
    phase: PHASES.SHOWDOWN,
    playerChips,
    botChips,
    winner,
    winReason,
    handOver: true,
    revealBot: true,
    turn: null,
    message: winReason,
    log: log(state, winReason),
  };
}

function endByFold(state, folder) {
  const winner = folder === 'player' ? 'bot' : 'player';
  let playerChips = state.playerChips;
  let botChips = state.botChips;
  if (winner === 'player') playerChips += state.pot;
  else botChips += state.pot;

  const winReason = `${folder === 'player' ? 'You' : 'Bot'} folded. ${
    winner === 'player' ? 'You win' : 'Bot wins'
  } the pot.`;

  return {
    ...state,
    playerChips,
    botChips,
    winner,
    winReason,
    handOver: true,
    revealBot: false,
    turn: null,
    message: winReason,
    log: log(state, winReason),
  };
}

function applyAction(state, who, actionName, amount) {
  const opponent = who === 'player' ? 'bot' : 'player';
  let playerChips = state.playerChips;
  let botChips = state.botChips;
  let playerBet = state.playerBet;
  let botBet = state.botBet;
  let pot = state.pot;

  const myChips = who === 'player' ? playerChips : botChips;
  const myBet = who === 'player' ? playerBet : botBet;
  const toCall = state.currentBet - myBet;

  let actionLabel = '';
  let newCurrentBet = state.currentBet;

  if (actionName === 'fold') {
    return endByFold(state, who);
  }

  if (actionName === 'check') {
    actionLabel = `${who === 'player' ? 'You' : 'Bot'} checked.`;
  }

  if (actionName === 'call') {
    const callAmount = Math.min(toCall, myChips);
    if (who === 'player') {
      playerChips -= callAmount;
      playerBet += callAmount;
    } else {
      botChips -= callAmount;
      botBet += callAmount;
    }
    pot += callAmount;
    actionLabel = `${who === 'player' ? 'You' : 'Bot'} called ${callAmount}.`;
  }

  if (actionName === 'raise') {
    const raiseTo = Math.max(state.currentBet + BIG_BLIND, myBet + (amount || BIG_BLIND * 2));
    const totalPut = Math.min(myChips, raiseTo - myBet);
    if (who === 'player') {
      playerChips -= totalPut;
      playerBet += totalPut;
    } else {
      botChips -= totalPut;
      botBet += totalPut;
    }
    pot += totalPut;
    newCurrentBet = Math.max(playerBet, botBet);
    actionLabel = `${who === 'player' ? 'You' : 'Bot'} raised to ${newCurrentBet}.`;
  }

  const streetActionCount = (state.streetActionCount || 0) + 1;

  let next = {
    ...state,
    playerChips,
    botChips,
    playerBet,
    botBet,
    pot,
    currentBet: newCurrentBet,
    lastAction: actionName,
    streetActionCount,
    message: actionLabel,
    log: log(state, actionLabel),
  };

  // A raise always keeps action open — opponent must respond.
  if (actionName === 'raise') {
    next.turn = opponent;
    return next;
  }

  const isFirstActionOfStreet = (state.streetActionCount || 0) === 0;
  const betsEqual = playerBet === botBet;
  const isAllIn = playerChips === 0 || botChips === 0;

  let streetClosed;
  if (actionName === 'check') {
    // Checks close the street once both players have acted (i.e. this isn't
    // the opening check of the street).
    streetClosed = !isFirstActionOfStreet;
  } else {
    // A call closes the street, except the one heads-up special case: the
    // small blind limping in preflop must not skip the big blind's option.
    const isSbPreflopLimp = state.phase === PHASES.PREFLOP && isFirstActionOfStreet;
    streetClosed = betsEqual && !isSbPreflopLimp;
  }

  if (streetClosed || isAllIn) {
    if (isAllIn) {
      let progressed = next;
      while (progressed.phase !== PHASES.SHOWDOWN) {
        progressed = advancePhase(progressed);
      }
      return resolveShowdown(progressed);
    }

    if (state.phase === PHASES.RIVER) {
      const advanced = advancePhase({ ...next, lastAction: null, streetActionCount: 0 });
      return resolveShowdown(advanced);
    }

    const advanced = advancePhase({
      ...next,
      playerBet: 0,
      botBet: 0,
      currentBet: 0,
      lastAction: null,
      streetActionCount: 0,
    });
    // Post-flop, the non-dealer (big blind) acts first.
    advanced.turn = advanced.dealerIsPlayer ? 'bot' : 'player';
    advanced.message = advanced.turn === 'player' ? 'Your move.' : "Bot's move.";
    return advanced;
  }

  next.turn = opponent;
  return next;
}

export function usePokerGame() {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);
  const botTimer = useRef(null);

  const dealHand = useCallback(() => dispatch({ type: 'DEAL_HAND' }), []);
  const resetTable = useCallback(() => dispatch({ type: 'RESET_TABLE' }), []);

  const playerAction = useCallback((actionName, amount) => {
    dispatch({ type: 'PLAYER_ACTION', action: actionName, amount });
  }, []);

  // Trigger bot moves automatically after a short "thinking" delay.
  useEffect(() => {
    if (state.turn === 'bot' && !state.handOver) {
      botTimer.current = setTimeout(() => {
        botTimer.current = null;
        dispatch({ type: 'BOT_ACTION' });
      }, 900);
      return () => {
        clearTimeout(botTimer.current);
        botTimer.current = null;
      };
    }
  }, [state.turn, state.handOver, state.streetActionCount, state.phase]);

  return { state, dealHand, resetTable, playerAction, PHASES };
}
