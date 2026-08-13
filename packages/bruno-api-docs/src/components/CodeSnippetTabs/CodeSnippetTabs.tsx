import React, { useMemo } from 'react';
import type { HttpRequestBody, HttpRequestBodyVariant, HttpRequestHeader } from '@opencollection/types/requests/http';
import type { Auth } from '@opencollection/types/common/auth';
import { SnippetTabs, type Snippet } from '../SnippetTabs/SnippetTabs';
import {
  generateCurlCommand,
  generateJavaScriptCode,
  generatePythonCode,
  type SnippetHeader,
  type SnippetInput
} from '@/utils/codeSnippets';

interface CodeSnippetTabsProps {
  method: string;
  url: string;
  headers?: HttpRequestHeader[];
  body?: HttpRequestBody | HttpRequestBodyVariant[];
  auth?: Auth;
  variant?: 'inline' | 'embedded';
  className?: string;
  testId?: string;
}

const LANGUAGES = [
  { id: 'curl', label: 'cURL', language: 'bash', generate: generateCurlCommand },
  { id: 'javascript', label: 'Javascript', language: 'javascript', generate: generateJavaScriptCode },
  { id: 'python', label: 'Python', language: 'python', generate: generatePythonCode }
] as const;

export const CodeSnippetTabs: React.FC<CodeSnippetTabsProps> = ({
  method,
  url,
  headers,
  body,
  auth,
  variant = 'inline',
  className,
  testId
}) => {
  const snippetHeaders: SnippetHeader[] = useMemo(
    () =>
      (headers ?? [])
        .filter((header) => header && header.name && header.disabled !== true)
        .map((header) => ({ name: header.name, value: header.value })),
    [headers]
  );

  const snippets: Snippet[] = useMemo(() => {
    const input: SnippetInput = { method, url, headers: snippetHeaders, body, auth };
    return LANGUAGES.map((lang) => ({
      id: lang.id,
      label: lang.label,
      language: lang.language,
      code: lang.generate(input)
    }));
  }, [method, url, snippetHeaders, body, auth]);

  return <SnippetTabs snippets={snippets} variant={variant} className={className} testId={testId} />;
};

export default CodeSnippetTabs;
