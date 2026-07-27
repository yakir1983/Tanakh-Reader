/**
 * useGestures — attaches swipe gesture handlers to a DOM element.
 *
 * Swipe (1 finger, horizontal):
 *   - swipe right → onSwipeRight (prev verse in RTL layout)
 *   - swipe left  → onSwipeLeft  (next verse in RTL layout)
 *
 * Vertical scroll is never blocked.
 */

import { useEffect, useRef, useCallback } from 'react';

interface GestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Minimum horizontal distance (px) before a swipe fires. Default: 60 */
  swipeThreshold?: number;
}

export function useGestures<T extends HTMLElement = HTMLDivElement>({
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 60,
}: GestureOptions) {
  const ref = useRef<T>(null);

  const swipeLeft  = useCallback(() => onSwipeLeft?.(),  [onSwipeLeft]);
  const swipeRight = useCallback(() => onSwipeRight?.(), [onSwipeRight]);

  const startX = useRef(0);
  const startY = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    };

    const onEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (Math.abs(dx) < swipeThreshold || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) swipeLeft();
      else swipeRight();
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend',   onEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend',   onEnd);
    };
  }, [swipeLeft, swipeRight, swipeThreshold]);

  return ref;
}
