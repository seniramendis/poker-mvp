'use client';

import PlayingCard from './PlayingCard';

export default function CommunityCards({ cards, winningCards = [] }) {
  const winningIds = new Set(winningCards.map((c) => c.id));
  const slots = Array.from({ length: 5 });

  return (
    <div className="flex gap-2">
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
          />
        );
      })}
    </div>
  );
}
