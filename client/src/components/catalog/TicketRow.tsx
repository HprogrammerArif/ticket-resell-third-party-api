'use client';

import { useState } from 'react';

export function TicketRow(props: {
  tier: string;
  description?: string;
  price: number;
  available: number;
}) {
  const [qty, setQty] = useState(1);

  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-4">
      <div className="flex-1">
        <p className="font-semibold text-[var(--color-text-primary)]">{props.tier}</p>
        {props.description && (
          <p className="text-[13px] text-[var(--color-text-muted)]">{props.description}</p>
        )}
        <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
          {props.available > 0 ? `${props.available} available` : 'Sold out'}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            className="size-8 rounded-full border border-[var(--color-surface-border)] text-white disabled:opacity-40"
          >
            −
          </button>
          <span className="w-6 text-center text-[14px] text-white">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(props.available, q + 1))}
            disabled={qty >= props.available}
            className="size-8 rounded-full border border-[var(--color-surface-border)] text-white disabled:opacity-40"
          >
            +
          </button>
        </div>

        <span className="min-w-[80px] text-right font-semibold text-[var(--color-text-primary)]">
          ${(props.price * qty).toFixed(0)}
        </span>
      </div>
    </div>
  );
}
