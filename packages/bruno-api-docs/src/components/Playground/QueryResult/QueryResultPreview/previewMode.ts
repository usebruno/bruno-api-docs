import { ResponseBodyFormat } from 'src/utils/response';
import { ResponseBodyPreview } from 'src/utils/responsePreview';

export function formatToPreviewMode(format: ResponseBodyFormat, contentType?: string): ResponseBodyPreview {
  if (format === 'html') return 'preview-web';
  if (format === 'json') return 'preview-json';
  if (format === 'xml') return 'preview-xml';
  if (format === 'raw') return 'preview-text';
  if (format === 'javascript') return 'preview-web';

  if (format === 'base64' || format === 'hex') {
    if (contentType) {
      if (contentType.includes('image')) return 'preview-image';
      if (contentType.includes('pdf')) return 'preview-pdf';
      if (contentType.includes('audio')) return 'preview-audio';
      if (contentType.includes('video')) return 'preview-video';
    }
    return 'preview-text';
  }

  return 'preview-text';
}
