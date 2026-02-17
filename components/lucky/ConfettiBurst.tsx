"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";

interface ConfettiBurstProps {
  seed: number;
}

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  x: string;
  rotate: string;
  color: string;
}

const COLORS = ["#d2a44a", "#e7c56b", "#8f1d20", "#f3dba7", "#b32a2f"];

function randomFromSeed(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function ConfettiBurst({ seed }: ConfettiBurstProps) {
  const pieces = useMemo(() => {
    const rand = randomFromSeed(seed);
    return Array.from({ length: 40 }).map<Piece>((_, id) => ({
      id,
      left: rand() * 100,
      delay: rand() * 0.12,
      duration: 0.7 + rand() * 0.5,
      x: `${Math.round((rand() - 0.5) * 160)}px`,
      rotate: `${Math.round((rand() - 0.5) * 720)}deg`,
      color: COLORS[Math.floor(rand() * COLORS.length)]
    }));
  }, [seed]);

  return (
    <div className="pointer-events-none absolute left-0 top-0 h-0 w-full">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute block h-2 w-1 rounded-sm"
          style={
            {
              left: `${piece.left}%`,
              top: "4px",
              backgroundColor: piece.color,
              animationName: "confettiFall",
              animationDuration: `${piece.duration}s`,
              animationDelay: `${piece.delay}s`,
              animationTimingFunction: "cubic-bezier(0.18, 0.88, 0.34, 1)",
              animationFillMode: "forwards",
              "--confetti-x": piece.x,
              "--confetti-r": piece.rotate
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
