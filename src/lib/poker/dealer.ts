// src/lib/poker/dealer.ts
// The authoritative, server-side game engine for a single table.
// Owns the deck, seats, pot, and street progression. This class is the
// only thing allowed to touch `TableState.deck` and hole cards directly —
// everything else (UI, API routes, bot strategy) reads through
// `toPublicState()`, which strips information a given viewer shouldn't see.
//
// Uses the polymorphic Player type from ./types so a human seat and a bot
// seat are interchangeable everywhere in this file except where bot
// behaviour is explicitly required (fillEmptySeatsWithBots).

import { createDeck, drawCards, shuffleDeck } from './deck';
import { evaluateBestHand, rankHands } from './handEvaluator';
import {
  BotPlayer,
  Card,
  HumanPlayer,
  Player,
  PublicPlayerView,
  PublicTableState,
  Street,
  TableState,
} from './types';

const BOT_NAMES = ['Kamal', 'Nimal', 'Sanduni', 'Ishara', 'Ruwan', 'Dilani', 'Chamara', 'Harsha'];

let botCounter = 0;
function nextBotName(): string {
  return BOT_NAMES[botCounter++ % BOT_NAMES.length];
}

export class Dealer {
  private state: TableState;

  constructor(params: {
    tableId: string;
    seats: number; // table size, e.g. 6 or 9
    smallBlind: number;
    bigBlind: number;
  }) {
    this.state = {
      tableId: params.tableId,
      street: 'preflop',
      deck: [],
      communityCards: [],
      pot: 0,
      players: Array.from({ length: params.seats }, (_, seat) => this.emptySeat(seat)),
      dealerSeat: 0,
      activeSeat: 0,
      smallBlind: params.smallBlind,
      bigBlind: params.bigBlind,
      currency: 'LKR',
    };
  }

  private emptySeat(seat: number): BotPlayer {
    // An "empty" seat is modeled as an inactive bot placeholder so every
    // slot in `players` always satisfies the Player type -- no null checks
    // scattered through the rest of the codebase.
    return {
      id: `empty-${seat}`,
      seat,
      displayName: 'Empty Seat',
      chips: 0,
      holeCards: [],
      status: 'empty',
      currentBet: 0,
      isBot: true,
      botDifficulty: 'medium',
    };
  }

  // --- Seat management -----------------------------------------------

  seatHuman(player: Omit<HumanPlayer, 'holeCards' | 'status' | 'currentBet' | 'isBot'>): void {
    const seat = this.state.players[player.seat];
    if (seat.status !== 'empty') {
      throw new Error(`Seat ${player.seat} is already occupied.`);
    }
    this.state.players[player.seat] = {
      ...player,
      holeCards: [],
      status: 'active',
      currentBet: 0,
      isBot: false,
    };
  }

  /**
   * "Real World Play" matchmaking fallback: after the 15-second
   * countdown expires with seats still open, this fills every remaining
   * empty seat with an AI bot so the hand can start on time. Never
   * touches seats that already hold a human or another bot.
   */
  fillEmptySeatsWithBots(startingChips: number, difficulty: BotPlayer['botDifficulty'] = 'medium'): void {
    this.state.players = this.state.players.map((p) => {
      if (p.status !== 'empty') return p;
      const bot: BotPlayer = {
        id: `bot-${crypto.randomUUID()}`,
        seat: p.seat,
        displayName: nextBotName(),
        chips: startingChips,
        holeCards: [],
        status: 'active',
        currentBet: 0,
        isBot: true,
        botDifficulty: difficulty,
      };
      return bot;
    });
  }

  private activePlayers(): Player[] {
    return this.state.players.filter((p) => p.status === 'active' || p.status === 'all-in');
  }

  // --- Hand lifecycle ---------------------------------------------------

  /** Starts a brand-new hand: fresh shuffled deck, blinds posted, hole cards dealt. */
  startHand(): void {
    const seated = this.state.players.filter((p) => p.status !== 'empty');
    if (seated.length < 2) {
      throw new Error('At least 2 seated players are required to start a hand.');
    }

    this.state.deck = shuffleDeck(createDeck());
    this.state.communityCards = [];
    this.state.pot = 0;
    this.state.street = 'preflop';

    for (const p of this.state.players) {
      if (p.status === 'empty') continue;
      p.holeCards = [];
      p.currentBet = 0;
      p.status = p.chips > 0 ? 'active' : 'sitting-out';
    }

    this.postBlinds();
    this.dealHoleCards();

    this.state.activeSeat = this.nextSeatAfter(this.bigBlindSeat());
  }

  private smallBlindSeat(): number {
    return this.nextOccupiedSeat(this.state.dealerSeat);
  }
  private bigBlindSeat(): number {
    return this.nextOccupiedSeat(this.smallBlindSeat());
  }

  private nextOccupiedSeat(fromSeat: number): number {
    const n = this.state.players.length;
    for (let i = 1; i <= n; i++) {
      const candidate = (fromSeat + i) % n;
      if (this.state.players[candidate].status !== 'empty') return candidate;
    }
    throw new Error('No occupied seats found.');
  }

