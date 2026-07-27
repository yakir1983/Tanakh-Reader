/**
 * useGestures — attaches touch gesture handlers to a DOM element.
 *
 * Swipe (1 finger, horizontal):
 *   - swipe right → onSwipeRight (prev verse in RTL layout)
 *   - swipe left  → onSwipeLeft  (next verse in RTL layout)
 *
 * Pinch (2 fingers):
 *   - spread → onPinchZoom(+delta)  (zoom in)
 *   - pinch  → onPinchZoom(-delta)  (zoom out)
 *
 * Vertical scroll is never blocked.
 */

import { useEffect, useRef, useCallback } from 'react';

interface GestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Called with accumulated pixel delta; positive = fingers spreading (zoom in). */
  onPinchZoom?: (delta: number) => void;
  /** Minimum horizontal distance (px) before a swipe fires. Default: 60 */
  swipeThreshold?: number;
  /** Minimum pinch accumulation (px) before onPinchZoom fires. Default: 18 */
  pinchStep?: number;
}

function dist(a: Touch, b: Touch) {
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}

export function useGestures<T extends HTMLElement = HTMLDivElement>({
  onSwipeLeft,
  onSwipeRight,
  onPinchZoom,
  swipeThreshold = 60,
  pinchStep = 18,
}: GestureOptions) {
  const ref = useRef<T>(null);

  // Stable callbacks so the effect doesn't re-run on every render
  const swipeLeft  = useCallback(() => onSwipeLeft?.(),  [onSwipeLeft]);
  const swipeRight = useCallback(() => onSwipeRight?.(), [onSwipeRight]);

  // Internal state stored in a ref to avoid stale closures
  const state = useRef({
    startX: 0,
    startY: 0,
    isPinching: false,
    pinchDist: 0,
    pinchAccum: 0,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      const s = state.current;
      if (e.touches.length === 1) {
        s.startX   = e.touches[0].clientX;
        s.startY   = e.touches[0].clientY;
        s.isPinching = false;
        s.pinchAccum = 0;
      } else if (e.touches.length === 2) {
        s.isPinching = true;
        s.pinchDist  = dist(e.touches[0], e.touches[1]);
        s.pinchAccum = 0;
      }
    };

    const onMove = (e: TouchEvent) => {
      const s = state.current;
      if (e.touches.length !== 2 || !s.isPinching) return;
      // Block the browser's native pinch-to-zoom so we control it
      e.preventDefault();
      const newDist = dist(e.touches[0], e.touches[1]);
      const delta   = newDist - s.pinchDist;
      s.pinchDist   = newDist;
      s.pinchAccum += delta;

      // Fire in discrete steps so it matches the button behaviour
      if (Math.abs(s.pinchAccum) >= pinchStep) {
        onPinchZoom?.(s.pinchAccum);
        s.pinchAccum = 0;
      }
    };

    const onEnd = (e: TouchEvent) => {
      const s = state.current;
      if (s.isPinching) {
        // Any remaining accumulated delta
        if (Math.abs(s.pinchAccum) >= pinchStep / 2) {
          onPinchZoom?.(s.pinchAccum);
        }
        s.isPinching = false;
        s.pinchAccum = 0;
        return;
      }
      if (e.changedTouches.length !== 1) return;
      const dx = e.changedTouches[0].clientX - s.startX;
      const dy = e.changedTouches[0].clientY - s.startY;
      // Only fire if horizontal movement dominates and exceeds threshold
      if (Math.abs(dx) < swipeThreshold || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) swipeLeft();
      else swipeRight();
    };

    el.addEventListener('touchstart', onStart,  { passive: true });
    el.addEventListener('touchmove',  onMove,   { passive: false }); // must be non-passive to preventDefault
    el.addEventListener('touchend',   onEnd,    { passive: true });

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  }, [swipeLeft, swipeRight, onPinchZoom, swipeThreshold, pinchStep]);

  return ref;
}
