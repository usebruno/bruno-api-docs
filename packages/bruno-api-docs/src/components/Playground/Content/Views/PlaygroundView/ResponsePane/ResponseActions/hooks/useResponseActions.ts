import { useCallback, useRef, useState } from 'react';

export default function useResponseActions() {
  const [actionsExpandedWidth, setActionsExpandedWidth] = useState<number>();
  const actionsMeasureObserver = useRef<ResizeObserver | null>(null);
  // Track the rendered width of a hidden expanded copy of the actions so the tab bar always has an
  // up-to-date figure (it shifts with theme/font, not just at mount) without hardcoding a constant.
  // The node is a measurement-only copy, so mark it inert to keep it out of focus/pointer/a11y —
  // set imperatively because React 18 doesn't pass the `inert` prop through (see ExampleCard).
  const measureActions = useCallback((node: HTMLDivElement | null) => {
    actionsMeasureObserver.current?.disconnect();
    if (!node) return;
    if (typeof ResizeObserver === 'undefined') return;
    const update = () => setActionsExpandedWidth(node.offsetWidth || undefined);
    update();
    actionsMeasureObserver.current = new ResizeObserver(update);
    actionsMeasureObserver.current.observe(node);
  }, []);

  return { actionsExpandedWidth, measureActions };
}
