interface Header {
  name: string;
  value: string;
  disabled?: boolean;
}

export interface CodeSnippetInput {
  method: string;
  url: string;
  headers?: Header[];
  // Generators only emit a body when type is 'json'
  body?: { type?: string; data?: unknown } | null;
}

export const generateCurlCommand = ({ method, url, headers = [], body }: CodeSnippetInput): string => {
  const headersString = headers
    .filter((h) => h.disabled !== true)
    .map((h) => `-H "${h.name}: ${h.value}"`)
    .join(' \\\n  ');

  let bodyData = '';
  if (body?.type === 'json' && body.data) {
    const data = typeof body.data === 'string' ? body.data.trim() : JSON.stringify(body.data);
    bodyData = ` \\\n  -d '${data}'`;
  }

  return `curl -X ${method} "${url}"${headersString ? ` \\\n  ${headersString}` : ''}${bodyData}`;
};

export const generateJavaScriptCode = ({ method, url, headers = [], body }: CodeSnippetInput): string => {
  const enabledHeaders = headers.filter((h) => h.disabled !== true);
  const headersString = enabledHeaders.map((h) => `    "${h.name}": "${h.value}"`).join(',\n');
  const bodyString = body?.type === 'json' && body.data
    ? `,\n  body: JSON.stringify(${typeof body.data === 'string' ? body.data.trim() : JSON.stringify(body.data)})`
    : '';

  return `const response = await fetch("${url}", {
  method: "${method}",
  headers: {
${headersString}
  }${bodyString}
});

const data = await response.json();`;
};

export const generatePythonCode = ({ method, url, headers = [], body }: CodeSnippetInput): string => {
  const enabledHeaders = headers.filter((h) => h.disabled !== true);
  const headersString = enabledHeaders.map((h) => `        "${h.name}": "${h.value}"`).join(',\n');
  const bodyString = body?.type === 'json' && body.data
    ? `,\n    json=${typeof body.data === 'string' ? body.data.trim() : JSON.stringify(body.data)}`
    : '';

  return `import requests

response = requests.${method.toLowerCase()}(
    "${url}",
    headers={
${headersString}
    }${bodyString}
)

data = response.json()`;
};
