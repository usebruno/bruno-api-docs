import { useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import hljs from '@/utils/highlight';

let cachedRenderer: MarkdownIt | null = null;

const HTML_LINE_BREAK = /<br\s*\/?>/iy;
const LESS_THAN = 0x3C;

type InlineRule = Parameters<MarkdownIt['inline']['ruler']['before']>[2];

const hardBreakFromHtmlTag: InlineRule = (state, silent) => {
  if (state.src.charCodeAt(state.pos) !== LESS_THAN) return false;

  HTML_LINE_BREAK.lastIndex = state.pos;
  const match = HTML_LINE_BREAK.exec(state.src);
  if (!match) return false;

  if (!silent) state.push('hardbreak', 'br', 0);
  state.pos += match[0].length;

  return true;
};

const TASK_MARKER_PATTERN = /^\[([\sxX]*?)\](?:\s|(?=[^\s(]))/;

type CoreRule = Parameters<MarkdownIt['core']['ruler']['before']>[2];

const normalizeTaskMarkers: CoreRule = (state) => {
  const { tokens } = state;

  for (let i = 2; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (token.type !== 'inline') continue;
    if (tokens[i - 1].type !== 'paragraph_open') continue;
    if (tokens[i - 2].type !== 'list_item_open') continue;

    const match = TASK_MARKER_PATTERN.exec(token.content);
    if (!match) continue;

    const first = token.children?.[0];
    if (first?.type !== 'text') continue;

    const marker = match[1].trim().toLowerCase() === 'x' ? 'x' : ' ';
    const replacement = `[${marker}] `;

    token.content = replacement + token.content.slice(match[0].length);
    first.content = replacement + first.content.slice(match[0].length);
  }

  return true;
};

const TASK_CONTENT_CLASS = 'task-list-item-content';

const wrapTaskItemContent: CoreRule = (state) => {
  for (const token of state.tokens) {
    if (token.type !== 'inline') continue;

    const children = token.children;
    const checkbox = children?.[0];
    if (!children || checkbox?.type !== 'html_inline') continue;
    if (!checkbox.content.includes('task-list-item-checkbox')) continue;

    const open = new state.Token('html_inline', '', 0);
    open.content = `<span class="${TASK_CONTENT_CLASS}">`;

    const close = new state.Token('html_inline', '', 0);
    close.content = '</span>';

    children.splice(1, 0, open);
    children.push(close);
  }

  return true;
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
    breaks: false,
    highlight: highlightFence
  });

  markdownIt.inline.ruler.before('text', 'html_line_break', hardBreakFromHtmlTag);
  markdownIt.use(taskLists, { enabled: false, label: false, labelAfter: false });

  markdownIt.core.ruler.before('github-task-lists', 'normalize_task_markers', normalizeTaskMarkers);
  markdownIt.core.ruler.after('github-task-lists', 'wrap_task_item_content', wrapTaskItemContent);

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
