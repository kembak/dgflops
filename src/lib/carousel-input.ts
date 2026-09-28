/** One step per wheel gesture, with immediate reversal and an idle reset.
 * Pixel, line and page deltas share the same threshold; momentum cannot skip games.
 */
export type WheelGesture = { lastTime: number; total: number; direction: number; consumed: boolean };
export const newWheelGesture = (): WheelGesture => ({ lastTime: -Infinity, total: 0, direction: 0, consumed: false });
export function wheelStep(state: WheelGesture, x: number, y: number, mode: number, time: number): number {
  const raw = Math.abs(x) > Math.abs(y) ? x : y;
  const direction = Math.sign(raw);
  if (!direction) return 0;
  if (time - state.lastTime > 180 || direction !== state.direction) { state.total = 0; state.consumed = false; }
  state.direction = direction; state.lastTime = time;
  if (state.consumed) return 0;
  state.total += Math.min(Math.abs(raw) * (mode === 1 ? 16 : mode === 2 ? 600 : 1), 120);
  if (state.total < 48) return 0;
  state.consumed = true;
  return direction;
}
export function swipeStep(dx: number, dy: number): number {
  return Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.25 ? dx < 0 ? 1 : -1 : 0;
}
