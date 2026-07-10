// Core poker primitives: deck, deck management, and hand evaluation.
// Cards are represented as { rank, suit, value } where value is 2-14 (14 = Ace).

export const SUITS = ['S', 'H', 'D', 'C']; // Spades, Hearts, Diamonds, Clubs
export const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const RANK_VALUE = RANKS.reduce((acc, r, i) => {
  acc[r] = i + 2;
  return acc;
}, {});

export function createDeck() {
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

// ---- Hand evaluation --------------------------------------------------
// Returns { score, name, tiebreak: number[] } where higher score always wins.
// score 8=StraightFlush 7=Quads 6=FullHouse 5=Flush 4=Straight 3=Trips 2=TwoPair 1=Pair 0=HighCard

const HAND_NAMES = [
  'High Card',
  'Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
];

function combinations(arr, k) {
  const results = [];
  const combo = [];
  function go(start) {
    if (combo.length === k) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      go(i + 1);
      combo.pop();
    }
  }
  go(0);
  return results;
}

function evaluateFive(cards) {
  const values = cards.map((c) => c.value).sort((a, b) => b - a);
  const suitsCount = {};
  const valueCount = {};
  for (const c of cards) {
    suitsCount[c.suit] = (suitsCount[c.suit] || 0) + 1;
    valueCount[c.value] = (valueCount[c.value] || 0) + 1;
  }
  const isFlush = Object.values(suitsCount).some((n) => n === 5);

  // Straight detection (handles wheel A-2-3-4-5)
  const uniqueVals = [...new Set(values)];
  let straightHigh = null;
  if (uniqueVals.length === 5) {
    if (uniqueVals[0] - uniqueVals[4] === 4) straightHigh = uniqueVals[0];
    else if (uniqueVals.join(',') === '14,5,4,3,2') straightHigh = 5; // wheel
  }

  const groups = Object.entries(valueCount)
    .map(([v, n]) => ({ value: Number(v), count: n }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  const countsPattern = groups.map((g) => g.count).join('');

  if (straightHigh && isFlush) {
    return { score: 8, name: 'Straight Flush', tiebreak: [straightHigh] };
  }
  if (countsPattern.startsWith('4')) {
    return {
      score: 7,
      name: 'Four of a Kind',
      tiebreak: [groups[0].value, groups[1].value],
    };
  }
  if (countsPattern.startsWith('32')) {
    return {
      score: 6,
      name: 'Full House',
      tiebreak: [groups[0].value, groups[1].value],
    };
  }
  if (isFlush) {
    return { score: 5, name: 'Flush', tiebreak: values };
  }
  if (straightHigh) {
    return { score: 4, name: 'Straight', tiebreak: [straightHigh] };
  }
  if (countsPattern.startsWith('3')) {
    const kickers = groups.filter((g) => g.count === 1).map((g) => g.value);
    return { score: 3, name: 'Three of a Kind', tiebreak: [groups[0].value, ...kickers] };
  }
  if (countsPattern.startsWith('22')) {
    const kicker = groups.find((g) => g.count === 1).value;
    return {
      score: 2,
      name: 'Two Pair',
      tiebreak: [groups[0].value, groups[1].value, kicker],
    };
  }
  if (countsPattern.startsWith('2')) {
    const kickers = groups.filter((g) => g.count === 1).map((g) => g.value);
    return { score: 1, name: 'Pair', tiebreak: [groups[0].value, ...kickers] };
  }
  return { score: 0, name: 'High Card', tiebreak: values };
}

// Evaluates the best 5-card hand out of any number (5-7) of cards.
export function evaluateHand(cards) {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate a hand');
  }
  let best = null;
  for (const combo of combinations(cards, 5)) {
    const result = evaluateFive(combo);
    if (!best || compareEval(result, best) > 0) {
      best = { ...result, cards: combo };
    }
  }
  return best;
}

// Returns positive if a beats b, negative if b beats a, 0 for a tie.
export function compareEval(a, b) {
  if (a.score !== b.score) return a.score - b.score;
  const len = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < len; i++) {
    const av = a.tiebreak[i] ?? 0;
    const bv = b.tiebreak[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

export function handName(score) {
  return HAND_NAMES[score] ?? 'High Card';
}

// Kept for backwards compatibility with any earlier callers.
export class PokerEngine {
  constructor() {
    this.deck = shuffle(createDeck());
  }

  generateDeck() {
    this.deck = createDeck();
  }

  shuffleDeck() {
    this.deck = shuffle(this.deck);
    return this.deck;
  }

  dealHand() {
    this.shuffleDeck();
    return {
      player: [this.deck.pop(), this.deck.pop()],
      bot1: [this.deck.pop(), this.deck.pop()],
    };
  }
}
