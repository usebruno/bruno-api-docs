import type { RunRequestResponse } from '@/runner';
import { getContentType } from './response';

// Minimal MIME -> extension map for the common API response types. Falls back to '' (no extension).
const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'application/json': 'json',
  'application/ld+json': 'json',
  'application/xml': 'xml',
  'text/xml': 'xml',
  'text/html': 'html',
  'application/javascript': 'js',
  'text/javascript': 'js',
  'text/css': 'css',
  'text/csv': 'csv',
  'text/plain': 'txt',
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'application/zip': 'zip',
  'application/octet-stream': 'bin'
};

export const getExtensionFromContentType = (contentType: string): string => {
  const mime = (contentType || '').split(';')[0].trim().toLowerCase();
  return CONTENT_TYPE_EXTENSIONS[mime] ?? '';
};

// Content-Disposition: attachment; filename="foo.json"  (also handle filename*=UTF-8''foo.json)
const getFilenameFromContentDisposition = (headers: RunRequestResponse['headers']): string => {
  if (!headers) return '';
  const entry = Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-disposition');
  const value = entry && typeof entry[1] === 'string' ? entry[1] : '';
  if (!value) return '';
  const star = value.match(/filename\*=(?:[\w-]+'')?["']?([^"';]+)["']?/i);
  if (star && star[1]) { try { return decodeURIComponent(star[1]); } catch { return star[1]; } }
  const plain = value.match(/filename=["']?([^"';]+)["']?/i);
  return plain && plain[1] ? plain[1] : '';
};

const getFilenameFromUrl = (url?: string): string => {
  if (!url) return '';
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.substring(pathname.lastIndexOf('/') + 1);
    return base.includes('.') ? base : '';
  } catch { return ''; }
};

export const getResponseFilename = (response: RunRequestResponse): string => {
  const fromDisposition = getFilenameFromContentDisposition(response?.headers);
  if (fromDisposition) return fromDisposition;
  const fromUrl = getFilenameFromUrl(response?.url);
  if (fromUrl) return fromUrl;
  const ext = getExtensionFromContentType(getContentType(response?.headers));
  return ext ? `response.${ext}` : 'response';
};

const base64ToUint8Array = (base64: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

// Browser-only: builds a Blob from the raw response bytes and triggers a download.
export const downloadResponse = (response: RunRequestResponse): void => {
  if (!response?.base64Data) return;
  const contentType = getContentType(response.headers) || 'application/octet-stream';
  const bytes = base64ToUint8Array(response.base64Data);
  const blob = new Blob([bytes], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = getResponseFilename(response);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
