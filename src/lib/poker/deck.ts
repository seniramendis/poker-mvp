// src/lib/poker/deck.ts
// Builds a standard 52-card deck and shuffles it securely.
// No external libraries: uses the Web Crypto API (available in both the
// Node.js runtime and the Edge runtime that Next.js Route Handlers run on)
// instead of Math.random(), which is predictable and unsuitable for any
// real-money card game.

import { Card, Rank, Suit } from './types';

const SUITS: Suit[] = ['H', 'D', 'C', 'S'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

const RANK_CODE: Record<Rank, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

/** Builds a fresh, ordered 52-card deck. Pure function, no side effects. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, code: `${RANK_CODE[rank]}${suit}` });
    }
  }
  return deck;
}

/**
 * Returns a cryptographically-secure random integer in [0, max).
 * Rejection sampling avoids modulo bias.
 */
function secureRandomInt(max: number): number {
  if (max <= 0) return 0;

  // crypto.getRandomValues is available globally in the Edge runtime and
  // in Node.js 19+ (globalThis.crypto). Fall back to Node's `crypto`
  // module for older Node runtimes just in case (e.g. `next start` on
  // an older Node version in a Docker image).
  const getRandomValues: (arr: Uint32Array) => Uint32Array =
    typeof globalThis.crypto?.getRandomValues === 'function'
      ? (arr) => globalThis.crypto.getRandomValues(arr)
      : (() => {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const nodeCrypto = require('crypto');
          return (arr: Uint32Array) => nodeCrypto.webcrypto.getRandomValues(arr);
        })();

  const range = 0xffffffff;
  const limit = range - (range % max);
  const buf = new Uint32Array(1);

  let val: number;
  do {
    getRandomValues(buf);
    val = buf[0];
  } while (val >= limit);

  return val % max;
}

/**
 * Shuffles a deck in place using the Fisher-Yates algorithm driven by a
 * CSPRNG, and also returns it for convenient chaining.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Convenience: builds and shuffles a new deck in one call. */
export function newShuffledDeck(): Card[] {
  return shuffleDeck(createDeck());
}

/**
 * Removes and returns the top `count` cards from the deck (mutates deck).
 * Throws if the deck doesn't have enough cards left, since silently
 * dealing fewer cards than requested would corrupt game state.
 */
export function drawCards(deck: Card[], count: number): Card[] {
  if (deck.length < count) {
    throw new Error(
      `Cannot draw ${count} card(s): only ${deck.length} remaining in deck.`
    );
  }
  return deck.splice(0, count);
}
