"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Target } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { AmountCounter } from "@/components/lucky/AmountCounter";
import { ConfettiBurst } from "@/components/lucky/ConfettiBurst";
import { LixiCardBack, LixiCardFront } from "@/components/lucky/LixiCardFace";

type SceneState = "stack" | "shuffle" | "fan" | "revealing" | "result" | "locked" | "exhausted";
type RevealStage = "fly" | "flip" | "done";
type ShufflePhase = "idle" | "split" | "cross" | "gather";

interface PublicDeckInfo {
  amount: number;
  remaining: number;
}

interface PublicConfigResponse {
  deck: PublicDeckInfo[];
  remainingTotal: number;
}

interface DrawApiResponse {
  ok?: boolean;
  amount?: number;
  remainingTotal?: number;
  exhausted?: boolean;
  error?: string;
}

interface DrawRecord {
  amount: number;
  remainingTotal: number;
}

interface StageSize {
  width: number;
  height: number;
}

interface FanLayout {
  angleStep: number;
  radius: number;
  baseYOffset: number;
  stageShiftY: number;
  scale: number;
}

interface MotionState extends Target {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  opacity: number;
}

const DEFAULT_CARD_COUNT = 13;
const CARD_WIDTH = 108;
const CARD_HEIGHT = 192;
const CARD_HALF_WIDTH = CARD_WIDTH / 2;
const CARD_HALF_HEIGHT = CARD_HEIGHT / 2;
const MIN_ANGLE = -60;
const MAX_ANGLE = 60;
const INITIAL_SHUFFLE_SEED = 2026;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function degToRad(value: number): number {
  return (value * Math.PI) / 180;
}

function createSeededRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function buildSequentialOrder(count: number): number[] {
  const safeCount = Math.max(1, Math.floor(count));
  return Array.from({ length: safeCount }, (_, index) => index);
}

