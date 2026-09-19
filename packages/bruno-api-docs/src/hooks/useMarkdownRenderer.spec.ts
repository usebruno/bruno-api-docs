import { describe, it, expect } from 'vitest';
import { createMarkdownRenderer } from './useMarkdownRenderer';

const md = createMarkdownRenderer();
const render = (src: string) => md.render(src);
const renderText = (src: string) => md.render(src).replace(/<[^>]*>/g, '');

describe('createMarkdownRenderer', () => {
  describe('headings', () => {
    it('tags each level with its heading class so the stylesheet can size it', () => {
      expect(render('# One')).toContain('heading-1');
      expect(render('## Two')).toContain('heading-2');
      expect(render('### Three')).toContain('heading-3');
      expect(render('#### Four')).toContain('heading-4');
      expect(render('##### Five')).toContain('heading-5');
      expect(render('###### Six')).toContain('heading-6');
    });
  });

  describe('line breaks', () => {
    it('renders a literal <br/> as a line break, not as escaped text', () => {
      const html = render('first line<br/>second line');
      expect(html).toContain('<br>');
      expect(html).not.toContain('&lt;br');
    });

    it('accepts every spelling of the tag', () => {
      for (const tag of ['<br>', '<br/>', '<br />', '<BR/>']) {
        expect(render(`a${tag}b`)).not.toContain('&lt;br');
      }
    });

    it('renders a hard break inside a table cell', () => {
      const html = render('| h |\n| --- |\n| x<br/>y |');
      expect(html).not.toContain('&lt;br');
    });

    it('still renders the CommonMark backslash hard break', () => {
      expect(render('line one\\\nline two')).toContain('<br>');
    });

    it('treats a soft newline as a line break', () => {
      expect(render('line one\nline two')).toContain('<br>');
    });
  });

  describe('task lists', () => {
    it('renders an unchecked item as an empty checkbox, not as [ ] text', () => {
      const html = render('- [ ] todo');
      expect(html).toContain('type="checkbox"');
      expect(html).not.toContain('[ ]');
    });

    it('renders a checked item as a checked checkbox, not as [x] text', () => {
      const html = render('- [x] done');
      expect(html).toContain('checked');
      expect(html).not.toContain('[x]');
    });

    it('normalises [X] and [] the way the Bruno editor does', () => {
      expect(render('- [X] done')).toContain('checked');
      expect(render('- [] todo')).toContain('type="checkbox"');
    });

    it('marks up task items so the stylesheet can drop the bullet', () => {
      const html = render('- [ ] todo');
      expect(html).toContain('contains-task-list');
      expect(html).toContain('task-list-item');
    });

    it('renders checkboxes read-only, since published docs cannot persist a change', () => {
      expect(render('- [ ] todo')).toContain('disabled');
    });

    it('leaves task-list syntax inside a fenced code block untouched', () => {
      const text = renderText(['```md', '- [X] example', '- [xx]   aligned', '```'].join('\n'));
      expect(text).toContain('- [X] example');
      expect(text).toContain('- [xx]   aligned');
      expect(render(['```md', '- [X] example', '```'].join('\n'))).not.toContain('type="checkbox"');
    });

    it('leaves a tilde-fenced block untouched too', () => {
      expect(renderText(['~~~', '- [X] example', '~~~'].join('\n'))).toContain('- [X] example');
    });

    it('preserves spacing after the marker', () => {
      expect(renderText('- [x]   spaced out')).toContain('   spaced out');
    });

    it('does not turn a link labelled x into a checkbox', () => {
      const html = render('- [x](https://example.com)');
      expect(html).not.toContain('type="checkbox"');
      expect(html).toContain('<a href="https://example.com">x</a>');
    });

    it('leaves a plain list item alone', () => {
      const html = render('- plain');
      expect(html).not.toContain('type="checkbox"');
      expect(html).toContain('<li>plain</li>');
    });
  });

  describe('code blocks', () => {
    it('highlights a fence with a known language and keeps the language class', () => {
      const html = render('```js\nconst a = 1;\n```');
      expect(html).toContain('hljs-keyword');
      expect(html).toContain('language-js');
    });

    it('renders an unlabelled fence without throwing', () => {
      expect(() => render('```\nplain text\n```')).not.toThrow();
      expect(render('```\nplain text\n```')).toContain('<pre>');
    });

    it('falls back to auto-detection for an unrecognised language, still escaping the content', () => {
      const html = render('```notalanguage\na < b\n```');
      expect(html).toContain('&lt;');
      expect(html).toContain('language-notalanguage');
    });
  });

  describe('untouched markdown', () => {
    it('renders tables inside the scroll wrapper', () => {
      const html = render('| a | b |\n| --- | --- |\n| 1 | 2 |');
      expect(html).toContain('md-table-scroll');
      expect(html).toContain('<table>');
    });

    it('renders lists, emphasis and blockquotes', () => {
      expect(render('- one\n- two')).toContain('<ul>');
      expect(render('1. one')).toContain('<ol>');
      expect(render('**bold**')).toContain('<strong>');
      expect(render('*italic*')).toContain('<em>');
      expect(render('> quoted')).toContain('<blockquote>');
    });

    it('linkifies bare urls', () => {
      expect(render('see https://usebruno.com')).toContain('<a href="https://usebruno.com">');
    });

    it('leaves technical punctuation alone (typographer stays off)', () => {
      const html = render('(c) -- ... "quoted"');
      expect(html).toContain('(c)');
      expect(html).toContain('--');
      expect(html).toContain('...');
      expect(html).toContain('&quot;quoted&quot;');
      expect(html).not.toContain('\u201c');
    });
  });

  describe('html is not trusted', () => {
    it('escapes script tags', () => {
      const html = render('<script>alert(1)</script>');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('escapes event-handler attributes', () => {
      expect(render('<img src=x onerror="alert(1)">')).not.toContain('<img');
    });

    it('escapes raw html blocks', () => {
      expect(render('<div class="x">hi</div>')).toContain('&lt;div');
    });

    it('refuses to build a javascript: link', () => {
      expect(render('[click](javascript:alert(1))')).not.toContain('<a href');
    });
  });
});
