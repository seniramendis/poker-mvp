'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createDeck, shuffle, evaluateHand, compareEval } from './engine';

const STARTING_CHIPS = 5000;
const SMALL_BLIND = 50;
const BIG_BLIND = 100;

// Table size: you + this many bots, seated alongside a permanent dealer.
// The seat layout (src/lib/seatLayout.js) is tuned for a 4-player table
// (you + 3 bots) fanned out beneath the dealer, so change both together.
const NUM_BOTS = 3;

const BOT_NAMES = ['Jax', 'Mira', 'Leo', 'Nova', 'Remy', 'Skye', 'Theo', 'Vale'];
// Mix of difficulties so the table isn't uniformly easy or brutal.
const BOT_DIFFICULTIES = ['medium', 'hard', 'medium', 'hard', 'medium', 'hard'];

const PHASES = {
  IDLE: 'idle',
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown',
};

function makePlayers() {
  const players = [
    {
      id: 'human',
      name: 'You',
      isBot: false,
      chips: STARTING_CHIPS,
      hand: [],
      bet: 0,
      committed: 0,
      folded: false,
      allIn: false,
      out: false,
      difficulty: null,
    },
  ];
  for (let i = 0; i < NUM_BOTS; i++) {
    players.push({
      id: `bot-${i}`,
      name: BOT_NAMES[i % BOT_NAMES.length],
      isBot: true,
      chips: STARTING_CHIPS,
      hand: [],
      bet: 0,
      committed: 0,
      folded: false,
      allIn: false,
      out: false,
      difficulty: BOT_DIFFICULTIES[i % BOT_DIFFICULTIES.length],
    });
  }
  return players;
}

function makeInitialState() {
  return {
    phase: PHASES.IDLE,
    deck: [],
    communityCards: [],
    players: makePlayers(),
    pot: 0,
    currentBet: 0,
    minRaiseSize: BIG_BLIND,
    dealerIndex: -1,
    activeId: null,
    needsToAct: [],
    message: 'Press "Deal" to start a hand.',
    log: [],
    handOver: true,
    winnerIds: [],
    winReason: '',
    showdown: [], // [{ id, name, handName, isWinner, cards }]
    lastAction: null,
  };
}

function log(state, entry) {
  return [entry, ...state.log].slice(0, 6);
}

// --- Seating helpers -------------------------------------------------

function seatedIndices(players) {
  const idx = [];
  players.forEach((p, i) => {
    if (!p.out) idx.push(i);
  });
  return idx;
}

function nextSeatedIndex(players, fromIndex) {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const candidate = (fromIndex + step) % n;
    if (!players[candidate].out) return candidate;
  }
  return fromIndex;
}

function activePlayers(players) {
  // Non-folded, still in the hand (includes all-in players, who are dead-weight
  // in the betting but still contest the showdown).
  return players.filter((p) => !p.out && !p.folded);
}

function canActPlayers(players) {
  return players.filter((p) => !p.out && !p.folded && !p.allIn && p.chips > 0);
}

// --- Preflop hand-strength heuristic (no 5-card evaluator possible yet) --

function preflopStrength(hand) {
  if (!hand || hand.length < 2) return 0.3;
  const [a, b] = [...hand].sort((x, y) => y.value - x.value);
  let s;
  if (a.value === b.value) {
    s = 0.5 + a.value / 28; // pocket pairs: 22 ~0.57, AA ~1.0
  } else {
    s = (a.value + b.value) / 34;
    if (a.suit === b.suit) s += 0.06;
    const gap = a.value - b.value;
    if (gap <= 4) s += (0.04 * (5 - gap)) / 4;
  }
  return Math.min(1, s);
}

// --- Bot decision-making ---------------------------------------------
// Weighs made-hand strength (post-flop, via the real evaluator) or a preflop
// heuristic against pot odds, opponent count, and a per-bot difficulty
// profile so bots fold bad hands, size value bets sensibly, and
// occasionally bluff instead of just calling everything down.

