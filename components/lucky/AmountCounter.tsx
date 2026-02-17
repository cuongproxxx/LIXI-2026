"use client";

import { useEffect, useState } from "react";
import { formatVnd } from "@/lib/format";

interface AmountCounterProps {
  value: number;
  durationMs?: number;
}

export function AmountCounter({ value, durationMs = 900 }: AmountCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, value]);

  return <span>{formatVnd(displayValue)}</span>;
}
