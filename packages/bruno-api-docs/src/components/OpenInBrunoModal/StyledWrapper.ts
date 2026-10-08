import styled from '@emotion/styled';
import { Modal } from '@/ui/Modal/Modal';

export const StyledWrapper = styled(Modal)`
  .oib-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-sans);
    font-size: var(--oc-font-size-md);
    font-weight: 600;
    line-height: 1.25rem;
    color: var(--text-primary);
  }

  .oib-title-glyph {
    display: inline-flex;
    flex: none;
  }

  .oib-title svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .oib-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    font-family: var(--font-sans);
    color: var(--text-primary);
  }

  .oib-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem;
    border: 1px solid color-mix(in srgb, var(--oc-brand) 25%, var(--border-color));
    border-radius: var(--oc-radius);
    background: color-mix(in srgb, var(--oc-brand) 6%, var(--oc-background-base));
  }

  .oib-banner-text {
    margin: 0;
    font-size: var(--oc-font-size-sm);
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .oib-download {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex: none;
    box-sizing: border-box;
    height: 2rem;
    padding: 0 0.875rem;
    font-family: var(--font-sans);
    font-size: var(--oc-font-size-sm);
    font-weight: 600;
    color: var(--oc-background-base);
    background: var(--oc-brand);
    border: 1px solid var(--oc-brand);
    border-radius: var(--oc-radius);
    cursor: pointer;
    transition: opacity 0.12s ease;
  }

  .oib-download:hover {
    opacity: 0.92;
  }

  .oib-download:focus-visible,
  .oib-download-bruno:focus-visible {
    outline: 2px solid var(--oc-brand);
    outline-offset: 2px;
  }

  .oib-steps-section {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .oib-steps-section h3 {
    margin: 0;
  }

  .oib-steps {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .oib-steps li {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    font-size: var(--oc-font-size-sm);
    line-height: 1.25rem;
    color: var(--text-secondary);
  }

  .oib-steps strong {
    font-weight: 600;
    color: var(--text-primary);
  }

  .oib-steps code {
    padding: 0.125rem 0.375rem;
    font-family: var(--font-mono);
    font-size: 0.8125em;
    background: var(--oc-background-surface0);
    border-radius: var(--oc-radius);
  }

  .oib-step-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 1.25rem;
    height: 1.25rem;
    font-size: var(--oc-font-size-xs);
    font-weight: 600;
    color: var(--oc-brand);
    background: color-mix(in srgb, var(--oc-brand) 12%, var(--oc-background-base));
    border-radius: 50%;
  }

  .oib-footer-text {
    font-family: var(--font-sans);
    font-size: var(--oc-font-size-sm);
    color: var(--text-secondary);
  }

  .oib-download-bruno {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    flex: none;
    padding: 0.375rem 0.75rem;
    font-family: var(--font-sans);
    font-size: var(--oc-font-size-sm);
    font-weight: 600;
    text-decoration: none;
    color: var(--text-primary);
    background: var(--oc-background-base);
    border: 1px solid var(--border-color);
    border-radius: var(--oc-radius);
  }

  .oib-download-bruno:hover {
    background: var(--oc-background-surface0);
  }
`;