function botDecision(state, player) {
  const visible = [...player.hand, ...state.communityCards];
  let strength;
  if (visible.length >= 5) {
    const evalResult = evaluateHand(visible);
    strength = evalResult.score / 8 + Math.min(0.12, (evalResult.tiebreak[0] || 0) / 14 / 8);
  } else {
    strength = preflopStrength(player.hand);
  }

  const opponents = activePlayers(state.players).filter((p) => p.id !== player.id);
  strength -= 0.025 * Math.max(0, opponents.length - 1); // multiway hands need to be stronger

  const noise = { easy: 0.18, medium: 0.09, hard: 0.04 }[player.difficulty] ?? 0.09;
  strength += (Math.random() - 0.5) * 2 * noise;
  strength = Math.max(0, Math.min(1, strength));

  const toCall = state.currentBet - player.bet;
  const potOdds = toCall > 0 ? toCall / (state.pot + toCall) : 0;
  const aggression = { easy: 0.45, medium: 0.68, hard: 0.85 }[player.difficulty] ?? 0.65;
  const bluffChance = { easy: 0.04, medium: 0.09, hard: 0.15 }[player.difficulty] ?? 0.08;

  const minRaiseTotal = state.currentBet + state.minRaiseSize;
  const maxRaiseTotal = player.bet + player.chips;

  const proposeRaise = (sizeFactor) => {
    const target = Math.round(minRaiseTotal + state.pot * sizeFactor);
    return Math.max(minRaiseTotal, Math.min(maxRaiseTotal, target));
  };

  if (toCall === 0) {
    const wantsBluff = strength < 0.32 && opponents.length <= 2 && Math.random() < bluffChance;
    if (strength > 0.6 || wantsBluff) {
      const betTo = proposeRaise(wantsBluff ? 0.4 + Math.random() * 0.3 : 0.35 + strength * 0.85);
      if (betTo > state.currentBet && Math.random() < aggression + (wantsBluff ? 0.3 : 0)) {
        return { action: 'raise', amount: betTo };
      }
    }
    return { action: 'check' };
  }

  // Facing a bet: compare realistic equity against pot odds.
  const requiredEquity = potOdds;
  if (strength + 0.06 < requiredEquity) {
    const cheapCuriosity = toCall <= Math.max(BIG_BLIND, player.chips * 0.03) && strength > 0.18;
    if (cheapCuriosity) return { action: 'call' };
    return { action: 'fold' };
  }

  const raiseThreshold = { easy: 0.8, medium: 0.72, hard: 0.64 }[player.difficulty] ?? 0.72;
  if (strength > raiseThreshold && Math.random() < aggression) {
    const betTo = proposeRaise(0.45 + strength * 0.65);
    if (betTo > state.currentBet) return { action: 'raise', amount: betTo };
  }

  // Occasional, credibly-sized bluff-raise even while weak (hard bots only).
  if (strength < 0.28 && opponents.length <= 2 && Math.random() < bluffChance * 0.5) {
    const betTo = proposeRaise(0.55);
    if (betTo > state.currentBet) return { action: 'raise', amount: betTo };
  }

  return { action: 'call' };
}

// --- Side-pot construction --------------------------------------------
// Splits the total money committed this hand into a main pot plus any side
// pots created by short all-ins, with correct eligibility per pot.

function buildPots(players) {
  const levels = players
    .filter((p) => p.committed > 0)
    .map((p) => ({ id: p.id, folded: p.folded, remaining: p.committed }));

  const pots = [];
  while (levels.some((l) => l.remaining > 0)) {
    const min = Math.min(...levels.filter((l) => l.remaining > 0).map((l) => l.remaining));
    const involved = levels.filter((l) => l.remaining > 0);
    const amount = min * involved.length;
    const eligible = involved.filter((l) => !l.folded).map((l) => l.id);
    if (eligible.length > 0) pots.push({ amount, eligible });
    else if (pots.length > 0) pots[pots.length - 1].amount += amount; // dead money, no eligible players
    for (const l of involved) l.remaining -= min;
  }
  return pots;
}

// --- Turn helpers -------------------------------------------------------

function computeNeedsToAct(players, excludeId) {
  return canActPlayers(players)
    .filter((p) => p.id !== excludeId)
    .map((p) => p.id);
}

function findNextActive(players, fromIndex, needsToAct) {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const candidate = (fromIndex + step) % n;
    const p = players[candidate];
    if (needsToAct.includes(p.id)) return candidate;
  }
  return -1;
}

export function reducer(state, action) {
  switch (action.type) {
    case 'DEAL_HAND':
      return startHand(state);
    case 'PLAYER_ACTION': {
      const active = state.players.find((p) => p.id === state.activeId);
      if (!active || active.isBot || state.handOver) return state;
      return applyAction(state, state.activeId, action.action, action.amount);
    }
    case 'BOT_ACTION': {
      const active = state.players.find((p) => p.id === state.activeId);
      if (!active || !active.isBot || state.handOver) return state;
      const decision = botDecision(state, active);
      return applyAction(state, state.activeId, decision.action, decision.amount);
    }
    case 'RESET_TABLE':
      return makeInitialState();
    default:
      return state;
  }
}

