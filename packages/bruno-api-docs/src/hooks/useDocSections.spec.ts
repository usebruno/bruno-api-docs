import { describe, it, expect } from 'vitest';
import { parse } from 'node-html-parser';
import { collectSections } from './useDocSections';

const dom = (html: string) => parse(html) as unknown as HTMLElement;

describe('collectSections (reads a page\'s navigable sections from the DOM)', () => {
  it('lists the marked sections top-to-bottom, keeping each label and depth', () => {
    const root = dom(`
      <div>
        <section data-nav-section="Params" data-nav-level="1"></section>
        <section data-nav-section="Folder Configuration" data-nav-level="1">
          <div data-nav-section="Headers" data-nav-level="2"></div>
          <div data-nav-section="Auth" data-nav-level="2"></div>
        </section>
        <div>not a section</div>
      </div>
    `);

    expect(collectSections(root).map((s) => [s.label, s.level])).toEqual([
      ['Params', 1],
      ['Folder Configuration', 1],
      ['Headers', 2],
      ['Auth', 2]
    ]);
  });

  it('gives every section a stable, unique id from its label and position', () => {
    const root = dom(`
      <div>
        <section data-nav-section="Execution Context" data-nav-level="1"></section>
        <section data-nav-section="Examples" data-nav-level="1"></section>
      </div>
    `);

    expect(collectSections(root).map((s) => s.id)).toEqual(['execution-context-0', 'examples-1']);
  });

  it('treats a section with no depth as level 1 and skips ones with a blank label', () => {
    const root = dom(`
      <div>
        <section data-nav-section="Solo"></section>
        <section data-nav-section="  " data-nav-level="1"></section>
      </div>
    `);

    expect(collectSections(root)).toMatchObject([{ label: 'Solo', level: 1 }]);
  });

  it('records a section\'s group name and whether it is a switchable tab', () => {
    const root = dom(`
      <div>
        <section data-nav-section="Params" data-nav-level="2" data-nav-group="Configuration"></section>
        <section data-nav-section="Auth" data-nav-level="2" data-nav-group="Configuration"></section>
        <button data-nav-section="Variables" data-nav-level="2" data-nav-activate></button>
        <section data-nav-section="Examples" data-nav-level="1"></section>
      </div>
    `);

    expect(collectSections(root).map((s) => [s.label, s.group, s.activate])).toEqual([
      ['Params', 'Configuration', false],
      ['Auth', 'Configuration', false],
      ['Variables', undefined, true],
      ['Examples', undefined, false]
    ]);
  });

  it('turns a documentation block\'s h1–h6 headings into entries that nest one level deeper per heading level', () => {
    const root = dom(`
      <div>
        <section data-nav-section="Overview" data-nav-level="1"></section>
        <div data-nav-headings data-nav-level="2">
          <h1>Intro</h1>
          <h2>Setup</h2>
          <h3>Deep dive</h3>
          <h2>  </h2>
          <h1>Usage</h1>
        </div>
      </div>
    `);

    expect(collectSections(root).map((s) => [s.label, s.level])).toEqual([
      ['Overview', 1],
      ['Intro', 2],
      ['Setup', 3],
      ['Deep dive', 4],
      ['Usage', 2]
    ]);
  });

  it('returns an empty list when there is no page content to read', () => {
    expect(collectSections(null)).toEqual([]);
  });
});
