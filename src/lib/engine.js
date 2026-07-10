export class PokerEngine {
  constructor() {
    this.suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
    this.values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    this.deck = [];
    this.generateDeck();
  }

  generateDeck() {
    for (let suit of this.suits) {
      for (let value of this.values) {
        this.deck.push(`${value} of ${suit}`);
      }
    }
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
    return this.deck;
  }

  dealHand() {
    this.shuffleDeck();
    return {
      player: [this.deck.pop(), this.deck.pop()],
      bot1: [this.deck.pop(), this.deck.pop()]
    };
  }
}