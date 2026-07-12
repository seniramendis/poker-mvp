// src/lib/omee.js
// Core primitives for Omee (Omi) — Sri Lanka's popular 4-player partnership
// trick-taking card game. Mirrors the style of engine.js (poker): cards are
// { rank, suit, value, id } so the existing PlayingCard component can be
// reused without changes.

export const SUITS = ['S', 'H', 'D', 'C']; // Spades, Hearts, Diamonds, Clubs
export const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const SUIT_NAME = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };

// Omee uses a 32-card deck: 7 through Ace in each suit.
export const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const RANK_VALUE = RANKS.reduce((acc, r, i) => {
  acc[r] = i + 7;
  return acc;
}, {});

export function createOmeeDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, value: RANK_VALUE[rank], id: `${rank}${suit}` });
    }
  }
  return deck;
}

export function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// --- Seats & partnerships -------------------------------------------------
// South (you) & North (bot) are partners, playing against West & East
// (both bots). Turn order runs counter-clockwise: South -> West -> North
// -> East -> South, matching real Omi table etiquette.

export const SEAT_ORDER = ['south', 'west', 'north', 'east'];

export const SEAT_LABEL = {
  south: 'You',
  west: 'West',
  north: 'Partner',
  east: 'East',
};

export const PARTNER_OF = { south: 'north', north: 'south', west: 'east', east: 'west' };
export const TEAM_OF = { south: 'us', north: 'us', west: 'them', east: 'them' };

export function nextSeat(seat) {
  const i = SEAT_ORDER.indexOf(seat);
  return SEAT_ORDER[(i + 1) % 4];
}

export function seatsFrom(seat) {
  const i = SEAT_ORDER.indexOf(seat);
  return [0, 1, 2, 3].map((k) => SEAT_ORDER[(i + k) % 4]);
}

export function sortHand(hand, trumpSuit) {
  const suitOrder = [trumpSuit, ...SUITS.filter((s) => s !== trumpSuit)];
  return [...hand].sort((a, b) => {
    const sa = suitOrder.indexOf(a.suit);
    const sb = suitOrder.indexOf(b.suit);
    if (sa !== sb) return sa - sb;
    return b.value - a.value;
  });
}

function groupBySuit(cards) {
  const groups = {};
  for (const c of cards) {
    (groups[c.suit] = groups[c.suit] || []).push(c);
  }
  return groups;
}

// --- Trick resolution -------------------------------------------------

function isBetter(card, currentBest, trumpSuit, ledSuit) {
  const cardTrump = card.suit === trumpSuit;
  const bestTrump = currentBest.suit === trumpSuit;
  if (cardTrump && !bestTrump) return true;
  if (!cardTrump && bestTrump) return false;
  if (cardTrump && bestTrump) return card.value > currentBest.value;
  const cardLed = card.suit === ledSuit;
  if (!cardLed) return false;
  return card.value > currentBest.value;
}

export function currentBestCard(trick, trumpSuit) {
  const ledSuit = trick[0].card.suit;
  let best = trick[0].card;
  for (let i = 1; i < trick.length; i++) {
    if (isBetter(trick[i].card, best, trumpSuit, ledSuit)) best = trick[i].card;
  }
  return best;
}

export function trickWinnerSeat(trick, trumpSuit) {
  const ledSuit = trick[0].card.suit;
  let best = trick[0];
  for (let i = 1; i < trick.length; i++) {
    if (isBetter(trick[i].card, best.card, trumpSuit, ledSuit)) best = trick[i];
  }
  return best.seat;
}

export function legalPlays(hand, ledSuit) {
  if (!ledSuit) return hand;
  const followers = hand.filter((c) => c.suit === ledSuit);
  return followers.length ? followers : hand;
}

// --- Bot AI -------------------------------------------------------------

export function botChooseTrump(hand) {
  const groups = groupBySuit(hand);
  let bestSuit = hand[0].suit;
  let bestScore = -1;
  for (const suit of SUITS) {
    const cards = groups[suit] || [];
    if (!cards.length) continue;
    const score = cards.length * 100 + cards.reduce((s, c) => s + c.value, 0);
    if (score > bestScore) {
      bestScore = score;
      bestSuit = suit;
    }
  }
  return bestSuit;
}

export function botChooseCard({ hand, currentTrick, trumpSuit, seat }) {
  const ledSuit = currentTrick.length ? currentTrick[0].card.suit : null;
  const legal = legalPlays(hand, ledSuit);

  // Leading a fresh trick.
  if (!ledSuit) {
    const nonTrump = groupBySuit(hand.filter((c) => c.suit !== trumpSuit));
    const suitsHeld = Object.keys(nonTrump);
    if (suitsHeld.length) {
      let bestSuit = suitsHeld[0];
      let bestCount = -1;
      for (const s of suitsHeld) {
        if (nonTrump[s].length > bestCount) {
          bestCount = nonTrump[s].length;
          bestSuit = s;
        }
      }
      return [...nonTrump[bestSuit]].sort((a, b) => b.value - a.value)[0];
    }
    return [...hand].sort((a, b) => a.value - b.value)[0];
  }

  // Following.
  const partner = PARTNER_OF[seat];
  const partnerWinning = trickWinnerSeat(currentTrick, trumpSuit) === partner;
  const best = currentBestCard(currentTrick, trumpSuit);
  const winners = legal.filter((c) => isBetter(c, best, trumpSuit, ledSuit));

  if (partnerWinning) {
    return [...legal].sort((a, b) => a.value - b.value)[0];
  }
  if (winners.length) {
    return [...winners].sort((a, b) => a.value - b.value)[0];
  }
  const nonTrumpLegal = legal.filter((c) => c.suit !== trumpSuit);
  const pool = nonTrumpLegal.length ? nonTrumpLegal : legal;
  return [...pool].sort((a, b) => a.value - b.value)[0];
}

// --- Scoring --------------------------------------------------------------
// Classic Omi token scoring:
//  - Trump-choosing team wins 5-7 tricks -> +1 token
//  - Other team wins 5-7 tricks          -> +2 tokens
//  - Either team sweeps all 8 tricks     -> +3 tokens ("Kapothi")
//  - 4-4 tie                             -> no tokens, next decisive hand pays +1 extra
export function scoreHand({ tricksWon, trumpTeam, carryPending }) {
  const otherTeam = trumpTeam === 'us' ? 'them' : 'us';

  if (tricksWon[trumpTeam] === 8) {
    return { team: trumpTeam, tokens: 3, reason: 'Kapothi! Swept all 8 tricks.', carryPending: false };
  }
  if (tricksWon[otherTeam] === 8) {
    return { team: otherTeam, tokens: 3, reason: 'Kapothi! Swept all 8 tricks.', carryPending: false };
  }
  if (tricksWon.us === 4 && tricksWon.them === 4) {
    return { team: null, tokens: 0, reason: 'Tied 4-4. No tokens — next win pays an extra token.', carryPending: true };
  }

  const winner = tricksWon.us > tricksWon.them ? 'us' : 'them';
  const base = winner === trumpTeam ? 1 : 2;
  const bonus = carryPending ? 1 : 0;
  const reason =
    winner === trumpTeam
      ? `Won ${tricksWon[winner]} tricks with trump.`
      : `Won ${tricksWon[winner]} tricks against trump.`;
  return { team: winner, tokens: base + bonus, reason, carryPending: false };
}