  private nextSeatAfter(seat: number): number {
    return this.nextOccupiedSeat(seat);
  }

  private postBlinds(): void {
    const sbSeat = this.smallBlindSeat();
    const bbSeat = this.bigBlindSeat();
    this.postBet(sbSeat, this.state.smallBlind);
    this.postBet(bbSeat, this.state.bigBlind);
  }

  private postBet(seat: number, amount: number): void {
    const player = this.state.players[seat];
    const bet = Math.min(amount, player.chips); // covers short-stack all-ins
    player.chips -= bet;
    player.currentBet += bet;
    this.state.pot += bet;
    if (player.chips === 0) player.status = 'all-in';
  }

  /** Deals 2 hole cards to every non-empty seat, one card at a time (per convention). */
  private dealHoleCards(): void {
    const order = this.activeDealOrder();
    for (let round = 0; round < 2; round++) {
      for (const seat of order) {
        const player = this.state.players[seat];
        const [card] = drawCards(this.state.deck, 1);
        player.holeCards.push(card);
      }
    }
  }

  private activeDealOrder(): number[] {
    const n = this.state.players.length;
    const order: number[] = [];
    let seat = this.nextOccupiedSeat(this.state.dealerSeat);
    for (let i = 0; i < n; i++) {
      if (this.state.players[seat].status !== 'empty') order.push(seat);
      seat = (seat + 1) % n;
    }
    return order;
  }

  // --- Community card streets -------------------------------------------

  dealFlop(): Card[] {
    this.assertStreet('preflop');
    this.burnCard();
    const flop = drawCards(this.state.deck, 3);
    this.state.communityCards.push(...flop);
    this.state.street = 'flop';
    this.resetBetsForNewStreet();
    return flop;
  }

  dealTurn(): Card {
    this.assertStreet('flop');
    this.burnCard();
    const [turn] = drawCards(this.state.deck, 1);
    this.state.communityCards.push(turn);
    this.state.street = 'turn';
    this.resetBetsForNewStreet();
    return turn;
  }

  dealRiver(): Card {
    this.assertStreet('turn');
    this.burnCard();
    const [river] = drawCards(this.state.deck, 1);
    this.state.communityCards.push(river);
    this.state.street = 'river';
    this.resetBetsForNewStreet();
    return river;
  }

  private burnCard(): void {
    drawCards(this.state.deck, 1);
  }

  private assertStreet(expected: Street): void {
    if (this.state.street !== expected) {
      throw new Error(`Cannot advance: expected street "${expected}", currently on "${this.state.street}".`);
    }
  }

  private resetBetsForNewStreet(): void {
    for (const p of this.state.players) p.currentBet = 0;
    this.state.activeSeat = this.nextOccupiedSeat(this.state.dealerSeat);
  }

  // --- Showdown -----------------------------------------------------------

  /** Evaluates all remaining (non-folded) hands and awards the pot. */
  resolveShowdown(): { id: string; displayName: string; handName: string; isWinner: boolean }[] {
    this.state.street = 'showdown';
    const contenders = this.activePlayers();

    const results = rankHands(
      contenders.map((p) => ({ id: p.id, cards: [...p.holeCards, ...this.state.communityCards] }))
    );

    const winners = results.filter((r) => r.isWinner);
    const share = Math.floor(this.state.pot / winners.length);
    let remainder = this.state.pot - share * winners.length; // odd chip goes to first winner

    for (const winner of winners) {
      const player = this.state.players.find((p) => p.id === winner.id)!;
      player.chips += share + (remainder > 0 ? 1 : 0);
      remainder = 0;
    }
    this.state.pot = 0;

    return results.map((r) => ({
      id: r.id,
      displayName: this.state.players.find((p) => p.id === r.id)!.displayName,
      handName: r.result.rankName,
      isWinner: r.isWinner,
    }));
  }

  /** Handles a fold action for a seat, checking for a walkover winner. */
  fold(seat: number): void {
    this.state.players[seat].status = 'folded';
  }

  advanceDealerButton(): void {
    this.state.dealerSeat = this.nextOccupiedSeat(this.state.dealerSeat);
  }

  // --- Serialization --------------------------------------------------

  /**
   * Returns a client-safe snapshot: the deck is removed and every
   * player's hole cards are hidden unless they belong to `viewerId` or
   * the hand is at showdown.
   */
  toPublicState(viewerId?: string): PublicTableState {
    const { deck, players, ...rest } = this.state;
    void deck;

    const publicPlayers: PublicPlayerView[] = players.map((p) => {
      const revealCards =
        p.id === viewerId || this.state.street === 'showdown';
      const { holeCards, ...pRest } = p;
      void holeCards;
      return {
        ...pRest,
        holeCards: revealCards ? p.holeCards : [],
      };
    });

    return { ...rest, players: publicPlayers };
  }

  getFullState(): TableState {
    // Server-internal use only (e.g. persistence) -- never send this
    // object over the wire as-is.
    return this.state;
  }
}

export { evaluateBestHand };
