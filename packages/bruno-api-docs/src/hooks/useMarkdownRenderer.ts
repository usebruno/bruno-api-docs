import { useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import createDOMPurify, { type Config, type DOMPurify } from 'dompurify';
import hljs from '@/utils/highlight';

let cachedRenderer: MarkdownIt | null = null;

const SANITIZE_CONFIG: Config = {
  FORBID_TAGS: ['style', 'form', 'button', 'textarea', 'select', 'option', 'optgroup', 'datalist'],
  FORBID_ATTR: ['style'],
  ALLOW_DATA_ATTR: false,
  SANITIZE_NAMED_PROPS: true
};

const RENDERER_CLASS = /^(heading-[1-6]|task-list-item|task-list-item-checkbox|task-list-item-content|contains-task-list|md-table-scroll|hljs|hljs-[\w-]+|[a-z]+_{1,2}|language-[\w+#.-]+)$/;

const createSanitizer = (): DOMPurify | null => {
  if (typeof window === 'undefined') return null;

  const purifier = createDOMPurify();
  if (!purifier.isSupported) return null;

  purifier.addHook('uponSanitizeAttribute', (_node, data) => {
    if (data.attrName !== 'class') return;

    const kept = data.attrValue.split(/\s+/).filter((name) => RENDERER_CLASS.test(name));
    data.attrValue = kept.join(' ');
    data.keepAttr = kept.length > 0;
  });

  purifier.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName === 'INPUT' && node.getAttribute('type')?.toLowerCase() !== 'checkbox') {
      node.remove();
    }
  });

  return purifier;
};

const TASK_MARKER_PATTERN = /^\[([\sxX]*?)\]\s?(?=[\s\S])/;

type CoreRule = Parameters<MarkdownIt['core']['ruler']['before']>[2];
// This rule is used to normalize task lists ,it iterates line by line through the tokens and looks for list items
// it remembers code blocks and skips them,so that checkboxes inside code blocks are not affected by this rule.
// it checks the current token and the previous two tokens to see if they match the pattern of a task list item.
// if they do, it replaces the marker with a normalized version and updates the content of the token accordingly.
const normalizeTaskMarkers: CoreRule = (state) => {
  const { tokens } = state;

  for (let i = 2; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (token.type !== 'inline') continue;
    if (tokens[i - 1].type !== 'paragraph_open') continue;
    if (tokens[i - 2].type !== 'list_item_open') continue;

    const match = TASK_MARKER_PATTERN.exec(token.content);
    if (!match) continue;

    const marker = match[1].trim().toLowerCase() === 'x' ? 'x' : ' ';
    const content = `[${marker}] ${token.content.slice(match[0].length)}`;
    if (content === token.content) continue;

    const children: typeof tokens = [];
    state.md.inline.parse(content, state.md, state.env, children);
    if (children[0]?.type !== 'text') continue;

    token.content = content;
    token.children = children;
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

    checkbox.content = checkbox.content.replace('<input ', '<input tabindex="-1" aria-disabled="true" ');

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
  const sanitizer = createSanitizer();

  const markdownIt = new MarkdownIt({
    html: sanitizer !== null,
    linkify: true,
    // Off: smart-typography rewrites punctuation in technical docs — e.g. (c)->©,
    // --->en-dash, ...->ellipsis, straight->curly quotes — which corrupts API copy.
    typographer: false,
    breaks: false,
    highlight: highlightFence
  });

  markdownIt.use(taskLists, { enabled: true, label: false, labelAfter: false });

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

  if (sanitizer) {
    const render = markdownIt.render.bind(markdownIt);
    markdownIt.render = (src, env) => sanitizer.sanitize(render(src, env), SANITIZE_CONFIG);
  }

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
