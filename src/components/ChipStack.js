'use client';

export function ChipStack({ amount, small = false }) {
  const chips = Math.min(6, Math.max(1, Math.round(Math.log2(Math.max(amount, 1) / 40 + 1))));
  const size = small ? 'clamp(16px, 4.4vw, 22px)' : 'clamp(20px, 5.6vw, 30px)';
  const step = small ? 'clamp(2px, 0.6vw, 3px)' : 'clamp(3px, 0.8vw, 4px)';
  return (
    <div className="flex items-end gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        {Array.from({ length: chips }).map((_, i) => (
          <div
            key={i}
            className="chip-disc"
            style={{
              bottom: `calc(${step} * ${i})`,
              width: size,
              height: size,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function PotDisplay({ pot }) {
  return (
    <div className="pot-badge flex flex-col items-center gap-1">
      <ChipStack amount={pot} />
      <span className="pot-amount">POT&nbsp;{pot.toLocaleString()}</span>
    </div>
  );
}
