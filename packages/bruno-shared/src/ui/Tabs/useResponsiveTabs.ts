import { useCallback, useEffect, useRef, useState } from 'react';

// Width (px) reserved for the trailing "⋯ more" dropdown trigger, and a small
// per-tab allowance so a tab that sits right on the boundary overflows rather
// than getting clipped. Mirrors the spacing used by Bruno's ResponsiveTabs.
const MORE_TRIGGER_RESERVE = 40;
const PER_TAB_ALLOWANCE = 16;
const RIGHT_CONTENT_GAP = 16;
const EXPANDABLE_HYSTERESIS = 20;

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
  /** True when the right-content slot has room to render its expanded (inline) form. */
  rightSideExpandable: boolean;
}

/**
 * Splits a set of tabs into those that fit the container and those that overflow
 * into a dropdown — the responsive behaviour of Bruno's `ResponsiveTabs`. Tabs are
 * measured from hidden copies (their natural width), so the split reflects real
 * rendered sizes. The active tab is always kept visible. SSR-safe: with no layout
 * yet (server render / first paint) every tab is reported visible, so markup and
 * unit tests still see the full set until the client measures.
 */
export const useResponsiveTabs = (
  ids: string[],
  activeId: string,
  enabled: boolean,
  rightContentExpandedWidth?: number
): ResponsiveTabsLayout => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const measureRefs = useRef<Record<string, HTMLElement | null>>({});
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const [visibleIds, setVisibleIds] = useState<string[]>(ids);
  const [overflowIds, setOverflowIds] = useState<string[]>([]);
  const [rightSideExpandable, setRightSideExpandable] = useState(false);

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

    // Not laid out yet (SSR / first paint) — keep everything visible rather than hiding all.
    if (container.offsetWidth === 0) {
      setVisibleIds((prev) => (sameOrder(prev, currentIds) ? prev : currentIds));
      setOverflowIds((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const rightEl = rightRef.current;
    let rightWidth = rightEl?.offsetWidth ?? 0;
    let rightModeled = false;
    if (rightContentExpandedWidth != null && rightEl != null && rightEl.children.length > 0) {
      // The trailing child (e.g. an actions block) can collapse to a compact form, so its live width
      // understates the space it needs when expanded. Swap only that child's contribution for the
      // supplied expanded width, taken from the slot's real width so inter-child gaps still count.
      const expandable = rightEl.children[rightEl.children.length - 1] as HTMLElement;
      rightWidth = rightEl.offsetWidth - expandable.offsetWidth + rightContentExpandedWidth;
      rightModeled = true;
    }

    const available = container.offsetWidth - rightWidth - MORE_TRIGGER_RESERVE;

    const visible: string[] = [];
    const overflow: string[] = [];
    let used = 0;
    let allTabsWidth = 0;
    for (const id of currentIds) {
      const width = (measureRefs.current[id]?.offsetWidth ?? 80) + PER_TAB_ALLOWANCE;
      allTabsWidth += width;
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

    // Expand the actions inline only when the ENTIRE tab row fits beside the expanded right slot.
    // Keyed to the container width and intrinsic tab widths — never the split's own visible/overflow
    // result — so the decision is fixed per width instead of chasing the overflow it would itself
    // cause. (rightWidth already models the right slot with the actions expanded.)
    if (rightModeled) {
      const needed = allTabsWidth + rightWidth + RIGHT_CONTENT_GAP;
      setRightSideExpandable((prev) =>
        prev ? container.offsetWidth >= needed - EXPANDABLE_HYSTERESIS : container.offsetWidth >= needed
      );
    }
  };

  const idsKey = ids.join(',');

  // Recompute when responsiveness toggles, the tab set changes, the active tab changes, or the
  // supplied right-content expanded width updates. idsKey/activeId are read through refs inside
  // recalcRef, so they are listed here purely to re-run the measurement rather than referenced directly.
  useEffect(() => {
    if (!enabled) {
      setVisibleIds((prev) => (sameOrder(prev, idsRef.current) ? prev : idsRef.current));
      setOverflowIds((prev) => (prev.length === 0 ? prev : []));
      setRightSideExpandable((prev) => (prev ? false : prev));
      return;
    }
    const frame = requestAnimationFrame(() => recalcRef.current());
    return () => cancelAnimationFrame(frame);
  }, [enabled, idsKey, activeId, rightContentExpandedWidth]);

  // Observe only the container — the source of the available-width budget. Deliberately NOT the
  // right slot: its width is subtracted from that budget, but the trailing actions block collapses
  // to a compact menu when space is tight, so observing it turns "collapse changed the width" into a
  // recalc, which can re-decide the collapse, which changes the width again — a feedback loop that
  // thrashes at a boundary. The split still reads the right slot's live width when it runs; it just
  // doesn't re-run because of it. (Mirrors bruno-app's ResponsiveTabs, which observes the container
  // alone.) A container resize or a tab/active change still triggers a fresh measurement.
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
    overflowIds: enabled ? overflowIds : [],
    rightSideExpandable: enabled ? rightSideExpandable : false
  };
};
