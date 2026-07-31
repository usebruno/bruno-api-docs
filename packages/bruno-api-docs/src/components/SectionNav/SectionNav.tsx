import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Portal } from '../../ui/Portal/Portal';
import { useEscapeKey } from '../../hooks';
import { useDocSections, getScroller } from '../../hooks/useDocSections';
import { scrollBehavior } from '../../utils/motion';
import { StyledWrapper } from './StyledWrapper';

interface SectionNavProps {
  rootRef: RefObject<HTMLElement | null>;
  title: string;
  navKey?: string;
  testId?: string;
}

type EntryKind = 'title' | 'group' | 'section' | 'tab';

interface NavEntry {
  id: string; // '' for the page-title entry
  label: string;
  level: number; // 0 = page title, 1 = section, 2+ = nested group / tab / heading
  kind: EntryKind;
  select: () => void;
}

// Tick width and row indent shrink with depth so the rail reads as a nested outline, clamped so very
// deep markdown headings stay legible.
const TICK_WIDTHS = [100, 80, 62, 52, 45, 40, 36, 33];
const tickWidth = (level: number): string => `${TICK_WIDTHS[Math.min(level, TICK_WIDTHS.length - 1)]}%`;
const rowIndent = (level: number): string => `${0.5 + Math.min(level, 7) * 0.4}rem`;

// The docs column's outer padding collapses at its `@container docs (max-width: 768px)` breakpoint,
// leaving no gutter — below it the rail hides rather than overlapping the content.
const DOCS_MIN_WIDTH = 768;
// The rail's fixed top (`top: 5rem`) plus a small gap; its height is capped at the docs area's
// bottom minus this so it clips at, rather than draws over, a bottom-docked playground.
const RAIL_TOP_PX = 88;
// Below this remaining height the rail hides entirely rather than show a cramped/overlapping sliver.
const MIN_RAIL_HEIGHT = 24;

// Keep a mouse press from focusing a button (so clicking a tick jumps without leaving the popup open).
const preventFocusSteal = (event: React.MouseEvent): void => event.preventDefault();

// Reveal a jump target inside collapsed chrome: expand the nearest collapsible Section and/or "view
// more" block above `el`. Clipped elements keep their layout position, so callers can scroll straight after.
const expandCollapsibleFor = (el: HTMLElement): void => {
  const sectionToggle = el
    .closest<HTMLElement>('.section--collapsible')
    ?.querySelector<HTMLElement>(':scope > .section-head .section-toggle');
  if (sectionToggle?.getAttribute('aria-expanded') === 'false') sectionToggle.click();

  const viewMoreToggle = el
    .closest<HTMLElement>('.view-more')
    ?.querySelector<HTMLElement>(':scope > .view-more-toggle');
  if (viewMoreToggle?.getAttribute('aria-expanded') === 'false') viewMoreToggle.click();
};

