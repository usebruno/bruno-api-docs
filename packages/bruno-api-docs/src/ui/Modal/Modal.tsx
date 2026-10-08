import React, { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Portal } from '@/ui/Portal/Portal';
import { CloseIcon } from '@/assets/icons';
import cx from '@/utils/cx';
import { StyledWrapper } from './StyledWrapper';

export type ModalSize = 'md' | 'lg';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  ariaLabel?: string;
  className?: string;
  testId?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

export const Modal: React.FC<ModalProps> = ({
  open, onClose, title, children, footer, size = 'lg', ariaLabel, className, testId, initialFocusRef
}) => {
  const focusedRef = useRef(false);

  const attachDialog = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      focusedRef.current = false;
      return;
    }
    if (focusedRef.current) return;
    focusedRef.current = true;
    (initialFocusRef?.current ?? node).focus();
  }, [initialFocusRef]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
      <StyledWrapper
        className={cx('modal-backdrop', className)}
        data-testid={testId ? `${testId}-backdrop` : undefined}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          ref={attachDialog}
          className={`modal-dialog is-${size}`}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          tabIndex={-1}
          data-testid={testId}
        >
          <div className="modal-head">
            {title !== undefined && <div className="modal-title">{title}</div>}
            <button
              type="button"
              className="modal-close"
              aria-label="Close"
              onClick={onClose}
              data-testid={testId ? `${testId}-close` : undefined}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="modal-body">{children}</div>
          {footer !== undefined && <div className="modal-foot">{footer}</div>}
        </div>
      </StyledWrapper>
    </Portal>
  );
};

export default Modal;