function startHand(state) {
  const seatedForNewHand = state.players.map((p) => ({ ...p, out: p.out || p.chips <= 0 }));
  const seated = seatedForNewHand.filter((p) => !p.out);
  if (seated.length < 2) {
    return {
      ...state,
      players: seatedForNewHand,
      message:
        seated.length === 1 && seated[0].id === 'human'
          ? 'You cleared the table! Reset to play again.'
          : 'Not enough players with chips left. Reset the table.',
    };
  }

  const deck = shuffle(createDeck());
  const players = seatedForNewHand.map((p) => ({
    ...p,
    hand: [],
    bet: 0,
    committed: 0,
    folded: p.out,
    allIn: false,
  }));

  const dealerIndex =
    state.dealerIndex === -1 ? players.findIndex((p) => !p.out) : nextSeatedIndex(players, state.dealerIndex);

  const seatedIdx = seatedIndices(players);
  const headsUp = seatedIdx.length === 2;

  const sbIndex = headsUp ? dealerIndex : nextSeatedIndex(players, dealerIndex);
  const bbIndex = nextSeatedIndex(players, sbIndex);

  // Deal 2 hole cards, one at a time, starting left of the dealer.
  const dealOrder = [];
  let seat = nextSeatedIndex(players, dealerIndex);
  for (let i = 0; i < seatedIdx.length; i++) {
    dealOrder.push(seat);
    seat = nextSeatedIndex(players, seat);
  }
  for (let round = 0; round < 2; round++) {
    for (const idx of dealOrder) {
      players[idx].hand.push(deck.pop());
    }
  }

  const postBlind = (idx, amount) => {
    const p = players[idx];
    const bet = Math.min(amount, p.chips);
    p.chips -= bet;
    p.bet += bet;
    p.committed += bet;
    if (p.chips === 0) p.allIn = true;
    return bet;
  };

  const sbAmount = postBlind(sbIndex, SMALL_BLIND);
  const bbAmount = postBlind(bbIndex, BIG_BLIND);
  const pot = sbAmount + bbAmount;
  const currentBet = Math.max(players[sbIndex].bet, players[bbIndex].bet);

  // Heads-up: dealer/SB acts first preflop. 3+: first active seat after BB (UTG).
  const firstToActIndex = headsUp ? sbIndex : nextSeatedIndex(players, bbIndex);
  const order = canActPlayers(players).map((p) => p.id);
  const needsToAct = rotateToStartFromSeat(players, order, firstToActIndex);

  const activeIndex = needsToAct.length > 0 ? players.findIndex((p) => p.id === needsToAct[0]) : -1;

  return {
    ...makeInitialState(),
    players,
    deck,
    pot,
    currentBet,
    minRaiseSize: BIG_BLIND,
    dealerIndex,
    phase: PHASES.PREFLOP,
    handOver: false,
    activeId: activeIndex >= 0 ? players[activeIndex].id : null,
    needsToAct,
    message: `New hand. Blinds ${SMALL_BLIND}/${BIG_BLIND} posted.`,
    log: log(state, `New hand dealt. Blinds posted (${SMALL_BLIND}/${BIG_BLIND}).`),
  };
}

function rotateToStart(ids, startId) {
  const i = ids.indexOf(startId);
  if (i === -1) return ids;
  return [...ids.slice(i), ...ids.slice(0, i)];
}

// Orders `order` (ids that can act) starting from whichever of them sits
// first at/after `fromSeatIndex`.
function rotateToStartFromSeat(players, order, fromSeatIndex) {
  const n = players.length;
  for (let step = 0; step < n; step++) {
    const candidate = (fromSeatIndex + step) % n;
    const id = players[candidate].id;
    if (order.includes(id)) {
      return rotateToStart(order, id);
    }
  }
  return order;
}

function dealCommunity(state) {
  const deck = [...state.deck];
  let communityCards = state.communityCards;
  let phase = state.phase;

  if (state.phase === PHASES.PREFLOP) {
    deck.pop();
    communityCards = [deck.pop(), deck.pop(), deck.pop()];
    phase = PHASES.FLOP;
  } else if (state.phase === PHASES.FLOP) {
    deck.pop();
    communityCards = [...communityCards, deck.pop()];
    phase = PHASES.TURN;
  } else if (state.phase === PHASES.TURN) {
    deck.pop();
    communityCards = [...communityCards, deck.pop()];
    phase = PHASES.RIVER;
  } else if (state.phase === PHASES.RIVER) {
    phase = PHASES.SHOWDOWN;
  }

  return { ...state, deck, communityCards, phase };
}

