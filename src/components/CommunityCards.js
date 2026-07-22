'use client';

import PlayingCard from './PlayingCard';
import { dealOffsetFor } from '../lib/seatLayout';

export default function CommunityCards({ cards, winningCards = [] }) {
  const winningIds = new Set(winningCards.map((c) => c.id));
  const slots = Array.from({ length: 5 });
  const { x, y } = dealOffsetFor('dealer');

  return (
    <div className="flex" style={{ gap: 'var(--gap-xs)' }}>
      {slots.map((_, i) => {
        const card = cards[i];
        if (!card) {
          return <div key={i} className="community-slot" />;
        }
        return (
          <PlayingCard
            key={card.id}
            card={card}
            dealDelay={i * 150}
            highlight={winningIds.has(card.id)}
            fromX={x + (i - 2) * 14}
            fromY={y}
          />
        );
      })}
    </div>
  );
}
