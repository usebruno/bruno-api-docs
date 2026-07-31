import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface DocSection {
  id: string;
  label: string;
  level: number;
  el: HTMLElement;
  activate: boolean;
  group?: string;
}

export const SECTION_SCROLL_OFFSET = 88;

/** The docs scroll container. Fixed and known (the AppShell `<main>`), so no ancestor walk. */
export const getScroller = (): HTMLElement | null => document.querySelector<HTMLElement>('.appshell-content');

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

/**
 * Read the sections a page exposes into an ordered list. Two kinds of markers are collected, in
 * document (visual) order:
 *  - `[data-nav-section]` — an explicit Section/config group; `data-nav-level` sets its depth.
 *  - `[data-nav-headings]` — a rendered-markdown container whose `h1`–`h6` become entries. Each
 *    heading's depth is the container's `data-nav-level` base plus its heading rank (h1 = +0),
 *    so a Notion-style outline nests under the doc section that hosts it.
 * Pure and DOM-only (no React) so it can be unit-tested against a plain element tree.
 */
export const collectSections = (root: HTMLElement | null): DocSection[] => {
  if (!root) return [];
  const result: DocSection[] = [];
  let index = 0;
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-nav-section], [data-nav-headings]'))) {
    if (el.getAttribute('data-nav-headings') != null) {
      const base = Number(el.getAttribute('data-nav-level')) || 1;
      for (const heading of Array.from(el.querySelectorAll<HTMLElement>(HEADING_SELECTOR))) {
        const label = (heading.textContent || '').trim();
        if (!label) continue;
        const rank = Number(heading.tagName.charAt(1)) || 1;
        result.push({ id: `${slugify(label) || 'heading'}-${index}`, label, level: base + (rank - 1), el: heading, activate: false });
        index += 1;
      }
      continue;
    }
    const label = (el.getAttribute('data-nav-section') || '').trim();
    if (!label) continue;
    const level = Number(el.getAttribute('data-nav-level')) || 1;
    const activate = el.getAttribute('data-nav-activate') != null;
    const group = el.getAttribute('data-nav-group')?.trim() || undefined;
    result.push({ id: `${slugify(label) || 'section'}-${index}`, label, level, el, activate, group });
    index += 1;
  }
  return result;
};

/**
 * Collect a page's `[data-nav-section]` elements and track which one is currently in
 * view. Re-scans when `navKey` changes (a new page mounts) and when the page's content
 * mutates (docs render async, sections toggle). `activeId` is the last section whose top
 * has scrolled past the offset line, or `null` while the reader is still above the first
 * section (i.e. at the page top). SSR-safe: returns empty/null until a browser runs the
 * effects. The scroll listener is capturing so it catches whichever ancestor scrolls.
 */
export const useDocSections = (
  rootRef: RefObject<HTMLElement | null>,
  navKey?: string
): { sections: DocSection[]; activeId: string | null; selectSection: (id: string | null) => void } => {
  const [sections, setSections] = useState<DocSection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // A click sets the active section directly and locks the scroll-spy until the smooth scroll
  // settles (a `scrollend`), so the highlight doesn't flicker through the sections it passes on
  // the way. The timestamp is only a safety cap, for when no scroll happens (the target is
  // already in view) or the browser doesn't fire `scrollend`.
  const spyLockUntil = useRef(0);

  const selectSection = useCallback((id: string | null) => {
    setActiveId(id);
    spyLockUntil.current = Date.now() + 1500;
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      setSections([]);
      return;
    }
    // Skip state churn when a mutation leaves the section list unchanged (a collapse
    // animating, a code block painting); only the labels and levels matter here.
    let signature: string | null = null;
    const rescan = () => {
      const next = collectSections(root);
      const nextSignature = next
        .map((section) => `${section.level}:${section.group ?? ''}:${section.label}`)
        .join('|');
      if (nextSignature === signature) return;
      signature = nextSignature;
      setSections(next);
    };
    rescan();
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(rescan);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [rootRef, navKey]);

  useEffect(() => {
    if (!sections.length) {
      setActiveId(null);
      return;
    }

    // A jumped-to section lands SECTION_SCROLL_OFFSET below the scroll viewport's top edge (its
    // scroll-margin-top). Measuring the trigger line from that same edge — not the window's — keeps
    // the jumped-to section active regardless of a sticky topbar's height. `active` is the last
    // section whose heading has crossed it.
    const scroller = getScroller();
    let frame = 0;
    const recompute = () => {
      frame = 0;
      if (Date.now() < spyLockUntil.current) return;
      const viewportTop = scroller ? scroller.getBoundingClientRect().top : 0;
      const triggerLine = viewportTop + SECTION_SCROLL_OFFSET + 8;
      let active: string | null = null;
      let activeSection: DocSection | undefined;
      for (const section of sections) {
        if (section.activate) continue;
        if (section.el.getBoundingClientRect().top <= triggerLine) {
          active = section.id;
          activeSection = section;
        } else {
          break;
        }
      }
      // When the active section hosts tabs (e.g. Execution Context), highlight the tab that is
      // actually open rather than the section itself — but only while that section is expanded,
      // so a collapsed section stays highlighted on itself rather than on a hidden tab.
      if (activeSection) {
        const collapsed = activeSection.el.querySelector(
          ':scope > .section-head .section-toggle[aria-expanded="false"]'
        );
        if (!collapsed) {
          const openTab = sections.find(
            (section) =>
              section.activate
              && activeSection!.el.contains(section.el)
              && section.el.getAttribute('aria-selected') === 'true'
          );
          if (openTab) active = openTab.id;
        }
      }
      setActiveId(active);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(recompute);
    };
    const onScrollEnd = () => {
      spyLockUntil.current = 0;
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    recompute();
    // Capture phase so a scroll inside a nested overflow container is still seen.
    document.addEventListener('scroll', onScroll, true);
    document.addEventListener('scrollend', onScrollEnd, true);
    window.addEventListener('resize', onScroll);
    // Re-run when a hosted tab is switched via the page's own tab UI (an aria-selected flip),
    // so the reflected tab highlight doesn't go stale until the next scroll.
    let tabObserver: MutationObserver | undefined;
    const attrRoot = rootRef.current;
    if (typeof MutationObserver !== 'undefined' && attrRoot) {
      tabObserver = new MutationObserver(onScroll);
      tabObserver.observe(attrRoot, { attributes: true, subtree: true, attributeFilter: ['aria-selected'] });
    }
    return () => {
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('scrollend', onScrollEnd, true);
      window.removeEventListener('resize', onScroll);
      tabObserver?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sections, rootRef]);

  return { sections, activeId, selectSection };
};
