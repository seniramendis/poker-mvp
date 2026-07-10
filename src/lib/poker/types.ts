// src/lib/poker/types.ts
// Core type definitions shared by the Dealer, Deck, and Hand Evaluator.
// Kept dependency-free so this module can be imported from both
// Client Components (for type hints) and Server-only API routes.

export type Suit = 'H' | 'D' | 'C' | 'S'; // Hearts, Diamonds, Clubs, Spades

// Rank stored as its numeric value for fast comparisons.
// 2-10 map directly, J=11, Q=12, K=13, A=14 (Ace-high by default;
// the evaluator special-cases the wheel straight A-2-3-4-5).
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  rank: Rank;
  suit: Suit;
  // Stable id, e.g. "AS", "10H" -> used as React keys / wire format.
  code: string;
}

export enum HandRank {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
}

export interface HandResult {
  rank: HandRank;
  rankName: string;
  // Tie-breaker score: compare arrays lexicographically (highest first).
  // e.g. Two Pair (Aces & Kings, 9 kicker) -> [14, 13, 9]
  tiebreakers: number[];
  // The 5 cards that make up the best hand, best-first.
  bestFive: Card[];
}

// --- Polymorphic player design -------------------------------------------
// Both a human-controlled seat and an AI bot seat share this shape so the
// Dealer and UI never need to branch on "is this a bot?" for basic state.
// Bot-specific behaviour (decision making) lives in a separate strategy
// module and is invoked via the `isBot` discriminant only where required.

export type SeatStatus = 'empty' | 'active' | 'folded' | 'all-in' | 'sitting-out';

export interface BasePlayer {
  id: string;
  seat: number; // 0-8 for a 9-max table
  displayName: string;
  chips: number; // balance in LKR (integer, smallest unit = 1 LKR)
  holeCards: Card[]; // always length 0 or 2
  status: SeatStatus;
  currentBet: number; // chips committed this betting round
  isBot: boolean;
}

export interface HumanPlayer extends BasePlayer {
  isBot: false;
  userId: string; // links to the authenticated account / wallet
}

export interface BotPlayer extends BasePlayer {
  isBot: true;
  botDifficulty: 'easy' | 'medium' | 'hard';
}

export type Player = HumanPlayer | BotPlayer;

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface TableState {
  tableId: string;
  street: Street;
  deck: Card[]; // remaining, face-down cards
  communityCards: Card[]; // 0, 3, 4, or 5 cards depending on street
  pot: number;
  players: Player[];
  dealerSeat: number;
  activeSeat: number; // whose turn it is to act
  smallBlind: number;
  bigBlind: number;
  currency: 'LKR';
}

// Wire-safe version of TableState: bot/opponent hole cards are stripped
// out before this leaves the server, so the client can never see them.
export interface PublicTableState extends Omit<TableState, 'deck' | 'players'> {
  players: PublicPlayerView[];
}

export interface PublicPlayerView extends Omit<BasePlayer, 'holeCards'> {
  holeCards: Card[]; // empty for anyone but the requesting player, unless showdown
  isBot: boolean;
}