function resolveShowdown(state) {
  const contenders = activePlayers(state.players);
  const pots = buildPots(state.players);

  const gains = {};
  contenders.forEach((p) => (gains[p.id] = 0));

  const evalCache = {};
  const evalFor = (id) => {
    if (evalCache[id]) return evalCache[id];
    const p = state.players.find((pl) => pl.id === id);
    const result = evaluateHand([...p.hand, ...state.communityCards]);
    evalCache[id] = result;
    return result;
  };

  for (const pot of pots) {
    if (pot.eligible.length === 0) continue;
    if (pot.eligible.length === 1) {
      gains[pot.eligible[0]] += pot.amount;
      continue;
    }
    let best = null;
    let winners = [];
    for (const id of pot.eligible) {
      const result = evalFor(id);
      if (!best || compareEval(result, best) > 0) {
        best = result;
        winners = [id];
      } else if (compareEval(result, best) === 0) {
        winners.push(id);
      }
    }
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    for (const id of winners) {
      gains[id] += share + (remainder > 0 ? 1 : 0);
      remainder = 0;
    }
  }

  const players = state.players.map((p) => {
    if (!(p.id in gains)) return p;
    return { ...p, chips: p.chips + gains[p.id] };
  });

  const showdown = contenders.map((p) => {
    const result = evalFor(p.id);
    return {
      id: p.id,
      name: p.name,
      handName: result.name,
      isWinner: gains[p.id] > 0,
      cards: result.cards,
    };
  });

  const winners = showdown.filter((s) => s.isWinner);
  const winReason =
    winners.length === 1
      ? `${winners[0].id === 'human' ? 'You win' : `${winners[0].name} wins`} with ${winners[0].handName}!`
      : `Split pot — ${winners.map((w) => (w.id === 'human' ? 'You' : w.name)).join(' & ')} tie with ${
          winners[0]?.handName ?? ''
        }.`;

  return {
    ...state,
    phase: PHASES.SHOWDOWN,
    players,
    pot: 0,
    handOver: true,
    activeId: null,
    needsToAct: [],
    winnerIds: winners.map((w) => w.id),
    winReason,
    showdown,
    message: winReason,
    log: log(state, winReason),
  };
}

function resolveFoldOut(state, folderId) {
  const survivors = activePlayers(state.players);
  const winner = survivors[0];
  const players = state.players.map((p) => (p.id === winner.id ? { ...p, chips: p.chips + state.pot } : p));
  const folder = state.players.find((p) => p.id === folderId);
  const winReason = `${folder.id === 'human' ? 'You' : folder.name} folded. ${
    winner.id === 'human' ? 'You win' : `${winner.name} wins`
  } the pot.`;

  return {
    ...state,
    players,
    pot: 0,
    phase: PHASES.SHOWDOWN,
    handOver: true,
    activeId: null,
    needsToAct: [],
    winnerIds: [winner.id],
    winReason,
    showdown: [],
    message: winReason,
    log: log(state, winReason),
  };
}

function applyAction(state, playerId, actionName, amount) {
  const idx = state.players.findIndex((p) => p.id === playerId);
  const player = state.players[idx];
  const toCall = state.currentBet - player.bet;

  if (actionName === 'fold') {
    const players = state.players.map((p) => (p.id === playerId ? { ...p, folded: true } : p));
    const actionLabel = `${playerId === 'human' ? 'You' : player.name} folded.`;
    let next = { ...state, players, lastAction: 'fold', message: actionLabel, log: log(state, actionLabel) };
    if (activePlayers(players).length === 1) {
      return resolveFoldOut(next, playerId);
    }
    return advanceAfterAction(next, idx, false);
  }

  let players = state.players.map((p) => ({ ...p }));
  let pot = state.pot;
  let currentBet = state.currentBet;
  let minRaiseSize = state.minRaiseSize;
  let actionLabel = '';
  let wasRealRaise = false;
  const me = players[idx];

  if (actionName === 'check') {
    actionLabel = `${playerId === 'human' ? 'You' : me.name} checked.`;
  } else if (actionName === 'call') {
    const callAmount = Math.min(toCall, me.chips);
    me.chips -= callAmount;
    me.bet += callAmount;
    me.committed += callAmount;
    pot += callAmount;
    if (me.chips === 0) me.allIn = true;
    actionLabel = `${playerId === 'human' ? 'You' : me.name} called ${callAmount}.`;
  } else if (actionName === 'raise') {
    const minTotal = currentBet + minRaiseSize;
    const maxTotal = me.bet + me.chips;
    // Clamp to maxTotal LAST so a short stack that can't reach the full min
    // raise is simply pushed all-in for whatever it has, never past it.
    const desiredTotal = Math.min(maxTotal, Math.max(minTotal, amount || minTotal));
    const totalPut = desiredTotal - me.bet;
    me.chips -= totalPut;
    me.bet += totalPut;
    me.committed += totalPut;
    pot += totalPut;
    if (me.chips === 0) me.allIn = true;

    if (me.bet > currentBet) {
      const raiseSize = me.bet - currentBet;
      minRaiseSize = Math.max(minRaiseSize, raiseSize);
      currentBet = me.bet;
      wasRealRaise = true;
      actionLabel = `${playerId === 'human' ? 'You' : me.name} raised to ${currentBet}.`;
    } else {
      actionLabel = `${playerId === 'human' ? 'You' : me.name} called ${totalPut} (all-in).`;
    }
  }

  let next = {
    ...state,
    players,
    pot,
    currentBet,
    minRaiseSize,
    lastAction: actionName,
    message: actionLabel,
    log: log(state, actionLabel),
  };

  if (activePlayers(players).length === 1) {
    return resolveFoldOut(next, playerId);
  }

  return advanceAfterAction(next, idx, wasRealRaise);
}

