import { useCallback, useEffect, useRef, useState } from 'react';

// Width (px) reserved for the trailing "⋯ more" dropdown trigger, and a small
// per-tab allowance so a tab that sits right on the boundary overflows rather
// than getting clipped. Mirrors the spacing used by Bruno's ResponsiveTabs.
const MORE_TRIGGER_RESERVE = 40;
const PER_TAB_ALLOWANCE = 16;

const sameOrder = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export interface ResponsiveTabsLayout {
  /** Attach to a width-constrained ancestor (the tabs wrapper), not the tab row
   *  itself — the row grows to its content, so measuring it would be circular. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Attach to the trailing right-content slot so its width is excluded. */
  rightRef: React.RefObject<HTMLDivElement | null>;
  /** Ref callback for each hidden measurement tab, keyed by tab id. */
  setMeasureRef: (id: string) => (el: HTMLElement | null) => void;
  visibleIds: string[];
  overflowIds: string[];
}

/**
 * Splits a set of tabs into those that fit the container and those that overflow
 * into a dropdown — the responsive behaviour of Bruno's `ResponsiveTabs`. Tabs are
 * measured from hidden copies (their natural width), so the split reflects real
 * rendered sizes. The active tab is always kept visible. SSR-safe: with no layout
 * yet (server render / first paint) every tab is reported visible, so markup and
 * unit tests still see the full set until the client measures.
 */
export const useResponsiveTabs = (ids: string[], activeId: string, enabled: boolean): ResponsiveTabsLayout => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const measureRefs = useRef<Record<string, HTMLElement | null>>({});
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const [visibleIds, setVisibleIds] = useState<string[]>(ids);
  const [overflowIds, setOverflowIds] = useState<string[]>([]);

  const setMeasureRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      measureRefs.current[id] = el;
    },
    []
  );

  // The measurement logic reads live values from refs so it can live in a ref and
  // stay stable — the ResizeObserver below then mounts once instead of churning on
  // every render (the request pane re-renders on each keystroke).
  const recalcRef = useRef<() => void>(() => {});
  recalcRef.current = () => {
    const container = containerRef.current;
    const currentIds = idsRef.current;
    if (!container || currentIds.length === 0) return;

    const rightWidth = rightRef.current?.offsetWidth ?? 0;
    const available = container.offsetWidth - rightWidth - MORE_TRIGGER_RESERVE;
    // Container not laid out yet — keep everything visible rather than hiding all.
    if (available <= 0) {
      setVisibleIds((prev) => (sameOrder(prev, currentIds) ? prev : currentIds));
      setOverflowIds((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const visible: string[] = [];
    const overflow: string[] = [];
    let used = 0;
    for (const id of currentIds) {
      const width = (measureRefs.current[id]?.offsetWidth ?? 80) + PER_TAB_ALLOWANCE;
      if (overflow.length === 0 && used + width <= available) {
        visible.push(id);
        used += width;
      } else {
        overflow.push(id);
      }
    }

    // The active tab must never hide inside the dropdown: promote it, demoting the
    // last otherwise-visible tab to keep the count stable.
    if (overflow.includes(activeId) && !visible.includes(activeId)) {
      overflow.splice(overflow.indexOf(activeId), 1);
      const demoted = visible.pop();
      if (demoted) overflow.unshift(demoted);
      visible.push(activeId);
    }

    setVisibleIds((prev) => (sameOrder(prev, visible) ? prev : visible));
    setOverflowIds((prev) => (sameOrder(prev, overflow) ? prev : overflow));
  };

  const idsKey = ids.join(',');

  // Recompute when responsiveness toggles, the tab set changes, or the active tab
  // changes. idsKey/activeId are read through refs inside recalcRef, so they are
  // listed here purely to re-run the measurement rather than referenced directly.
  useEffect(() => {
    if (!enabled) {
      setVisibleIds((prev) => (sameOrder(prev, idsRef.current) ? prev : idsRef.current));
      setOverflowIds((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    const frame = requestAnimationFrame(() => recalcRef.current());
    return () => cancelAnimationFrame(frame);
  }, [enabled, idsKey, activeId]);

  // Observe the container once per enable so a width change re-runs the split.
  useEffect(() => {
    if (!enabled || typeof ResizeObserver === 'undefined') return;
    const container = containerRef.current;
    if (!container) return;
    let frame: number | null = null;
    const observer = new ResizeObserver(() => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => recalcRef.current());
    });
    observer.observe(container);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [enabled]);

  return {
    containerRef,
    rightRef,
    setMeasureRef,
    visibleIds: enabled ? visibleIds : ids,
    overflowIds: enabled ? overflowIds : []
  };
};
