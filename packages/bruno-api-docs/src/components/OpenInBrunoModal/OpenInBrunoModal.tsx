import React from 'react';
import { BrunoGlyph, DownloadIcon, GoToIcon } from '@/assets/icons';
import { SectionLabel } from '@/components/SectionLabel/SectionLabel';
import { StyledWrapper } from './StyledWrapper';

export const BRUNO_DOWNLOAD_URL = 'https://www.usebruno.com/downloads';

export interface OpenInBrunoModalProps {
  open: boolean;
  onClose: () => void;
  filename: string;
  onDownload: () => void;
  testId?: string;
}

export const OpenInBrunoModal: React.FC<OpenInBrunoModalProps> = ({
  open,
  onClose,
  filename,
  onDownload,
  testId = 'open-in-bruno-modal'
}) => (
  <StyledWrapper
    open={open}
    onClose={onClose}
    size="md"
    ariaLabel="Open in Bruno"
    testId={testId}
    title={(
      <span className="oib-title" data-testid={`${testId}-title`}>
        <span className="oib-title-glyph" data-testid={`${testId}-glyph`}><BrunoGlyph /></span>
        Open in Bruno
      </span>
    )}
    footer={(
      <>
        <span className="oib-footer-text">Don&apos;t have Bruno? It&apos;s a local-first, git-native API client.</span>
        <a
          className="oib-download-bruno"
          href={BRUNO_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`${testId}-download-bruno`}
        >
          <GoToIcon width={14} height={14} />
          Download Bruno
        </a>
      </>
    )}
  >
    <div className="oib-body" data-testid={`${testId}-body`}>
      <div className="oib-banner">
        <p className="oib-banner-text">Download the collection and import it into Bruno Desktop App to work with it locally.</p>
        <button type="button" className="oib-download" onClick={onDownload} data-testid={`${testId}-download`}>
          <DownloadIcon width={16} height={16} />
          Download Collection
        </button>
      </div>

      <div className="oib-steps-section">
        <SectionLabel as="h3" className="section-label-muted" testId={`${testId}-steps-label`}>
          Steps to import
        </SectionLabel>
        <ol className="oib-steps" data-testid={`${testId}-steps`}>
          <li data-testid={`${testId}-step-1`}>
            <span className="oib-step-index">1</span>
            <span>
              Open Bruno and click <strong>+</strong> next to <strong>Collections</strong>.
              Select <strong>Import Collection</strong>.
            </span>
          </li>
          <li data-testid={`${testId}-step-2`}>
            <span className="oib-step-index">2</span>
            <span>Select <code data-testid={`${testId}-filename`}>{filename}</code> and click <strong>Import</strong>.</span>
          </li>
        </ol>
      </div>
    </div>
  </StyledWrapper>
);

export default OpenInBrunoModal;
