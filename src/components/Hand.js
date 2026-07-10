'use client';

import PlayingCard from './PlayingCard';

export default function Hand({ cards, faceDown = false, size = 'md', winningCards = [] }) {
  const winningIds = new Set(winningCards.map((c) => c.id));
  return (
    <div className="flex gap-2">
      {cards.map((card, i) => (
        <PlayingCard
          key={card.id ?? i}
          card={card}
          faceDown={faceDown}
          dealDelay={i * 140}
          size={size}
          highlight={winningIds.has(card.id)}
        />
      ))}
    </div>
  );
}
