import { useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import hljs from '@/utils/highlight';

let cachedRenderer: MarkdownIt | null = null;

const HTML_LINE_BREAK = /^<br\s*\/?>/i;
const LESS_THAN = 0x3C;

type InlineRule = Parameters<MarkdownIt['inline']['ruler']['before']>[2];

const hardBreakFromHtmlTag: InlineRule = (state, silent) => {
  if (state.src.charCodeAt(state.pos) !== LESS_THAN) return false;

  const match = HTML_LINE_BREAK.exec(state.src.slice(state.pos));
  if (!match) return false;

  if (!silent) state.push('hardbreak', 'br', 0);
  state.pos += match[0].length;

  return true;
};

const TASK_LIST_LINE_PATTERN = /^(\s*[-*+]\s+)\[([ xX]?)\](\s.*)?$/;
const CODE_FENCE_PATTERN = /^ {0,3}(`{3,}|~{3,})/;

const normalizeTaskListMarkdown = (content: string): string => {
  if (!content) return content;

  let openFence = '';

  return content
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => {
      const fence = CODE_FENCE_PATTERN.exec(line);
      if (fence) {
        const marker = fence[1];
        if (!openFence) openFence = marker;
        else if (marker[0] === openFence[0] && marker.length >= openFence.length) openFence = '';
        return line;
      }

      if (openFence) return line;

      const match = line.match(TASK_LIST_LINE_PATTERN);
      if (!match) return line;

      const [, prefix, marker, rest] = match;
      const markerChar = marker.trim().toLowerCase() === 'x' ? 'x' : ' ';

      return `${prefix}[${markerChar}]${rest ?? ' '}`;
    })
    .join('\n');
};

const highlightFence = (str: string, lang: string): string => {
  if (!str.trim()) return '';

  try {
    const language = lang && hljs.getLanguage(lang) ? lang : '';
    const result = language
      ? hljs.highlight(str, { language, ignoreIllegals: true })
      : hljs.highlightAuto(str);

    return result.value;
  } catch {
    return '';
  }
};

export const createMarkdownRenderer = (): MarkdownIt => {
  const markdownIt = new MarkdownIt({
    // Off: docs come from (untrusted) collection content and are injected via
    // dangerouslySetInnerHTML. Disabling raw HTML blocks script/event-handler
    // injection at the source; markdown-it still blocks javascript:/data: links
    // via its default link validation, so no separate sanitiser is needed.
    html: false,
    linkify: true,
    // Off: smart-typography rewrites punctuation in technical docs — e.g. (c)->©,
    // --->en-dash, ...->ellipsis, straight->curly quotes — which corrupts API copy.
    typographer: false,
    breaks: true,
    highlight: highlightFence
  });

  markdownIt.inline.ruler.before('text', 'html_line_break', hardBreakFromHtmlTag);
  markdownIt.use(taskLists, { enabled: false, label: false, labelAfter: false });

  const render = markdownIt.render.bind(markdownIt);
  markdownIt.render = (src, env) => render(normalizeTaskListMarkdown(src), env);

  const defaultRender
    = markdownIt.renderer.rules.heading_open
      || function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      };
  markdownIt.renderer.rules.heading_open = function (
    tokens,
    idx,
    options,
    env,
    self
  ) {
    const token = tokens[idx];
    const level = token.tag.substr(1);

    token.attrJoin('class', `heading-${level}`);

    return defaultRender(tokens, idx, options, env, self);
  };

  markdownIt.renderer.rules.table_open = () => '<div class="md-table-scroll"><table>';
  markdownIt.renderer.rules.table_close = () => '</table></div>';

  return markdownIt;
};

export const useMarkdownRenderer = () => {
  const renderer = useMemo(() => {
    if (!cachedRenderer) {
      cachedRenderer = createMarkdownRenderer();
    }

    return cachedRenderer;
  }, []);

  return renderer;
};
