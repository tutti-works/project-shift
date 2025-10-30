const TOTAL_UNITS = 51;
const CENTER_INDEX = 25;

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * Calculates per-instance bend amount for a travelling sine wave.
 */
export const getBendAmount = (
  unitIndex: number,
  scrollProgress: number,
  waveSpeed: number = 0.05,
): number => {
  const clampedIndex = Math.max(0, Math.min(TOTAL_UNITS - 1, Math.floor(unitIndex)));
  const clampedProgress = clamp01(scrollProgress);
  const speed = clamp01(waveSpeed);

  if (clampedProgress <= 0.5) {
    const phase1Progress = clampedProgress * 2;
    const distanceFromCenter = Math.abs(clampedIndex - CENTER_INDEX);
    const wavePhase = phase1Progress - distanceFromCenter * speed;
    const bendAmount = Math.sin(wavePhase * Math.PI * 0.5);
    return clamp01(bendAmount);
  }

  const phase2Progress = (clampedProgress - 0.5) * 2;
  const distanceFromEnd = TOTAL_UNITS - 1 - clampedIndex;
  const wavePhase = phase2Progress - distanceFromEnd * speed;
  const bendAmount = 1 - Math.sin(wavePhase * Math.PI * 0.5);
  return clamp01(bendAmount);
};