function createShuffledOrder(order: number[], seed: number): number[] {
  const random = createSeededRandom(seed);
  const next = [...order];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function buildFanLayout(stage: StageSize, cardCount: number): FanLayout {
  const width = stage.width || 330;
  const height = stage.height || 320;
  const maxAngleRad = degToRad(Math.max(Math.abs(MIN_ANGLE), Math.abs(MAX_ANGLE)));
  const radius = clamp(width * 0.55, 220, 360);
  const angleStep = cardCount > 1 ? (MAX_ANGLE - MIN_ANGLE) / (cardCount - 1) : 0;
  const baseYOffset = clamp(height * 0.1, 40, 90);
  const curveDepth = radius * (1 - Math.cos(maxAngleRad));
  const stageShiftY = -(baseYOffset + curveDepth / 2);

  const neededWidth = radius * Math.sin(maxAngleRad) * 2 + CARD_WIDTH;
  const neededHeight = curveDepth + CARD_HEIGHT;
  const availableWidth = Math.max(1, width - 12);
  const availableHeight = Math.max(1, height - 14);
  const scale = Math.min(1, availableWidth / neededWidth, availableHeight / neededHeight);

  return { angleStep, radius, baseYOffset, stageShiftY, scale };
}

function buildFanMotion(index: number, fanLayout: FanLayout, cardCount: number): MotionState {
  const angle = cardCount > 1 ? MIN_ANGLE + index * fanLayout.angleStep : 0;
  const angleRad = degToRad(angle);
  const x = fanLayout.radius * Math.sin(angleRad);
  const yCurve = fanLayout.radius * (1 - Math.cos(angleRad));
  const y = yCurve + fanLayout.baseYOffset + fanLayout.stageShiftY;
  return { x, y, rotate: angle, scale: 1, opacity: 1 };
}

export function LuckyDrawPage() {
  const fanRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const queuedXRef = useRef<number | null>(null);
  const scrubPointerRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const swipeConsumedRef = useRef(false);
  const timeoutIdsRef = useRef<number[]>([]);
  const sequenceTokenRef = useRef(0);
  const drawRequestIdRef = useRef(0);
  const shuffleSeedRef = useRef(INITIAL_SHUFFLE_SEED);

  const [scene, setScene] = useState<SceneState>("stack");
  const [revealStage, setRevealStage] = useState<RevealStage>("fly");
  const [shufflePhase, setShufflePhase] = useState<ShufflePhase>("idle");
  const [cardOrder, setCardOrder] = useState<number[]>(buildSequentialOrder(DEFAULT_CARD_COUNT));
  const [pendingOrder, setPendingOrder] = useState<number[] | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawError, setDrawError] = useState("");
  const [remainingTotal, setRemainingTotal] = useState(0);
  const [drawRecord, setDrawRecord] = useState<DrawRecord | null>(null);
  const [revealedAmount, setRevealedAmount] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiSeed, setConfettiSeed] = useState(0);
  const [amountDuration, setAmountDuration] = useState(820);
  const [stageSize, setStageSize] = useState<StageSize>({ width: 330, height: 320 });

  const cardCount = Math.max(1, cardOrder.length);
  const centerIndex = Math.floor((cardCount - 1) / 2);
  const fanLayout = useMemo(() => buildFanLayout(stageSize, cardCount), [stageSize, cardCount]);

  const destinationIndexByCard = useMemo(() => {
    const map = new Map<number, number>();
    if (!pendingOrder) return map;
    pendingOrder.forEach((cardId, index) => map.set(cardId, index));
    return map;
  }, [pendingOrder]);

  const selectedCardId = useMemo(() => {
    if (selectedIndex === null) return null;
    return cardOrder[selectedIndex] ?? null;
  }, [cardOrder, selectedIndex]);

  const clearScheduledWork = useCallback(() => {
    timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutIdsRef.current = [];

    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    queuedXRef.current = null;
    scrubPointerRef.current = null;
    swipeStartYRef.current = null;
    swipeConsumedRef.current = false;
    setIsScrubbing(false);
  }, []);

  const scheduleTimeout = useCallback((callback: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((value) => value !== id);
      callback();
    }, delayMs);
    timeoutIdsRef.current.push(id);
  }, []);

  const waitStep = useCallback(
    (delayMs: number, token: number) => {
      return new Promise<boolean>((resolve) => {
        scheduleTimeout(() => resolve(sequenceTokenRef.current === token), delayMs);
      });
    },
    [scheduleTimeout]
  );

  const runShuffleSequence = useCallback(
    async (baseOrder: number[], seed: number) => {
      sequenceTokenRef.current += 1;
      const token = sequenceTokenRef.current;
      clearScheduledWork();

      const nextOrder = createShuffledOrder(baseOrder, seed);
      setCardOrder(baseOrder);
      setPendingOrder(nextOrder);
      setSelectedIndex(null);
      setRevealStage("fly");
      setScene("stack");
      setShufflePhase("idle");
      setHighlightedIndex(null);

      const splitGate = await waitStep(120, token);
      if (!splitGate) return;
      setScene("shuffle");
      setShufflePhase("split");

      const crossGate = await waitStep(460, token);
      if (!crossGate) return;
      setShufflePhase("cross");

      const gatherGate = await waitStep(520, token);
      if (!gatherGate) return;
      setShufflePhase("gather");

      const fanGate = await waitStep(420, token);
      if (!fanGate) return;
      setCardOrder(nextOrder);
      setPendingOrder(null);
      setShufflePhase("idle");
      setHighlightedIndex(null);
      setScene("fan");
    },
    [clearScheduledWork, waitStep]
  );

  const flushQueuedX = useCallback(() => {
    rafRef.current = null;
    const clientX = queuedXRef.current;
    if (clientX === null || !fanRef.current) return;

    const rect = fanRef.current.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const t = rect.width === 0 ? 0 : x / rect.width;
    const maxIndex = cardCount - 1;
    const index = clamp(Math.round(t * maxIndex), 0, maxIndex);
    setHighlightedIndex((prev) => (prev === index ? prev : index));
  }, [cardCount]);

  const queueScrubUpdate = useCallback(
    (clientX: number) => {
      queuedXRef.current = clientX;
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(flushQueuedX);
    },
    [flushQueuedX]
  );

  useEffect(() => {
    if (!fanRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setStageSize({ width: rect.width, height: rect.height });
    });
    observer.observe(fanRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await fetch("/api/config", { cache: "no-store" });
        if (!response.ok) throw new Error("Không tải được cấu hình.");
        const data = (await response.json()) as PublicConfigResponse;
        setRemainingTotal(data.remainingTotal);

        const initialCount = Math.max(0, data.remainingTotal);
        const initialOrder = initialCount > 0 ? buildSequentialOrder(initialCount) : [];
        setCardOrder(initialOrder);
        setHighlightedIndex(null);

        if (initialCount <= 0) {
          setScene("exhausted");
          return;
        }

        void runShuffleSequence(initialOrder, shuffleSeedRef.current);
      } catch {
        setDrawError("Không tải được dữ liệu lì xì. Vui lòng tải lại trang.");
      }
    };

    void bootstrap();

    return () => {
      drawRequestIdRef.current += 1;
      sequenceTokenRef.current += 1;
      clearScheduledWork();
    };
  }, [clearScheduledWork, runShuffleSequence]);

  useEffect(() => {
    if (!showConfetti) return;
    const timer = window.setTimeout(() => setShowConfetti(false), 1200);
    return () => window.clearTimeout(timer);
  }, [showConfetti]);

  const confirmSelection = async (index: number) => {
    if (scene !== "fan" || isDrawing || remainingTotal <= 0) return;

    setSelectedIndex(index);
    setDrawError("");
    setRevealedAmount(null);
    setDrawRecord(null);
    setIsDrawing(true);
    setScene("revealing");
    setRevealStage("fly");

    scheduleTimeout(() => setRevealStage("flip"), 420);
    scheduleTimeout(() => setRevealStage("done"), 980);

    const requestId = drawRequestIdRef.current + 1;
    drawRequestIdRef.current = requestId;

    try {
      const response = await fetch("/api/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ continue: true })
      });
      const body = (await response.json()) as DrawApiResponse;
      if (requestId !== drawRequestIdRef.current) return;

      if (!response.ok) {
        if (response.status === 429) {
          setScene("locked");
          setDrawError(body.error ?? "Bạn đã rút lì xì trong 24 giờ qua.");
        } else if (response.status === 409 || body.exhausted) {
          setScene("exhausted");
          setRemainingTotal(0);
          setCardOrder([]);
          setSelectedIndex(null);
          setDrawError(body.error ?? "Hết lì xì rồi.");
        } else {
          setScene("fan");
          setSelectedIndex(null);
          setRevealStage("fly");
          setDrawError(body.error ?? "Không thể rút lì xì lúc này.");
        }
        return;
      }

      const amount = body.amount ?? 0;
      const nextRemaining = body.remainingTotal ?? 0;

      setRevealedAmount(amount);
      setDrawRecord({ amount, remainingTotal: nextRemaining });
      setRemainingTotal(nextRemaining);

      setAmountDuration(800);
      setConfettiSeed(Date.now());
      setShowConfetti(true);
      setScene("result");
    } catch {
      if (requestId !== drawRequestIdRef.current) return;
      setScene("fan");
      setSelectedIndex(null);
      setRevealStage("fly");
      setDrawError("Mất kết nối, thử lại sau vài giây.");
    } finally {
      if (requestId === drawRequestIdRef.current) setIsDrawing(false);
    }
  };

  const handleReset = () => {
    if (remainingTotal <= 0) {
      setCardOrder([]);
      setSelectedIndex(null);
      setRevealStage("fly");
      setScene("exhausted");
      return;
    }

    drawRequestIdRef.current += 1;
    clearScheduledWork();

    setIsDrawing(false);
    setShowConfetti(false);
    setDrawError("");
    setDrawRecord(null);
    setRevealedAmount(null);
    setSelectedIndex(null);
    setRevealStage("fly");
    setScene("stack");
    setPendingOrder(null);

    const resetOrder = buildSequentialOrder(remainingTotal);
    setCardOrder(resetOrder);
    setHighlightedIndex(null);

    const nextSeed = shuffleSeedRef.current + 1;
    shuffleSeedRef.current = nextSeed;
    void runShuffleSequence(resetOrder, nextSeed);
  };

  const handlePlayContinue = () => {
    if (remainingTotal <= 0) {
      setScene("exhausted");
      return;
    }

    drawRequestIdRef.current += 1;
    clearScheduledWork();
    setIsDrawing(false);
    setShowConfetti(false);
    setDrawError("");
    setDrawRecord(null);
    setRevealedAmount(null);
    setSelectedIndex(null);
    setRevealStage("fly");
    setPendingOrder(null);

    const continueOrder = buildSequentialOrder(remainingTotal);
    setCardOrder(continueOrder);
    setHighlightedIndex(null);

    const nextSeed = shuffleSeedRef.current + 1;
    shuffleSeedRef.current = nextSeed;
    void runShuffleSequence(continueOrder, nextSeed);
  };

  const handleFanPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (scene !== "fan" || remainingTotal <= 0) return;
    scrubPointerRef.current = event.pointerId;
    setIsScrubbing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    queueScrubUpdate(event.clientX);
  };

  const handleFanPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isScrubbing || scrubPointerRef.current !== event.pointerId) return;
    queueScrubUpdate(event.clientX);
  };

  const endScrub = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (scrubPointerRef.current !== event.pointerId) return;
    setIsScrubbing(false);
    scrubPointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const lockNotice = scene === "locked" ? "Bạn đã rút lì xì trong 24 giờ qua." : "";
  const isRevealDialogOpen =
    selectedCardId !== null && (scene === "revealing" || scene === "result" || scene === "locked");
  const amountToShow = revealedAmount ?? drawRecord?.amount ?? null;

  return (
    <main className="festive-backdrop min-h-screen px-4 py-6">
      <section className="app-shell mx-auto flex min-h-[92vh] w-full max-w-[420px] flex-col justify-center">
        <div className="relative overflow-hidden rounded-[30px] border border-[#f0d8a8] bg-[linear-gradient(180deg,rgba(255,248,231,0.94)_0%,rgba(255,239,214,0.92)_100%)] p-5 shadow-[0_20px_46px_rgba(82,46,24,0.2)]">
          <div className="pointer-events-none absolute -left-14 -top-14 h-36 w-36 rounded-full bg-[#d2a44a]/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-10 h-28 w-28 rounded-full bg-[#8f1d20]/20 blur-2xl" />

          <header className="relative z-10 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9f262b]">Rút Lì Xì 2026</p>
            <h1 className="mt-2 text-[1.9rem] leading-tight text-[#63181b]">Chọn một lá thật may</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#7b5838]">
              Trộn bài, xòe quạt theo cung và vuốt chọn lá bạn thấy hợp nhất.
            </p>
          </header>

          <div className="relative mt-6 rounded-3xl border border-[#f0dcaf] bg-white/55 px-3 pb-6 pt-8">
            <div
              ref={fanRef}
              className="relative mx-auto h-[320px] w-full max-w-[360px] touch-none select-none"
              onPointerDown={handleFanPointerDown}
              onPointerMove={handleFanPointerMove}
              onPointerUp={endScrub}
              onPointerCancel={endScrub}
            >
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0"
                style={{
                  transform: `translate(-50%, -50%) scale(${fanLayout.scale})`,
                  transformOrigin: "center center"
                }}
              >
                {cardOrder.map((cardId, slotIndex) => {
                  const fanMotion = buildFanMotion(slotIndex, fanLayout, cardCount);
                  const slotNormalized = cardCount > 1 ? (slotIndex / (cardCount - 1)) * 2 - 1 : 0;
                  const splitXMax = clamp(stageSize.width * 0.32, 72, 180);
                  const splitMotion: MotionState = {
                    x: slotNormalized * splitXMax + ((cardId % 3) - 1) * 7,
                    y: -18 + Math.abs(slotNormalized) * 18 + (cardId % 3) * 2,
                    rotate: slotNormalized * 14 + ((cardId % 5) - 2) * 1.8,
                    scale: 1,
                    opacity: 1
                  };

                  const destinationSlot = destinationIndexByCard.get(cardId) ?? slotIndex;
                  const laneOffset = destinationSlot - centerIndex;
                  const laneNormalized = centerIndex > 0 ? laneOffset / centerIndex : 0;
                  const crossXMax = clamp(stageSize.width * 0.38, 84, 210);
                  const crossMotion: MotionState = {
                    x: laneNormalized * crossXMax,
                    y: -24 + Math.abs(laneNormalized) * 18,
                    rotate: laneNormalized * 16,
                    scale: 1,
                    opacity: 1
                  };

                  const stackStep = clamp(4 / cardCount, 0.08, 0.28);
                  const stackMotion: MotionState = {
                    x: 0,
                    y: slotIndex * stackStep,
                    rotate: (slotIndex - centerIndex) * 0.32,
                    scale: 1,
                    opacity: 1
                  };

                  const gatherMotion: MotionState = {
                    x: 0,
                    y: slotIndex * stackStep,
                    rotate: 0,
                    scale: 1,
                    opacity: 1
                  };

                  const isHighlighted = scene === "fan" && highlightedIndex === slotIndex;
                  const hideSource = scene !== "fan" && selectedCardId === cardId;
                  if (hideSource) return null;

                  let motionTarget: MotionState = fanMotion;
                  if (scene === "stack") motionTarget = stackMotion;
                  if (scene === "shuffle" && shufflePhase === "split") motionTarget = splitMotion;
                  if (scene === "shuffle" && shufflePhase === "cross") motionTarget = crossMotion;
                  if (scene === "shuffle" && shufflePhase === "gather") motionTarget = gatherMotion;

                  if (scene === "fan") {
                    motionTarget = {
                      ...fanMotion,
                      y: isHighlighted ? fanMotion.y - 24 : fanMotion.y,
                      scale: isHighlighted ? 1.05 : 1,
                      opacity: 1
                    };
                  }

                  const baseZ = 1000 + slotIndex;
                  const crossZ = 900 - Math.abs(destinationSlot - centerIndex);
                  const zIndex =
                    isHighlighted ? 3000 : scene === "shuffle" && shufflePhase === "cross" ? crossZ : baseZ;

                  return (
                    <motion.button
                      key={`card-${cardId}`}
                      type="button"
                      onClick={() => {
                        if (scene !== "fan" || remainingTotal <= 0) return;
                        if (swipeConsumedRef.current) {
                          swipeConsumedRef.current = false;
                          return;
                        }
                        if (highlightedIndex !== slotIndex) {
                          setHighlightedIndex(slotIndex);
                          return;
                        }
                        void confirmSelection(slotIndex);
                      }}
                      onPointerDown={(event) => {
                        if (scene !== "fan" || highlightedIndex !== slotIndex) return;
                        swipeStartYRef.current = event.clientY;
                        swipeConsumedRef.current = false;
                      }}
                      onPointerUp={(event) => {
                        if (scene !== "fan" || highlightedIndex !== slotIndex) return;
                        if (swipeStartYRef.current === null) return;
                        const deltaY = event.clientY - swipeStartYRef.current;
                        swipeStartYRef.current = null;
                        if (deltaY < -40) {
                          swipeConsumedRef.current = true;
                          void confirmSelection(slotIndex);
                        }
                      }}
                      className="pointer-events-auto absolute left-0 top-0 h-[192px] w-[108px] rounded-[24px] outline-none"
                      style={{ zIndex, left: -CARD_HALF_WIDTH, top: -CARD_HALF_HEIGHT }}
                      animate={motionTarget}
                      transition={{
                        duration:
                          scene === "shuffle" && shufflePhase === "split"
                            ? 0.46
                            : scene === "shuffle" && shufflePhase === "cross"
                              ? 0.52
                              : scene === "shuffle" && shufflePhase === "gather"
                                ? 0.42
                                : 0.28,
                        ease: [0.2, 0.86, 0.24, 1]
                      }}
                    >
                      <LixiCardFront index={cardId} />
                    </motion.button>
                  );
                })}

              </div>
            </div>

            {scene === "fan" && (
              <div className="mt-2 text-center">
                <p className="text-xs text-[#8a6338]">Vuốt ngang để rê chọn, vuốt lên để chốt nhanh.</p>
                <button
                  type="button"
                  onClick={() => {
                    if (highlightedIndex === null) return;
                    void confirmSelection(highlightedIndex);
                  }}
                  disabled={isDrawing || remainingTotal <= 0 || highlightedIndex === null}
                  className="cta-press mt-3 rounded-xl bg-gradient-to-r from-[#a0282d] to-[#7f191c] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#fff4dc] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDrawing ? "Đang rút..." : "Chọn lá này"}
                </button>
              </div>
            )}

            {!isRevealDialogOpen && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-[#d8af67] bg-white/75 px-4 py-2 text-sm font-medium text-[#7b4a2e] transition-colors hover:bg-[#fff2d7]"
                >
                  Chơi lại
                </button>
              </div>
            )}

            {(scene === "locked" || scene === "exhausted" || drawError || remainingTotal <= 0) && (
              <p className="mt-4 text-center text-sm text-[#9f262b]">
                {scene === "exhausted" || remainingTotal <= 0
                  ? "Hết lì xì rồi, quay lại sau nhé."
                  : lockNotice || drawError}
              </p>
            )}
          </div>

          <footer className="mt-4 rounded-2xl border border-[#f0dcaf] bg-white/50 px-3 py-3 text-center text-sm text-[#7b5b3b]">
            <p>
              Số lì xì còn lại <span className="font-semibold text-[#65161a]">{remainingTotal}</span>
            </p>
            
          </footer>
        </div>
      </section>

      <AnimatePresence>
        {isRevealDialogOpen && selectedCardId !== null && (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/78 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative h-full w-full overflow-hidden bg-[linear-gradient(180deg,rgba(43,27,17,0.84)_0%,rgba(22,12,8,0.92)_100%)]"
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.99 }}
              transition={{ duration: 0.28, ease: [0.2, 0.9, 0.2, 1] }}
            >
              {showConfetti && <ConfettiBurst seed={confettiSeed} />}

              <motion.div
                className="pointer-events-none absolute left-1/2 top-[48%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full"
                animate={{ opacity: [0.3, 0.78, 0.34], scale: [0.92, 1.08, 0.96] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.6, ease: "easeInOut" }}
                style={{
                  background:
                    "radial-gradient(circle, rgba(232,188,103,0.58) 0%, rgba(232,188,103,0.2) 45%, rgba(232,188,103,0) 75%)"
                }}
              />

              <div className="pointer-events-none absolute inset-0">
                {Array.from({ length: 8 }).map((_, index) => {
                  const angle = (index / 8) * Math.PI * 2;
                  const x = Math.round(Math.cos(angle) * 94);
                  const y = Math.round(Math.sin(angle) * 94);
                  return (
                    <motion.span
                      key={`shine-${index}`}
                      className="absolute h-1.5 w-1.5 rounded-full bg-[#f5cf83]"
                      style={{ left: `calc(50% + ${x}px)`, top: `calc(46% + ${y}px)` }}
                      animate={{ opacity: [0.25, 1, 0.3], scale: [0.7, 1.2, 0.75] }}
                      transition={{
                        repeat: Number.POSITIVE_INFINITY,
                        duration: 1 + index * 0.06,
                        delay: index * 0.05
                      }}
                    />
                  );
                })}
              </div>

              <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
                <motion.div
                  className="relative h-[208px] w-[118px]"
                  animate={{
                    scale: revealStage === "fly" ? 1.08 : revealStage === "flip" ? 1.24 : 1.26,
                    rotateZ: revealStage === "fly" ? -2 : revealStage === "flip" ? 1.5 : 0
                  }}
                  transition={{ duration: 0.34, ease: [0.25, 0.9, 0.2, 1] }}
                >
                  <motion.div
                    className="relative h-full w-full"
                    animate={{
                      rotateY: revealStage === "flip" || revealStage === "done" || scene === "result" ? 180 : 0
                    }}
                    transition={{ duration: 0.54, ease: [0.23, 0.83, 0.23, 1] }}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <div className="absolute inset-0 [backface-visibility:hidden]">
                      <LixiCardFront index={selectedCardId} />
                    </div>
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      <LixiCardBack amount={scene === "result" || revealStage === "done" ? amountToShow : null} />
                    </div>
                  </motion.div>
                </motion.div>

                <div className="mt-5 min-h-[72px]">
                  {scene === "revealing" && (
                    <p className="text-sm tracking-[0.08em] text-[#f3dba7]">Đang mở lì xì...</p>
                  )}
                  {(scene === "result" || scene === "locked") && amountToShow !== null && (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f5cf83] mt-5">Bạn nhận được</p>
                      <p className="mt-1 text-[2.1rem] font-semibold text-[#fff3d6]">
                        <AmountCounter value={amountToShow} durationMs={amountDuration} />
                      </p>
                    </>
                  )}
                </div>
              </div>

              {scene === "result" && (
                <div
                  className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 px-4 pb-6"
                  style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
                >
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-lg border border-[#d8af67] bg-white/80 px-4 py-2 text-sm font-medium text-[#7b4a2e]"
                  >
                    Chơi lại
                  </button>
                  {remainingTotal > 0 && (
                    <button
                      type="button"
                      onClick={handlePlayContinue}
                      className="rounded-lg border border-[#9f262b] bg-[#9f262b] px-4 py-2 text-sm font-medium text-[#fff4dc]"
                    >
                      Chơi tiếp
                    </button>
                  )}
                </div>
              )}

              {scene === "locked" && (
                <div
                  className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center px-4 pb-6"
                  style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIndex(null);
                      setRevealStage("fly");
                      setScene("fan");
                    }}
                    className="rounded-lg border border-[#d8af67] bg-white/80 px-4 py-2 text-sm font-medium text-[#7b4a2e]"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
