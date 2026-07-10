// src/lib/poker/handEvaluator.ts
// Evaluates the best 5-card poker hand out of 5, 6, or 7 cards
// (hole cards + community cards) with zero external dependencies.

import { Card, HandRank, HandResult, Rank } from './types';

const HAND_NAMES: Record<HandRank, string> = {
  [HandRank.HighCard]: 'High Card',
  [HandRank.Pair]: 'Pair',
  [HandRank.TwoPair]: 'Two Pair',
  [HandRank.ThreeOfAKind]: 'Three of a Kind',
  [HandRank.Straight]: 'Straight',
  [HandRank.Flush]: 'Flush',
  [HandRank.FullHouse]: 'Full House',
  [HandRank.FourOfAKind]: 'Four of a Kind',
  [HandRank.StraightFlush]: 'Straight Flush',
};

/** Generates every k-length combination of `items` (order preserved). */
function* combinations<T>(items: T[], k: number): Generator<T[]> {
  const n = items.length;
  if (k > n) return;
  const indices = Array.from({ length: k }, (_, i) => i);

  while (true) {
    yield indices.map((i) => items[i]);

    let i = k - 1;
    while (i >= 0 && indices[i] === i + n - k) i--;
    if (i < 0) return;

    indices[i]++;
    for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1;
  }
}

/**
 * Evaluates exactly 5 cards and returns their HandResult.
 * This is the core primitive; evaluateBestHand() calls it for every
 * possible 5-card subset when given 6 or 7 cards.
 */
function evaluateFiveCardHand(cards: Card[]): HandResult {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);

  const rankCounts = new Map<Rank, number>();
  for (const c of sorted) {
    rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1);
  }

  const isFlush = sorted.every((c) => c.suit === sorted[0].suit);

  // Distinct ranks, high to low, for straight detection.
  const distinctRanks = Array.from(new Set(sorted.map((c) => c.rank))).sort(
    (a, b) => b - a
  );

  let straightHigh: number | null = null;
  if (distinctRanks.length === 5) {
    const isSequential = distinctRanks[0] - distinctRanks[4] === 4;
    if (isSequential) {
      straightHigh = distinctRanks[0];
    } else if (
      // Wheel: A-2-3-4-5 (Ace plays low). distinctRanks would be [14,5,4,3,2].
      distinctRanks[0] === 14 &&
      distinctRanks[1] === 5 &&
      distinctRanks[2] === 4 &&
      distinctRanks[3] === 3 &&
      distinctRanks[4] === 2
    ) {
      straightHigh = 5;
    }
  }

  // Group ranks by frequency: [[rank, count], ...] sorted by count desc,
  // then rank desc -> gives us quads/trips/pairs/kickers in priority order.
  const groups = Array.from(rankCounts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });
  const counts = groups.map((g) => g[1]);

  const buildResult = (rank: HandRank, tiebreakers: number[]): HandResult => ({
    rank,
    rankName: HAND_NAMES[rank],
    tiebreakers,
    bestFive: sorted,
  });

  if (straightHigh && isFlush) {
    return buildResult(HandRank.StraightFlush, [straightHigh]);
  }
  if (counts[0] === 4) {
    const kicker = groups.find((g) => g[1] === 1)![0];
    return buildResult(HandRank.FourOfAKind, [groups[0][0], kicker]);
  }
  if (counts[0] === 3 && counts[1] === 2) {
    return buildResult(HandRank.FullHouse, [groups[0][0], groups[1][0]]);
  }
  if (isFlush) {
    return buildResult(
      HandRank.Flush,
      sorted.map((c) => c.rank)
    );
  }
  if (straightHigh) {
    return buildResult(HandRank.Straight, [straightHigh]);
  }
  if (counts[0] === 3) {
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]);
    return buildResult(HandRank.ThreeOfAKind, [groups[0][0], ...kickers]);
  }
  if (counts[0] === 2 && counts[1] === 2) {
    const [pairA, pairB] = [groups[0][0], groups[1][0]].sort((a, b) => b - a);
    const kicker = groups.find((g) => g[1] === 1)![0];
    return buildResult(HandRank.TwoPair, [pairA, pairB, kicker]);
  }
  if (counts[0] === 2) {
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]);
    return buildResult(HandRank.Pair, [groups[0][0], ...kickers]);
  }
  return buildResult(
    HandRank.HighCard,
    sorted.map((c) => c.rank)
  );
}

/** Lexicographically compares two HandResults. Positive => a wins. */
export function compareHandResults(a: HandResult, b: HandResult): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  const len = Math.max(a.tiebreakers.length, b.tiebreakers.length);
  for (let i = 0; i < len; i++) {
    const diff = (a.tiebreakers[i] ?? 0) - (b.tiebreakers[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Evaluates the best possible 5-card hand from 5-7 cards
 * (2 hole cards + up to 5 community cards in Texas Hold'em).
 */
export function evaluateBestHand(cards: Card[]): HandResult {
  if (cards.length < 5) {
    throw new Error(
      `evaluateBestHand requires at least 5 cards, received ${cards.length}.`
    );
  }
  if (cards.length === 5) {
    return evaluateFiveCardHand(cards);
  }

  let best: HandResult | null = null;
  for (const combo of combinations(cards, 5)) {
    const result = evaluateFiveCardHand(combo);
    if (!best || compareHandResults(result, best) > 0) {
      best = result;
    }
  }
  return best!;
}

/**
 * Ranks multiple players' hands (e.g. at showdown) and returns indices of
 * the winner(s), sorted best-first. Handles split pots via tied results.
 */
export function rankHands(
  hands: { id: string; cards: Card[] }[]
): { id: string; result: HandResult; isWinner: boolean }[] {
  const evaluated = hands.map((h) => ({
    id: h.id,
    result: evaluateBestHand(h.cards),
  }));

  const best = evaluated.reduce((acc, cur) =>
    compareHandResults(cur.result, acc.result) > 0 ? cur : acc
  ).result;

  return evaluated
    .map((h) => ({
      ...h,
      isWinner: compareHandResults(h.result, best) === 0,
    }))
    .sort((a, b) => compareHandResults(b.result, a.result));
}
