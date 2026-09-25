import React, { useEffect, useRef, useState, type ElementType } from 'react';
import { createPortal } from 'react-dom';
import { CopyButton } from '@/ui/CopyButton/CopyButton';

interface CopyTarget {
  host: HTMLElement;
  text: string;
}

interface MarkdownContentProps {
  html: string;
  className?: string;
  testId?: string;
  navHeadings?: boolean;
  navLevel?: number;
  component?: ElementType;
}

const COPY_HOST_CLASS = 'md-code-copy';
const CODE_BLOCK_CLASS = 'md-code-block';

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  html,
  className,
  testId,
  navHeadings,
  navLevel,
  component: Component = 'div'
}) => {
  const rootRef = useRef<HTMLElement>(null);
  const [copyTargets, setCopyTargets] = useState<CopyTarget[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      setCopyTargets([]);
      return;
    }

    const targets = Array.from(root.querySelectorAll('pre')).map((pre) => {
      const text = (pre.querySelector('code') ?? pre).textContent || '';

      let block = pre.parentElement;
      if (!block?.classList.contains(CODE_BLOCK_CLASS)) {
        block = document.createElement('div');
        block.className = CODE_BLOCK_CLASS;
        pre.replaceWith(block);
        block.appendChild(pre);
      }

      let host = block.querySelector<HTMLElement>(`:scope > .${COPY_HOST_CLASS}`);
      if (!host) {
        host = document.createElement('div');
        host.className = COPY_HOST_CLASS;
        block.appendChild(host);
      }

      return { host, text };
    });

    setCopyTargets((previous) => (previous.length === 0 && targets.length === 0 ? previous : targets));
  }, [html]);

  return (
    <>
      <Component
        ref={rootRef}
        className={className}
        data-testid={testId}
        data-nav-headings={navHeadings ? '' : undefined}
        data-nav-level={navLevel}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {copyTargets.map(({ host, text }, index) => createPortal(
        <CopyButton text={text} label="Copy code" testId="markdown-code-copy" />,
        host,
        `md-code-copy-${index}`
      ))}
    </>
  );
};

export default MarkdownContent;