function advanceAfterAction(state, actorIndex, wasRealRaise) {
  const actorId = state.players[actorIndex].id;
  let needsToAct;
  if (wasRealRaise) {
    needsToAct = computeNeedsToAct(state.players, actorId);
  } else {
    needsToAct = state.needsToAct.filter((id) => id !== actorId);
  }

  if (needsToAct.length === 0) {
    return closeStreet({ ...state, needsToAct });
  }

  const nextIndex = findNextActive(state.players, actorIndex, needsToAct);
  if (nextIndex === -1) {
    return closeStreet({ ...state, needsToAct: [] });
  }

  return { ...state, needsToAct, activeId: state.players[nextIndex].id };
}

function closeStreet(state) {
  const contenders = activePlayers(state.players);
  const stillDeciding = canActPlayers(state.players);

  const resetBets = (s) => ({
    ...s,
    players: s.players.map((p) => ({ ...p, bet: 0 })),
    currentBet: 0,
    minRaiseSize: BIG_BLIND,
  });

  // Everyone remaining is all-in (or only one can still act with nothing to
  // decide) — run the board out to showdown without further betting.
  if (contenders.length > 1 && stillDeciding.length <= 1) {
    let progressed = resetBets({ ...state, needsToAct: [] });
    while (progressed.phase !== PHASES.SHOWDOWN) {
      progressed = dealCommunity(progressed);
    }
    return resolveShowdown(progressed);
  }

  if (state.phase === PHASES.RIVER) {
    const advanced = dealCommunity(resetBets(state));
    return resolveShowdown(advanced);
  }

  const advanced = dealCommunity(resetBets(state));
  const firstIndex = nextSeatedIndex(advanced.players, advanced.dealerIndex);
  const order = canActPlayers(advanced.players).map((p) => p.id);
  const needsToAct = rotateToStartFromSeat(advanced.players, order, firstIndex);

  return {
    ...advanced,
    needsToAct,
    activeId: needsToAct[0] ?? null,
    message: needsToAct[0]
      ? `${
          needsToAct[0] === 'human' ? 'Your' : advanced.players.find((p) => p.id === needsToAct[0]).name + "'s"
        } move.`
      : advanced.message,
  };
}

export function usePokerGame() {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);
  const botTimer = useRef(null);

  const dealHand = useCallback(() => dispatch({ type: 'DEAL_HAND' }), []);
  const resetTable = useCallback(() => dispatch({ type: 'RESET_TABLE' }), []);

  const playerAction = useCallback((actionName, amount) => {
    dispatch({ type: 'PLAYER_ACTION', action: actionName, amount });
  }, []);

  const activePlayer = state.players.find((p) => p.id === state.activeId);

  useEffect(() => {
    if (!state.handOver && activePlayer?.isBot) {
      botTimer.current = setTimeout(() => {
        botTimer.current = null;
        dispatch({ type: 'BOT_ACTION' });
      }, 700 + Math.random() * 500);
      return () => {
        clearTimeout(botTimer.current);
        botTimer.current = null;
      };
    }
  }, [state.handOver, state.activeId, activePlayer?.isBot]);

  return { state, dealHand, resetTable, playerAction, PHASES };
}
