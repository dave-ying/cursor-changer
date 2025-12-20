export function clampToTargetSize(value: number, targetSize: number) {
  return Math.max(0, Math.min(targetSize - 1, value));
}
