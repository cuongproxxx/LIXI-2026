import { formatVnd } from "@/lib/format";

interface LixiCardFrontProps {
  index: number;
}

interface LixiCardBackProps {
  amount?: number | null;
}

export function LixiCardFront({ index }: LixiCardFrontProps) {
  const serial = `${index + 1}`.padStart(2, "0");

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[24px] border border-[#f1d8a6]/60 bg-gradient-to-b from-[#b7272b] via-[#982025] to-[#74161a] text-[#f6deb1] shadow-[0_16px_32px_rgba(122,23,27,0.34)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,240,210,0.22),transparent_36%),radial-gradient(circle_at_84%_90%,rgba(255,238,182,0.16),transparent_48%)]" />
      <svg viewBox="0 0 120 210" className="absolute inset-0 h-full w-full opacity-55" aria-hidden="true">
        <defs>
          <pattern id={`lixi-pattern-${serial}`} x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="9" cy="9" r="1.2" fill="#f3d897" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="120" height="210" fill={`url(#lixi-pattern-${serial})`} opacity="0.28" />
        <path d="M13 14v182" stroke="#f4dcab" strokeOpacity="0.28" strokeWidth="1" />
        <path d="M107 14v182" stroke="#f4dcab" strokeOpacity="0.28" strokeWidth="1" />
      </svg>
      <div className="absolute inset-x-2 top-2 rounded-xl border border-[#f7dfb0]/55 bg-[#8f1d20]/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-center">
        Chúc mừng năm mới
      </div>
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2">
        <svg viewBox="0 0 88 88" className="h-full w-full text-[#f3d897]" fill="none" aria-hidden="true">
          <circle cx="44" cy="44" r="26" stroke="currentColor" strokeWidth="2.2" />
          <path d="M44 24v40M24 44h40" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M28 30c8 2 12 6 16 14 4-8 8-12 16-14-8-2-12-6-16-14-4 8-8 12-16 14Z" fill="currentColor" opacity="0.24" />
        </svg>
      </div>
      <div className="absolute bottom-2 right-2 rounded-md border border-[#f5dcaa]/50 bg-[#7d181b]/70 px-2 py-0.5 text-[9px] tracking-[0.12em]">
        #{serial}
      </div>
    </div>
  );
}

export function LixiCardBack({ amount }: LixiCardBackProps) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[24px] border border-[#edd39f] bg-[linear-gradient(135deg,#fff8e8_0%,#ffeec9_100%)] text-[#6e1f22] shadow-[0_12px_24px_rgba(94,57,30,0.24)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(210,164,74,0.26),transparent_40%),radial-gradient(circle_at_80%_84%,rgba(143,29,32,0.14),transparent_44%)]" />
      <div className="absolute inset-x-3 top-3 rounded-xl border border-[#e2bf81] bg-white/40 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f1d20]">
        Cung hỷ phát tài
      </div>
      <div className="absolute inset-0 flex items-center justify-center px-3">
        {typeof amount === "number" ? (
          <p className="rounded-xl border border-[#e0bc78] bg-white/65 px-3 py-2 text-[1.65rem] font-bold text-[#8f1d20] shadow-[0_6px_18px_rgba(143,29,32,0.14)]">
            {formatVnd(amount)}
          </p>
        ) : (
          <svg viewBox="0 0 88 88" className="h-16 w-16 text-[#d2a44a]" fill="none" aria-hidden="true">
            <circle cx="44" cy="44" r="28" stroke="currentColor" strokeWidth="2.4" />
            <path d="M44 20v48M20 44h48" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </div>
  );
}
