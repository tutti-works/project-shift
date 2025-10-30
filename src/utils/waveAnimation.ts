const TOTAL_UNITS = 51;
const CENTER_INDEX = 25;

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(Math.max(value, min), max);

const easeSine = (t: number) => Math.sin((t * Math.PI) / 2);

/**
 * Calculates per-instance bend amount for a travelling sine wave.
 *
 * Requirements:
 * - At scrollProgress=0.5 (animation 50%), ALL units should be at maximum bend (1.0)
 * - At scrollProgress=1.0 (animation 100%), ALL units should be vertical (0.0)
 * - Wave propagates from center outward (Phase 1) and end to start (Phase 2)
 *
 * Key insight: We need the wave to START with delay, but FINISH simultaneously.
 * This means we scale the progress differently based on distance.
 */
export const getBendAmount = (
  unitIndex: number,
  scrollProgress: number,
): number => {
  const clampedIndex = clamp(Math.floor(unitIndex), 0, TOTAL_UNITS - 1);
  const clampedProgress = clamp(scrollProgress);

  if (clampedProgress <= 0.5) {
    // Phase 1: Bend from center outward (0% → 50%)
    const phase1Progress = clampedProgress * 2; // 0.0 → 1.0
    const distanceFromCenter = Math.abs(clampedIndex - CENTER_INDEX);
    const normalizedDistance = distanceFromCenter / CENTER_INDEX; // 0.0 (center) → 1.0 (edge)

    // Delay factor: how much later distant units start
    // We want all units to finish at progress=1.0, so we compress the timeline
    const delayFactor = 0.3; // Reduced from 0.5 to ensure completion
    const startDelay = normalizedDistance * delayFactor;

    // Each unit has less time to complete, so we scale progress
    const availableProgress = 1.0 - startDelay;
    const localProgress = (phase1Progress - startDelay) / availableProgress;

    const waveHead = clamp(localProgress, 0, 1);
    return easeSine(waveHead);
  }

  // Phase 2: Return from end to start (50% → 100%)
  const phase2Progress = (clampedProgress - 0.5) * 2; // 0.0 → 1.0
  const distanceFromEnd = TOTAL_UNITS - 1 - clampedIndex;
  const normalizedDistance = distanceFromEnd / (TOTAL_UNITS - 1); // 0.0 (end) → 1.0 (start)

  const delayFactor = 0.3;
  const startDelay = normalizedDistance * delayFactor;
  const availableProgress = 1.0 - startDelay;
  const localProgress = (phase2Progress - startDelay) / availableProgress;

  const waveHead = clamp(localProgress, 0, 1);
  return clamp(1 - easeSine(waveHead));
};

