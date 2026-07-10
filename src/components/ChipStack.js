'use client';

export function ChipStack({ amount, small = false }) {
  const chips = Math.min(6, Math.max(1, Math.round(Math.log2(Math.max(amount, 1) / 40 + 1))));
  return (
    <div className="flex items-end gap-1">
      <div className="relative" style={{ width: small ? 22 : 30, height: small ? 22 : 30 }}>
        {Array.from({ length: chips }).map((_, i) => (
          <div
            key={i}
            className="chip-disc"
            style={{
              bottom: i * (small ? 3 : 4),
              width: small ? 22 : 30,
              height: small ? 22 : 30,
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