export const SectionNav: React.FC<SectionNavProps> = ({ rootRef, title, navKey, testId = 'section-nav' }) => {
  const { sections, activeId, selectSection } = useDocSections(rootRef, navKey);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  // The entry that holds keyboard focus (drives the popup highlight) and the rail's roving tab stop.
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [rovingIndex, setRovingIndex] = useState(0);
  // Escape dismisses the popup without moving focus; a fresh hover/focus re-arms it.
  const [escDismissed, setEscDismissed] = useState(false);
  const open = (hovering || focused) && !escDismissed;

  // The rail hangs off the docs column's right edge, capped to its height. All three are measured
  // from the docs scroll area so the rail tracks the playground drawer as it opens/resizes.
  const [rightOffset, setRightOffset] = useState(0);
  const [tooNarrow, setTooNarrow] = useState(false);
  const [mapMaxHeight, setMapMaxHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    const docsColumn = rootRef.current?.closest<HTMLElement>('.appshell-body');
    const measure = () => {
      const { innerWidth, innerHeight } = window;
      const rect = docsColumn?.getBoundingClientRect();
      setRightOffset(Math.max(0, Math.round(innerWidth - (rect?.right ?? innerWidth))));
      setTooNarrow((rect?.width ?? innerWidth) <= DOCS_MIN_WIDTH);
      setMapMaxHeight(Math.max(0, Math.round((rect?.bottom ?? innerHeight) - RAIL_TOP_PX)));
    };
    measure();
    window.addEventListener('resize', measure);
    let observer: ResizeObserver | undefined;
    if (docsColumn && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(docsColumn);
    }
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [rootRef, navKey]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const close = useCallback(() => setEscDismissed(true), []);
  useEscapeKey(close, open);

  const openOnHover = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setEscDismissed(false);
    setHovering(true);
  }, []);
  const closeOnLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setHovering(false), 200);
  }, []);

  const scrollToTop = useCallback(() => {
    (getScroller() ?? window).scrollTo({ top: 0, behavior: scrollBehavior() });
  }, []);

  const scrollTo = useCallback((el: HTMLElement) => {
    el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  }, []);

  // The page title is the first entry (level 0) and scrolls to the top. Sections sharing a `group`
  // get one synthetic parent header, inserted before the first member.
  const entries = useMemo<NavEntry[]>(() => {
    const list: NavEntry[] = [
      { id: '', label: title, level: 0, kind: 'title', select: () => { selectSection(null); scrollToTop(); } }
    ];
    const seenGroups = new Set<string>();
    for (const section of sections) {
      const group = section.group ?? null;
      if (group && !seenGroups.has(group)) {
        seenGroups.add(group);
        const groupId = `group-${group}`;
        const firstEl = section.el;
        list.push({
          id: groupId,
          label: group,
          level: Math.max(0, section.level - 1),
          kind: 'group',
          select: () => {
            selectSection(groupId);
            expandCollapsibleFor(firstEl);
            scrollTo(firstEl);
          }
        });
      }
      list.push({
        id: section.id,
        label: section.label,
        level: section.level,
        kind: section.activate ? 'tab' : 'section',
        select: () => {
          selectSection(section.id);
          expandCollapsibleFor(section.el);
          if (section.activate) {
            // A tab: switch to it, then bring its host section into view.
            section.el.click();
            const host = section.el.closest<HTMLElement>('[data-nav-section]:not([data-nav-activate])');
            scrollTo(host ?? section.el);
          } else {
            scrollTo(section.el);
          }
        }
      });
    }
    return list;
  }, [title, sections, selectSection, scrollToTop, scrollTo]);

  // A group highlights only when it was picked directly, never because a member is the active section.
  const isActiveEntry = useCallback(
    (entry: NavEntry): boolean => (entry.kind === 'title' ? activeId === null : activeId === entry.id),
    [activeId]
  );

  const focusTick = useCallback((index: number) => {
    const ticks = wrapperRef.current?.querySelectorAll<HTMLButtonElement>('.section-nav-item');
    const count = ticks?.length ?? 0;
    if (!count) return;
    const clamped = Math.max(0, Math.min(index, count - 1));
    setRovingIndex(clamped);
    ticks?.[clamped]?.focus();
  }, []);

  const onTickKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') focusTick(index + 1);
    else if (event.key === 'ArrowUp') focusTick(index - 1);
    else if (event.key === 'Home') focusTick(0);
    else if (event.key === 'End') focusTick(entries.length - 1);
    else return;
    event.preventDefault();
  };

  // Nothing to navigate but the page title, no side gutter in the docs column, or too little height
  // above a bottom-docked playground — don't show the rail at all.
  if (
    sections.length === 0
    || tooNarrow
    || (mapMaxHeight !== undefined && mapMaxHeight < MIN_RAIL_HEIGHT)
  ) {
    return null;
  }

  const tabStop = Math.min(rovingIndex, Math.max(0, entries.length - 1));

  return (
    <Portal>
      <StyledWrapper
        ref={wrapperRef}
        role="navigation"
        aria-label={`On this page: ${title}`}
        className={open ? 'section-nav section-nav--open' : 'section-nav'}
        style={{ right: `${rightOffset}px` }}
        data-testid={testId}
        onMouseEnter={openOnHover}
        onMouseLeave={closeOnLeave}
        onBlur={(event) => {
          if (!wrapperRef.current?.contains(event.relatedTarget as Node)) {
            setFocused(false);
            setFocusedId(null);
          }
        }}
      >
        <div
          className="section-nav-map"
          style={{ maxHeight: mapMaxHeight != null ? `${mapMaxHeight}px` : undefined }}
          data-testid={`${testId}-rail`}
        >
          {entries.map((entry, index) => (
            <button
              key={entry.id || 'top'}
              type="button"
              className={[
                'section-nav-item',
                entry.kind === 'title' ? 'section-nav-item--title' : '',
                entry.kind === 'group' ? 'section-nav-item--group' : '',
                isActiveEntry(entry) ? 'is-active' : '',
                entry.id === focusedId ? 'is-focused' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                '--nav-indent': rowIndent(entry.level),
                'fontSize': entry.level >= 2 ? '0.75rem' : undefined
              } as React.CSSProperties}
              aria-current={isActiveEntry(entry) ? 'location' : undefined}
              tabIndex={index === tabStop ? 0 : -1}
              onMouseDown={preventFocusSteal}
              onClick={entry.select}
              onFocus={() => {
                setFocused(true);
                setFocusedId(entry.id);
                setRovingIndex(index);
                setEscDismissed(false);
              }}
              onKeyDown={(event) => onTickKeyDown(event, index)}
              data-testid={`${testId}-item`}
            >
              <span className="section-nav-item-text">{entry.label}</span>
              <span className="section-nav-tick-slot" aria-hidden="true">
                <span className="section-nav-tick" style={{ width: tickWidth(entry.level) }} />
              </span>
            </button>
          ))}
        </div>
      </StyledWrapper>
    </Portal>
  );
};

export default SectionNav;
