// Single source of truth for where everyone sits around the oval table:
// a permanent dealer alone at the head of the table (directly across from
// the human - nobody else shares that seat), three bots fanned out to the
// sides, and the human at the foot of the table. Both the CSS placement
// (clamp-based, for crisp responsive layout) and the plain percentage
// placement (for framer-motion chip-flight animations, which need
// numeric/percent values it can actually tween) live here so the two
// never drift apart.

export const BOT_SEAT_CSS = [
  { top: 'clamp(50px, 12vh, 96px)', left: '22%' }, // bot-0, upper-left
  { top: 'clamp(50px, 12vh, 96px)', left: '78%' }, // bot-1, upper-right
  { top: 'clamp(128px, 30vh, 232px)', left: '9%' }, // bot-2, mid-left rail
];

export const DEALER_SEAT_CSS = { top: 'clamp(4px, 2.6vh, 22px)', left: '50%' };

export const HUMAN_SEAT_CSS = { bottom: 'clamp(56px, 13vh, 100px)', left: '50%' };

// Plain numeric percentages of the viewport, used only for animating chips
// flying from a seat toward the pot. Keep roughly in sync with the CSS
// positions above.
export const SEAT_PCT = {
  dealer: { top: 6, left: 50 },
  'bot-0': { top: 15, left: 22 },
  'bot-1': { top: 15, left: 78 },
  'bot-2': { top: 33, left: 9 },
  human: { top: 86, left: 50 },
};

export const POT_PCT = { top: 47, left: 50 };

export function seatPct(id) {
  return SEAT_PCT[id] ?? POT_PCT;
}

// Pixel offset a card dealt to `seatId` should fly in from, so every deal
// visibly originates at the dealer's hands regardless of where the card
// lands.
export function dealOffsetFor(seatId) {
  const seat = SEAT_PCT[seatId] ?? SEAT_PCT.human;
  const dealer = SEAT_PCT.dealer;
  const scale = 2.4;
  const x = Math.max(-200, Math.min(200, (dealer.left - seat.left) * scale));
  const y = Math.max(-260, Math.min(-36, (dealer.top - seat.top) * scale));
  return { x, y };
}
